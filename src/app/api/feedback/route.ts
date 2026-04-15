// ===================================
// POST /api/feedback
// ユーザーからの改善要望・フィードバックをSupabaseに保存
// ===================================

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anonymous_id, municipality_id, message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("feedback").insert({
      anonymous_id: anonymous_id ?? null,
      municipality_id: municipality_id ?? null,
      message: message.trim(),
    });

    if (error) {
      console.error("[feedback] Supabase insert error:", error.message);
      return NextResponse.json({ error: "db error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feedback] unexpected error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
