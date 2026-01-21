import { supabase } from "@/lib/supabaseClient"
import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { eventId } = JSON.parse(req.body)

  const { error } = await supabase.rpc("auto_pick_for_event", {
    event_id: eventId
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}
