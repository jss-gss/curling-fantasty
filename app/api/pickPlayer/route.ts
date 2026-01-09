import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function POST(req: NextRequest) {
  const { eventId, playerId, userId } = await req.json()

  // 1. Check if player is already drafted
  const { data: existingPick } = await supabase
    .from("fantasy_picks")
    .select("id")
    .eq("fantasy_event_id", eventId)
    .eq("player_id", playerId)
    .maybeSingle()

  if (existingPick) {
    return NextResponse.json(
      { error: "Player already drafted" },
      { status: 400 }
    )
  }

  // 2. Load event
  const { data: event } = await supabase
    .from("fantasy_events")
    .select("id, current_pick")
    .eq("id", eventId)
    .single()

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  // 3. Load users in draft order
  const { data: users } = await supabase
    .from("fantasy_event_users")
    .select("user_id, draft_position")
    .eq("fantasy_event_id", eventId)
    .order("draft_position")

  const safeUsers = users ?? []
  const currentIndex = (event.current_pick ?? 1) - 1
  const currentUser = safeUsers[currentIndex]

  // 4. Check if it's the user's turn
  if (!currentUser || currentUser.user_id !== userId) {
    return NextResponse.json(
      { error: "Not your turn" },
      { status: 400 }
    )
  }

  // 5. Insert the pick
  await supabase.from("fantasy_picks").insert({
    fantasy_event_id: eventId,
    user_id: userId,
    player_id: playerId,
  })

  // 6. Advance to next pick
  const nextPick =
    event.current_pick >= safeUsers.length ? 1 : event.current_pick + 1

  await supabase
    .from("fantasy_events")
    .update({ current_pick: nextPick })
    .eq("id", eventId)

  return NextResponse.json({ ok: true })
}
