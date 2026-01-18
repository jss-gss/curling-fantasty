import { NextResponse } from "next/server";
import { awardAchievement } from "@/lib/achievements";

export async function POST(req: Request) {
  const { userId, achievement } = await req.json();
  const earned = await awardAchievement(userId, achievement);
  return NextResponse.json({ earned });
}
