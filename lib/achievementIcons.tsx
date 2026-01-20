export const achievementIcons = {
  FOUND_THE_BUTTON: "/icons/found-the-button.png",
  FOUR_FOOT_FINISHER:"/icons/four-foot-finisher.png",
  HOMAN_WARRIOR: "/icons/homan-warrior.png",
  TWELVE_FOOT_FINISHER: "/icons/twelve-foot-finisher.png",
  PROFESSIONAL_CURLER: "/icons/professional-curler.png",
  EIGHT_FOOT_FINISHER: "/icons/eight-foot-finisher.png",
  STONE_COLD_KNOW_IT_ALL: "/icons/know-it-all.png",
  SECOND_EVENT_WINNER: "/icons/second-event-winner.png",
  HOGGED_OUT: "/icons/hogged-out.png",
  CLEAN_SWEEP: "/icons/clean-sweep.png",
  FIRST_EVENT_WINNER: "/icons/first-event-winner.png",
  WOODEN_BROOM: "/icons/wooden-broom.png",
  DRAW_MASTER: "/icons/draw-master.png"
} as const;

export type AchievementId = keyof typeof achievementIcons;

