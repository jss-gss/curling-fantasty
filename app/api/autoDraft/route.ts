import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
console.log("autoDraft hit", new Date().toISOString())
console.log("SUPABASE_URL?", !!process.env.SUPABASE_URL)
console.log("SRK?", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { eventId } = await req.json()

  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 })
  }
  
  const { data, error } = await supabase.rpc("autodraft_if_expired", {
    p_event_id: eventId,
    p_turn_seconds: 30,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data?.ok) {
    return NextResponse.json({ error: data?.error ?? "Auto draft failed" }, { status: 400 })
  }

  return NextResponse.json(data)
}
