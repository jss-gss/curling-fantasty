import Image from "next/image"
import { achievementIcons, AchievementId } from "@/lib/achievementIcons"

export function getAchievementIcon(id: AchievementId) {
  const src = achievementIcons[id]

  return (
    <Image
      src={src}
      alt={id}
      width={160}
      height={160}
    />
  )
}
