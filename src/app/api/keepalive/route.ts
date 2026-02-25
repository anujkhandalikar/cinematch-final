import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
    const supabase = await createClient()

    const { error } = await supabase
        .from("movies")
        .select("id")
        .limit(1)

    if (error) {
        console.error("[keepalive] Supabase ping failed:", error.message)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    console.log("[keepalive] Supabase ping ok:", new Date().toISOString())
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
