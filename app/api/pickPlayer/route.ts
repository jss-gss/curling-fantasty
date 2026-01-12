import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function POST(req: NextRequest) {
  const { eventId, playerId, userId } = await req.json()

  if (!eventId || !playerId || !userId) {
    return NextResponse.json(
      { error: "Missing eventId, playerId, or userId" },
      { status: 400 }
    )
  }

  //
  // 1. Load fantasy event
  //
  const { data: fantasyEvent, error: eventErr } = await supabase
    .from("fantasy_events")
    .select("id, current_pick, curling_event_id, draft_status")
    .eq("id", eventId)
    .single()

  if (eventErr || !fantasyEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  // Enforce draft is active
  if (fantasyEvent.draft_status !== "closed") {
    return NextResponse.json(
      { error: "Draft is not currently active" },
      { status: 400 }
    )
  }

  //
  // 2. Load player and their team_id
  //
  const { data: playerRow, error: playerErr } = await supabase
    .from("players")
    .select("id, first_name, last_name, position, team_id")
    .eq("id", playerId)
    .single()

  if (playerErr || !playerRow) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 })
  }

  if (!playerRow.team_id) {
    return NextResponse.json(
      { error: "Player is not assigned to a team" },
      { status: 400 }
    )
  }

  //
  // 3. Load team and validate curling_event_id matches the fantasy event
  //
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .select("id, curling_event_id")
    .eq("id", playerRow.team_id)
    .single()

  if (teamErr || !teamRow) {
    return NextResponse.json(
      { error: "Team not found for this player" },
      { status: 400 }
    )
  }

  if (teamRow.curling_event_id !== fantasyEvent.curling_event_id) {
    return NextResponse.json(
      { error: "Player is not part of this curling event" },
      { status: 400 }
    )
  }

  //
  // 4. Check if this player is already drafted in this fantasy event
  //
  const { data: existingPick, error: existingErr } = await supabase
    .from("fantasy_picks")
    .select("id")
    .eq("fantasy_event_id", eventId)
    .eq("player_id", playerId)
    .maybeSingle()

  if (existingErr) {
    return NextResponse.json(
      { error: existingErr.message },
      { status: 400 }
    )
  }

  if (existingPick) {
    return NextResponse.json(
      { error: "Player already drafted" },
      { status: 400 }
    )
  }

  //
  // 5. Load users in draft order and validate turn
  //
  const { data: users, error: usersErr } = await supabase
    .from("fantasy_event_users")
    .select("user_id, draft_position")
    .eq("fantasy_event_id", eventId)
    .order("draft_position")

  if (usersErr) {
    return NextResponse.json(
      { error: usersErr.message },
      { status: 400 }
    )
  }

  const safeUsers = users ?? []
  if (!safeUsers.length) {
    return NextResponse.json(
      { error: "No users in this fantasy event" },
      { status: 400 }
    )
  }

  const currentIndex = (fantasyEvent.current_pick ?? 1) - 1
  const currentUser = safeUsers[currentIndex]

  if (!currentUser || currentUser.user_id !== userId) {
    return NextResponse.json(
      { error: "Not your turn" },
      { status: 400 }
    )
  }

  //
  // 6. Count THIS user's existing picks (max 4)
  //
  const { data: userPicks, error: userPicksErr } = await supabase
    .from("fantasy_picks")
    .select("id")
    .eq("fantasy_event_id", eventId)
    .eq("user_id", userId)

  if (userPicksErr) {
    return NextResponse.json(
      { error: userPicksErr.message },
      { status: 400 }
    )
  }

  const pickCount = userPicks?.length ?? 0

  if (pickCount >= 4) {
    return NextResponse.json(
      { error: "You already drafted 4 players" },
      { status: 400 }
    )
  }

  //
  // 7. Insert pick
  //
  const { error: insertError } = await supabase
    .from("fantasy_picks")
    .insert({
      fantasy_event_id: eventId,
      user_id: userId,
      player_id: playerId,
    })

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 400 }
    )
  }

  const userJustFinished = pickCount + 1 >= 4

  //
  // 8. Check if EVERY user is done (global draft end)
  //
  const { data: allUserPicks, error: allUserPicksErr } = await supabase
    .from("fantasy_picks")
    .select("user_id")
    .eq("fantasy_event_id", eventId)

  if (allUserPicksErr) {
    return NextResponse.json(
      { error: allUserPicksErr.message },
      { status: 400 }
    )
  }

  const pickMap = new Map<string, number>()
  allUserPicks?.forEach((p: { user_id: string }) => {
    pickMap.set(p.user_id, (pickMap.get(p.user_id) ?? 0) + 1)
  })

  const everyoneDone = safeUsers.every(
    (u) => (pickMap.get(u.user_id) ?? 0) >= 4
  )

  if (everyoneDone) {
    const { error: lockErr } = await supabase
      .from("fantasy_events")
      .update({
        draft_status: "locked",
        current_pick: null,
      })
      .eq("id", eventId)

    if (lockErr) {
      return NextResponse.json(
        { error: lockErr.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, draftFinished: true })
  }

  //
  // 9. Advance draft pick — skip users who already have 4 picks
  //
  let nextPickIndex: number | null = currentIndex

  // We know at least one user still needs picks (everyoneDone === false),
  // so this loop will always find someone.
  while (true) {
    nextPickIndex = (nextPickIndex + 1) % safeUsers.length
    const nextUser = safeUsers[nextPickIndex]

    const { data: nextUserPicks, error: nextUserPicksErr } = await supabase
      .from("fantasy_picks")
      .select("id")
      .eq("fantasy_event_id", eventId)
      .eq("user_id", nextUser.user_id)

    if (nextUserPicksErr) {
      return NextResponse.json(
        { error: nextUserPicksErr.message },
        { status: 400 }
      )
    }

    const nextUserPickCount = nextUserPicks?.length ?? 0

    if (nextUserPickCount < 4) {
      break
    }
    // No need for loop‑around detection here, because everyoneDone === false
    // guarantees at least one user has < 4 picks.
  }

  const { error: updateEventErr } = await supabase
    .from("fantasy_events")
    .update({ current_pick: nextPickIndex + 1 })
    .eq("id", eventId)

  if (updateEventErr) {
    return NextResponse.json(
      { error: updateEventErr.message },
      { status: 400 }
    )
  }

  //
  // 10. Response flags for the frontend
  //
  if (userJustFinished) {
    // This user finished their 4 picks, but draft continues for others
    return NextResponse.json({ ok: true, userFinished: true })
  }

  return NextResponse.json({ ok: true, draftFinished: false })
}
