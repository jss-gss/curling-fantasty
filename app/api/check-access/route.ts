import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { slug, userId } = await req.json()

  if (!slug || !userId) {
    return NextResponse.json({ allowed: false })
  }

  const { data: league } = await supabase
    .from("fantasy_events")
    .select(
      `
      id,
      slug,
      created_by,
      fantasy_event_users ( user_id )
    `
    )
    .eq("slug", slug)
    .single()

  if (!league) {
    return NextResponse.json({ allowed: false })
  }

  const isEnrolled = league.fantasy_event_users.some(
    (u: { user_id: string }) => u.user_id === userId
  )

  return NextResponse.json({ allowed: isEnrolled })
}
