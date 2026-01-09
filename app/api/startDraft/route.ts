import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function POST(req: NextRequest) {
  const { eventId } = await req.json()

  const { data: users } = await supabase
    .from("fantasy_event_users")
    .select("id")
    .eq("fantasy_event_id", eventId)

  const safeUsers = users ?? []

  const shuffled = safeUsers
    .map(u => ({ ...u, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)

  for (let i = 0; i < shuffled.length; i++) {
    await supabase
      .from("fantasy_event_users")
      .update({ draft_position: i + 1 })
      .eq("id", shuffled[i].id)
  }

  await supabase
    .from("fantasy_events")
    .update({ current_pick: 1 })
    .eq("id", eventId)

  return NextResponse.json({ ok: true })
}
