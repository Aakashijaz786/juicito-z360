import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/menu — list all menu items
export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.from("menu").select("*").order("category");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/menu — create item (auto-generates id if missing)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = {
      id: body.id || "item_" + crypto.randomUUID().replace(/-/g, "").slice(0, 6),
      name: String(body.name ?? "").trim(),
      price: Number(body.price ?? 0),
      category: String(body.category ?? "General"),
      available: body.available !== false,
      description: String(body.description ?? ""),
      tags: Array.isArray(body.tags)
        ? body.tags
        : String(body.tags ?? "")
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean),
    };

    if (!item.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb.from("menu").insert(item).select("*").single();
    if (error) throw error;
    return NextResponse.json({ success: true, item: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
