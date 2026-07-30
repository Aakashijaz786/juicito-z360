// Builds a compact, well-aligned delivery-receipt PDF for a dispatched order.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Order } from "./types";

const ORANGE = rgb(0.91, 0.53, 0.23);
const DARK = rgb(0.1, 0.1, 0.12);
const GREY = rgb(0.45, 0.45, 0.5);
const LINE = rgb(0.85, 0.85, 0.88);

function customerLabel(order: Order): { name: string; contact: string } {
  // Prefer the name/phone collected in chat; fall back to the channel id.
  if (order.customer_name || order.customer_phone) {
    return {
      name: order.customer_name || "Customer",
      contact: order.customer_phone || "—",
    };
  }
  const userId = order.user_id;
  if (userId.startsWith("whatsapp:")) {
    return { name: "WhatsApp customer", contact: userId.replace("whatsapp:", "").trim() };
  }
  if (userId.startsWith("web:")) {
    return { name: "Web customer", contact: userId.slice(4, 12).toUpperCase() };
  }
  return { name: "Customer", contact: userId };
}

function wrap(text: string, max: number): string[] {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function buildReceiptPdf(order: Order): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 320;
  const margin = 22;
  const addr = wrap(order.address, 42);
  // Height scales with number of items + address lines.
  const H = 250 + order.items.length * 16 + addr.length * 12;
  const page = doc.addPage([W, H]);
  const cust = customerLabel(order);

  // Header band
  page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: ORANGE });
  page.drawText("Juicito", { x: margin, y: H - 34, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Delivery Receipt", {
    x: margin,
    y: H - 52,
    size: 10,
    font,
    color: rgb(1, 1, 1),
  });

  let y = H - 88;
  const label = (k: string, v: string) => {
    page.drawText(k, { x: margin, y, size: 8, font, color: GREY });
    page.drawText(v, { x: margin + 66, y, size: 9, font: bold, color: DARK });
    y -= 15;
  };

  label("ORDER", `#${order.id}`);
  label("DATE", new Date(order.created_at).toLocaleString());
  label("CUSTOMER", cust.name);
  label("CONTACT", cust.contact);

  // Address (multi-line)
  page.drawText("ADDRESS", { x: margin, y, size: 8, font, color: GREY });
  addr.forEach((ln, i) => {
    page.drawText(ln, {
      x: margin + 66,
      y: y - i * 12,
      size: 9,
      font: bold,
      color: DARK,
    });
  });
  y -= addr.length * 12 + 8;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 1, color: LINE });
  y -= 18;

  // Items header
  page.drawText("ITEM", { x: margin, y, size: 8, font: bold, color: GREY });
  page.drawText("AMOUNT", { x: W - margin - 52, y, size: 8, font: bold, color: GREY });
  y -= 16;

  for (const it of order.items) {
    const name = `${it.quantity}x ${it.name}`;
    const line = name.length > 34 ? name.slice(0, 33) + "…" : name;
    page.drawText(line, { x: margin, y, size: 9, font, color: DARK });
    const amt = `Rs. ${Math.round(it.line_total_cents / 100)}`;
    const amtW = font.widthOfTextAtSize(amt, 9);
    page.drawText(amt, { x: W - margin - amtW, y, size: 9, font, color: DARK });
    if (it.notes) {
      y -= 11;
      page.drawText(`   note: ${it.notes}`, { x: margin, y, size: 7, font, color: GREY });
    }
    y -= 16;
  }

  // Divider + total
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 1, color: LINE });
  y -= 20;
  page.drawText("TOTAL", { x: margin, y, size: 11, font: bold, color: DARK });
  const total = order.total_formatted;
  const totalW = bold.widthOfTextAtSize(total, 12);
  page.drawText(total, { x: W - margin - totalW, y, size: 12, font: bold, color: ORANGE });
  y -= 20;

  page.drawText(
    order.payment_screenshot ? "Payment: PAID (screenshot on file)" : "Payment: on delivery",
    { x: margin, y, size: 8, font, color: GREY }
  );
  y -= 22;

  // Footer
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: LINE });
  y -= 14;
  page.drawText("Thank you for ordering with Juicito!", {
    x: margin,
    y,
    size: 8,
    font: bold,
    color: DARK,
  });
  y -= 12;
  page.drawText("EasyPaisa/JazzCash 0300 5413902 (Aakash Ijaz)", {
    x: margin,
    y,
    size: 7,
    font,
    color: GREY,
  });

  return doc.save();
}
