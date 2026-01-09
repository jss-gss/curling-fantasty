import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function POST(req: NextRequest) {
  const { eventId, playerId, userId } = await req.json()

  // 1. Ensure player belongs to the same curling event as the fantasy event
  const { data: fantasyEvent } = await supabase
    .from("fantasy_events")
    .select("id, current_pick, curling_event_id")
    .eq("id", eventId)
    .single()

  if (!fantasyEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  const { data: playerAssignment } = await supabase
    .from("player_event_teams")
    .select("id")
    .eq("player_id", playerId)
    .eq("curling_event_id", fantasyEvent.curling_event_id)
    .maybeSingle()

  if (!playerAssignment) {
    return NextResponse.json(
      { error: "Player is not part of this curling event" },
      { status: 400 }
    )
  }

  // 2. Check if player already drafted
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

  // 3. Get users in draft order
  const { data: users } = await supabase
    .from("fantasy_event_users")
    .select("user_id, draft_position")
    .eq("fantasy_event_id", eventId)
    .order("draft_position")

  const safeUsers = users ?? []
  const currentIndex = (fantasyEvent.current_pick ?? 1) - 1
  const currentUser = safeUsers[currentIndex]

  if (!currentUser || currentUser.user_id !== userId) {
    return NextResponse.json(
      { error: "Not your turn" },
      { status: 400 }
    )
  }

  // 4. Count user's existing picks
  const { data: userPicks } = await supabase
    .from("fantasy_picks")
    .select("position_id")
    .eq("fantasy_event_id", eventId)
    .eq("user_id", userId)

  const pickCount = userPicks?.length ?? 0

  if (pickCount >= 4) {
    return NextResponse.json(
      { error: "You already have all 4 positions filled" },
      { status: 400 }
    )
  }

  const nextPositionId = pickCount + 1

  // 5. Insert pick
  const { error: insertError } = await supabase
    .from("fantasy_picks")
    .insert({
      fantasy_event_id: eventId,
      user_id: userId,
      player_id: playerId,
      position_id: nextPositionId,
    })

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 400 }
    )
  }

  // 6. Advance draft pick
  const nextPick =
    fantasyEvent.current_pick >= safeUsers.length
      ? 1
      : fantasyEvent.current_pick + 1

  await supabase
    .from("fantasy_events")
    .update({ current_pick: nextPick })
    .eq("id", eventId)

  // 7. Check if draft is finished
  const { data: allPicks } = await supabase
    .from("fantasy_picks")
    .select("id")
    .eq("fantasy_event_id", eventId)

  const totalPicks = allPicks?.length ?? 0
  const totalRequiredPicks = safeUsers.length * 4

  if (totalPicks >= totalRequiredPicks) {
    await supabase
      .from("fantasy_events")
      .update({
        status: "closed",
        current_pick: null 
      })
      .eq("id", eventId)

    return NextResponse.json({ ok: true, draftFinished: true })
  }

  return NextResponse.json({ ok: true, draftFinished: false })
}
