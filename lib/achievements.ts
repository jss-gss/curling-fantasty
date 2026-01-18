import { supabase } from "@/lib/supabaseClient"

export async function awardAchievement(userId: string, code: string) {
  const { data: achievement } = await supabase
    .from("achievements")
    .select("id")
    .eq("code", code)
    .single()

  if (!achievement) return false

  const { data, error } = await supabase
    .from("user_achievements")
    .upsert(
      {
        user_id: userId,
        achievement_id: achievement.id,
      },
      {
        onConflict: "user_id,achievement_id",
        ignoreDuplicates: true,
      }
    )
    .select()

  return data && data.length > 0
}
