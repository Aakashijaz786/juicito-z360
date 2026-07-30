import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/menu/:id — update item
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.price !== undefined) patch.price = Number(body.price);
    if (body.category !== undefined) patch.category = String(body.category);
    if (body.available !== undefined) patch.available = Boolean(body.available);
    if (body.description !== undefined)
      patch.description = String(body.description);
    if (body.tags !== undefined) {
      patch.tags = Array.isArray(body.tags)
        ? body.tags
        : String(body.tags)
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("menu")
      .update(patch)
      .eq("id", params.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, item: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/menu/:id — delete item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("menu")
      .delete()
      .eq("id", params.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
