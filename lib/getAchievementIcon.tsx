import { achievementIcons, AchievementId } from "@/lib/achievementIcons"

export function getAchievementIcon(id: AchievementId): string | null {
  return achievementIcons[id] ?? null
}
