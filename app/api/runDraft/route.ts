import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import runDraft from "@/lib/runDraft"

export async function POST(req: NextRequest) {
  const { eventId } = await req.json()
  const picks = await runDraft(eventId)
  return NextResponse.json({ picks })
}
