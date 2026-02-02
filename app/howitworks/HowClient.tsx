"use client"

import Image from "next/image"
import { useId, useMemo, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

type SectionKey =
  | "getting-started"
  | "platform"
  | "drafting"
  | "scoring"
  | "beforedrafting"
  | "designedscoring"

const SECTION_KEYS: SectionKey[] = [
  "getting-started",
  "platform",
  "beforedrafting",
  "drafting",
  "scoring",
  "designedscoring",
]

function isSectionKey(v: string | null): v is SectionKey {
  return !!v && SECTION_KEYS.includes(v as SectionKey)
}

function SectionAccordion({
  sectionKey,
  title,
  subtitle,
  openKey,
  setOpenKey,
  children,
}: {
  sectionKey: SectionKey
  title: string
  subtitle?: string
  openKey: SectionKey | null
  setOpenKey: (k: SectionKey | null) => void
  children: React.ReactNode
}) {
  const panelId = useId()
  const isOpen = openKey === sectionKey

  return (
    <div
      id={sectionKey}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
    >
      <button
        type="button"
        className="w-full flex items-start justify-between gap-4 p-4 sm:p-6 text-left"
        onClick={() => setOpenKey(isOpen ? null : sectionKey)}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <div className="min-w-0">
          <div className="text-lg sm:text-xl font-bold text-[#1f4785]">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm sm:text-[15px] text-gray-600">{subtitle}</div>
          ) : null}
        </div>

        <span
          className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold "
          aria-hidden="true"
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div id={panelId} className="px-4 sm:px-6 pb-5 sm:pb-7">
          {children}
        </div>
      )}
    </div>
  )
}

export default function HowItWorksPage() {
  const searchParams = useSearchParams()
  const [openKey, setOpenKey] = useState<SectionKey | null>(null)

  useEffect(() => {
    const section = searchParams.get("section")
    if (!isSectionKey(section)) return

    setOpenKey(section)

    requestAnimationFrame(() => {
      const el = document.getElementById(section)
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [searchParams])

  const scoringCards = useMemo(
    () => [
      {
        title: "Position Multiplier",
        img: "/webpage/position-multiplier.png",
        alt: "Position Multiplier",
        lines: [
          <>Skips earn: <strong>2×</strong></>,
          <>All others earn: <strong>1×</strong></>,
        ],
      },
      {
        title: "Win Bonus",
        img: "/webpage/win-bonus.png",
        alt: "Win Bonus",
        lines: [<>Player’s team wins: <strong>+1 point</strong></>],
      },
      {
        title: "Score Differential",
        img: "/webpage/score-differential.png",
        alt: "Score Differential",
        lines: [
          <>Win by 3 or more: <strong>+1</strong></>,
          <>Lose by 3 or more: <strong>−1</strong></>,
        ],
      },
      {
        title: "Shooting Percentage",
        img: "/webpage/shooting-percentage.png",
        alt: "Shooting Percentage",
        lines: [
          <>Above 90%: <strong>+1 × multiplier</strong></>,
          <>Below 60%: <strong>−1 × multiplier</strong></>,
        ],
      },
      {
        title: "Outperform Team",
        img: "/webpage/outperforming-team.png",
        alt: "Outperforming Team",
        lines: [
          <>5%+ better: <strong>+1 × multiplier</strong></>,
          <>5%+ worse: <strong>−1 × multiplier</strong></>,
        ],
      },
      {
        title: "Outplay Opponent",
        img: "/webpage/outplay-opp.png",
        alt: "Outplay Matchup",
        lines: [<>5%+ better: <strong>+1 × multiplier</strong></>],
      },
    ],
    []
  )

  return (
    <div className="min-h-screen text-[13px] sm:text-base">
      <section className="w-full pt-12 pb-6 sm:pt-20 sm:pb-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Image
            src="/logos/button-home-logo.png"
            alt="Fantasy Curling"
            width={200}
            height={200}
            priority
            className="mx-auto mb-4 sm:mb-6"
          />

          <h1 className="text-3xl sm:text-4xl font-bold text-[#1f4785]">
            How Fantasy Curling Works
          </h1>

          <p className="mt-3 text-gray-700 text-[13px] sm:text-lg">
            Everything you need to join a league, draft a rink, and understand scoring.
          </p>
        </div>
      </section>

      <section className="w-full max-w-5xl mx-auto px-4 pb-16 sm:pb-20">
        <div className="space-y-4">
          <SectionAccordion
            sectionKey="platform"
            title="How the Platform Was Designed"
            subtitle="Event-first leagues and consistent scoring."
            openKey={openKey}
            setOpenKey={setOpenKey}
          >
            <p className="text-gray-700 text-[13px] sm:text-lg leading-relaxed">
              Each fantasy league is tied to one competition. Drafting and scoring only uses athletes
              in that event. Players listed as alternates are not available to be drafted.{" "}
              <span className="font-semibold">
                Fantasy leagues track the round-robin portions of events
              </span>{" "}
              so matchups stay consistent and leagues never mix results across competitions.
            </p>
          </SectionAccordion>

          <SectionAccordion
            sectionKey="getting-started"
            title="Tips on Getting Started"
            subtitle="Create an account, set up your profile, and find an event."
            openKey={openKey}
            setOpenKey={setOpenKey}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-2">
              <div className="bg-white p-4 sm:p-6 rounded-xl">
                <h3 className="text-base sm:text-lg font-semibold text-center mb-2">
                  Set Up Your Account
                </h3>
                <p className="text-gray-700 text-center text-[13px] sm:text-base">
                  Sign up with a unique username and unlock leagues, drafts, and scoring.
                </p>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-xl">
                <h3 className="text-base sm:text-lg font-semibold text-center mb-2">
                  Personalize Your Profile
                </h3>
                <p className="text-gray-700 text-center text-[13px] sm:text-base">
                  Add a profile photo, answer fun questions, and choose whether to make your profile
                  public.
                </p>
              </div>

              <div className="bg-white p-4 sm:p-6 rounded-xl">
                <h3 className="text-base sm:text-lg font-semibold text-center mb-2">
                  Explore Leagues &amp; Events
                </h3>
                <p className="text-gray-700 text-center text-[13px] sm:text-base">
                  Browse competitions and join available leagues, or start your own!
                </p>
              </div>
            </div>
          </SectionAccordion>

          <SectionAccordion
            sectionKey="beforedrafting"
            title="Before the Draft"
            subtitle="Everything you need to know before the draft."
            openKey={openKey}
            setOpenKey={setOpenKey}
          >
            <p className="text-gray-700 text-[13px] sm:text-lg leading-relaxed">
              The draft starts automatically on the scheduled time. All draft dates and times are
              shown in ET. You’ll enter from{" "}
              <span className="font-semibold">
                The Pin by clicking the “Enter Draft Room” button on the “Your Upcoming Draft”
              </span>{" "}
              card. The draft runs in a snake format, and if your timer expires or you are not
              online, autopick will select an available player for you. You can draft any player
              from any position you haven’t already filled, and the draft requires at least one
              person online to keep progressing.
            </p>
          </SectionAccordion>

          <SectionAccordion
            sectionKey="drafting"
            title="Drafting Your Rink"
            subtitle="Enter the draft, pick one player per position, then watch scoring update."
            openKey={openKey}
            setOpenKey={setOpenKey}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
              <div className="p-4 sm:p-5 rounded-lg text-center">
                <h3 className="text-base sm:text-lg font-semibold mb-2">Enter the Draft</h3>
                <p className="text-gray-700 text-center text-[13px] sm:text-base">
                  Join the draft room when it opens. Draft order is randomized.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-lg text-center">
                <h3 className="text-base sm:text-lg font-semibold mb-2">Pick Your Players</h3>
                <p className="text-gray-700 text-center text-[13px] sm:text-base">
                  Draft one player per position: lead, second, vice, and skip.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-lg text-center">
                <h3 className="text-base sm:text-lg font-semibold mb-2">Lock In &amp; Watch</h3>
                <p className="text-gray-700 text-center text-[13px] sm:text-base">
                  After the draft, lineups lock. Your points update as games are scored.
                </p>
              </div>
            </div>

            <div className="text-gray-700 text-[13px] sm:text-lg sm:text-base leading-relaxed">
              <p>
                The draft uses a snake format, and you have <strong>45 seconds</strong> to make each
                pick. Players already drafted by other teams are unavailable to you. When it’s{" "}
                <span className="font-semibold">not your turn</span>, you can browse all available
                players. When it <span className="font-semibold">is your turn</span>, positions
                you’ve already drafted are automatically hidden.
              </p>
            </div>
          </SectionAccordion>

          <SectionAccordion
            sectionKey="scoring"
            title="How Scoring Works"
            subtitle="Explore how fantasy points are calculated."
            openKey={openKey}
            setOpenKey={setOpenKey}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mt-2">
              {scoringCards.map((c) => (
                <div key={c.title} className="bg-white p-4 sm:p-6 rounded-xl text-center">
                  <div className="w-full mb-3">
                    <Image
                      src={c.img}
                      alt={c.alt}
                      width={1600}
                      height={900}
                      className="rounded-lg w-full h-[64px] sm:h-auto object-contain bg-white"
                    />
                  </div>

                  <h3 className="text-base sm:text-lg font-semibold mb-2">{c.title}</h3>

                  <p className="text-[12px] sm:text-sm text-gray-700 leading-relaxed">
                    {c.lines.map((line, idx) => (
                      <span key={idx}>
                        {line}
                        {idx < c.lines.length - 1 ? <br /> : null}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </SectionAccordion>

          <SectionAccordion
            sectionKey="designedscoring"
            title="How Scoring Was Designed"
            subtitle="Limited metrics and a fair chance for all."
            openKey={openKey}
            setOpenKey={setOpenKey}
          >
            <p className="text-gray-700 text-[13px] sm:text-lg leading-relaxed">
              Fantasy scoring is built around the stats that exist in curling, with shooting
              percentage carrying the most weight. Only round robin games are counted, since not
              all players advance to playoffs. Position multipliers also matter, with skips earning
              extra weight on their performance to reflect the difficulty and impact of their role.
              Comparing a player to their team highlights value above the rink, and the outplay
              bonus reflects a real-world curling metric.
            </p>
          </SectionAccordion>
        </div>
      </section>
    </div>
  )
}
