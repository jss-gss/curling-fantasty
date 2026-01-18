export const achievementIcons = {
  FOUND_THE_BUTTON: "/icons/found_button.png",
} as const;

export type AchievementId = keyof typeof achievementIcons;

