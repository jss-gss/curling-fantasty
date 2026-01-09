import { supabase } from "@/lib/supabaseClient"
import { NextResponse } from "next/server"

export async function GET() {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("games")
    .select(`
      id,
      game_datetime,
      team1:team1_id(team_name),
      team2:team2_id(team_name)
    `)
    .gte("game_datetime", now)
    .order("game_datetime", { ascending: true })
    .limit(10)

  if (error) return NextResponse.json([])

  return NextResponse.json(data)
}
