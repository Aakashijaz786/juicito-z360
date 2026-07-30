import { NextRequest, NextResponse } from "next/server";
import { uploadPaymentScreenshot } from "@/lib/storage";
import {
  findLatestOrderByStatus,
  attachPaymentScreenshot,
  appendMessage,
} from "@/lib/data";
import { imageMessage } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUCCESS_REPLY =
  "We received your payment screenshot! 🙏 Our team will verify it shortly and start preparing your order.";
const NO_ORDER_REPLY =
  "We received your image, but couldn't find a pending order for you. Please place an order first.";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const userId = String(form.get("user_id") ?? "").trim();
    const file = form.get("file");

    if (!userId) {
      return NextResponse.json({ error: "user_id is required." }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    const contentType = file.type || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are accepted." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const screenshotUrl = await uploadPaymentScreenshot(userId, bytes, contentType);

    const pending = await findLatestOrderByStatus(userId, "pending_payment");

    // Record in chat history either way (as an image so it re-renders on restore).
    await appendMessage(userId, "user", imageMessage(screenshotUrl));

    if (!pending) {
      await appendMessage(userId, "assistant", NO_ORDER_REPLY);
      return NextResponse.json({
        success: false,
        reply: NO_ORDER_REPLY,
        screenshot_url: screenshotUrl,
      });
    }

    const updated = await attachPaymentScreenshot(pending.id, screenshotUrl);
    await appendMessage(userId, "assistant", SUCCESS_REPLY);

    return NextResponse.json({
      success: true,
      reply: SUCCESS_REPLY,
      screenshot_url: screenshotUrl,
      order_id: pending.id,
      status: updated?.status ?? "new",
    });
  } catch (err) {
    console.error("[/api/payment] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
