import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function POST(req: NextRequest) {
  const { eventId } = await req.json()

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 })
  }

  // 1. Load all users in this fantasy event
  const { data: users, error: userErr } = await supabase
    .from("fantasy_event_users")
    .select("id")
    .eq("fantasy_event_id", eventId)

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 })
  }

  const safeUsers = users ?? []

  if (safeUsers.length === 0) {
    return NextResponse.json({ error: "No users in this event" }, { status: 400 })
  }

  // 2. Shuffle users to assign draft positions
  const shuffled = safeUsers
    .map(u => ({ ...u, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)

  // 3. Assign draft positions
  for (let i = 0; i < shuffled.length; i++) {
    await supabase
      .from("fantasy_event_users")
      .update({ draft_position: i + 1 })
      .eq("id", shuffled[i].id)
  }

  // 4. Reset current pick to 1
  await supabase
    .from("fantasy_events")
    .update({ current_pick: 1 })
    .eq("id", eventId)

  return NextResponse.json({ ok: true })
}
