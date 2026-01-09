import { supabase } from "@/lib/supabaseClient"

export default async function runDraft(eventId: string) {
  // Load users in draft order
  const { data: users } = await supabase
    .from("fantasy_event_users")
    .select("user_id, draft_position")
    .eq("fantasy_event_id", eventId)
    .order("draft_position")

  const safeUsers = users ?? []

  // Load players for this event
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("curling_event_id", eventId)

  const safePlayers = players ?? []

  // Group players by position
  const grouped = {
    skip: safePlayers.filter((p) => p.position_id === 4),
    third: safePlayers.filter((p) => p.position_id === 3),
    second: safePlayers.filter((p) => p.position_id === 2),
    lead: safePlayers.filter((p) => p.position_id === 1),
  }

  // Snake draft helper
  function snake(
    users: { user_id: string; draft_position: number }[],
    players: any[],
    forward: boolean
  ) {
    const order = forward ? users : [...users].reverse()
    return order.map((u, i) => ({
      user_id: u.user_id,
      player_id: players[i]?.id, // safe access
    }))
  }

  // Run 4 rounds
  const round1 = snake(safeUsers, grouped.skip, true)
  const round2 = snake(safeUsers, grouped.third, false)
  const round3 = snake(safeUsers, grouped.second, true)
  const round4 = snake(safeUsers, grouped.lead, false)

  // Build final pick list
  const picks = [
    ...round1.map((p) => ({ ...p, round: 1, position_id: 4 })),
    ...round2.map((p) => ({ ...p, round: 2, position_id: 3 })),
    ...round3.map((p) => ({ ...p, round: 3, position_id: 2 })),
    ...round4.map((p) => ({ ...p, round: 4, position_id: 1 })),
  ]

  // Insert into DB
  await supabase.from("fantasy_picks").insert(
    picks.map((p) => ({
      ...p,
      fantasy_event_id: eventId,
    }))
  )

  return picks
}
