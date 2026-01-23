"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HowItWorksPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">

      <section className="w-full py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-[#1f4785] mb-4">
            How Fantasy Curling Works
          </h1>
        </div>
      </section>

      <section className="w-full max-w-6xl mx-auto mb-20 px-4">
        <h2 className="text-3xl font-bold mb-10 text-center">
          Tips on Getting Started
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 — Create Your Account */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl">       
            <h3 className="text-xl font-semibold text-center mb-2">Create Your Account</h3>
            <p className="text-gray-700 text-center">
              Sign up in seconds and unlock access to leagues, drafts, and scoring.
            </p>
          </div>

          {/* Card 2 — Personalize Your Profile */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl">
            <h3 className="text-xl font-semibold text-center mb-2">Personalize Your Profile</h3>
            <p className="text-gray-700 text-center">
              Set your avatar, answer curling questions, and decide whether your profile is public or private.
            </p>
          </div>

          {/* Card 3 — Explore Leagues */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl">
            <h3 className="text-xl font-semibold text-center mb-2">Explore Leagues & Events</h3>
            <p className="text-gray-700 text-center">
              Browse upcoming competitions and find the perfect league to join or follow.
            </p>
          </div>

        </div>
      </section>

      <section className="w-full flex justify-center mb-20 px-4">
        <div className="w-full max-w-4xl">
          <h3 className="text-3xl font-bold text-center text-[#1f4785] mb-6">
            How the Platform Was Designed
          </h3>

          <p className="text-gray-700 text-lg leading-relaxed text-center">
            The platform follows a simple event‑first structure. Each fantasy league is tied to one competition, and all drafting and scoring come only from the athletes in that event. Because curling events begin with a round‑robin, the platform tracks that stage exclusively - users join an event, draft from its field, and follow scoring as the round‑robin unfolds. This keeps every league focused, consistent, and free from mixing data across tournaments or divisions.
          </p>
        </div>
      </section>

      <section className="w-full flex justify-center mb-10 px-4">
        <div className="w-full max-w-6xl bg-[#0a2342] text-white py-12 px-8 rounded-xl shadow-inner">

          <h2 className="text-3xl font-bold mb-10 text-center">
            Drafting Your Rink
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#12345a] p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-semibold mb-3">Enter the Draft</h3>
              <p className="opacity-80">
                Join a league’s draft room. Draft positions are randomly assigned before drafting begins.
              </p>
            </div>

            <div className="bg-[#12345a] p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-semibold mb-3">Pick Your Players</h3>
              <p className="opacity-80">
                Choose one curler for each position – lead, second, vice, and skip – until your rink is complete.
              </p>
            </div>

            <div className="bg-[#12345a] p-6 rounded-lg shadow-lg text-center">
              <h3 className="text-xl font-semibold mb-3">Lock In & Watch</h3>
              <p className="opacity-80">
                When drafting ends, your lineup is locked. No changes – just follow the action and score points.
              </p>
            </div>
          </div>

          <div className="mt-10 bg-[#12345a] p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-3 text-center">Nuances & Pro Tips</h3>
            <ul className="opacity-80 space-y-2 mx-auto text-center">
              <li>The draft starts automatically on schedule, but it needs at least one participant online to keep progressing smoothly.</li>
              <li>You have 45 seconds to make each pick.</li>
              <li>If you’re offline or the timer expires, the system autopicks an available player for you.</li>
              <li>You can enter the draft directly from The Pin page when the draft opens.</li>
            </ul>
          </div>

        </div>
      </section>

      <section className="w-full py-16 mb-12">
        <div className="max-w-6xl mx-auto px-4">

          <h2 className="text-3xl font-bold text-center text-[#1f4785] mb-12">
            How Scoring Works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">

            {/* CARD 1 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl text-center">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/position-multiplier.png" 
                  alt="Position Multiplier"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Position Multiplier</h3>
              <p className="text-sm text-gray-600">
                Skips earn <strong>2×</strong>. Others earn <strong>1×</strong>.
              </p>
            </div>

            {/* CARD 2 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl text-center">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/shooting-percentage.png"
                  alt="Shooting Percentage"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Shooting Percentage</h3>
              <p className="text-sm text-gray-600">
                Above 94%: +1 × multiplier  
                <br />
                Below 70%: −2 × multiplier
              </p>
            </div>

            {/* CARD 3 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl text-center">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/outperforming-team.png"
                  alt="Outperforming Team"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Outperforming Team</h3>
              <p className="text-sm text-gray-600">
                4%+ better: +1 × multiplier  
                <br />
                4%+ worse: −1 × multiplier
              </p>
            </div>

            {/* CARD 4 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl text-center">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/win-bonus.png"
                  alt="Win Bonus"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Win Bonus</h3>
              <p className="text-sm text-gray-600">
                If your player’s team wins, they earn <strong>+1 point</strong>.
              </p>
            </div>

            {/* CARD 5 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl text-center">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/score-differential.png"
                  alt="Score Differential"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Score Differential</h3>
              <p className="text-sm text-gray-600">
                Win by 3+: +1  
                <br />
                Lose by 3+: −1
              </p>
            </div>

            {/* CARD 6 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 transition transform hover:-translate-y-1 hover:shadow-2xl text-center">
              <div className="w-full mb-4">
                <Image
                  src="/webpage/total-fantasy-score.png"
                  alt="Total Fantasy Score"
                  width={1600}
                  height={900}
                  className="rounded-t-xl w-full h-auto"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Total Fantasy Score</h3>
              <p className="text-sm text-gray-600">
                All bonuses and penalties are added together with multipliers applied.
              </p>
            </div>

          </div>
        </div>
      </section>

      <section className="w-full flex justify-center mb-20 px-4">
        <div className="w-full max-w-4xl">

          <h3 className="text-3xl font-bold text-center text-[#1f4785] mb-6">
            How Scoring Was Designed
          </h3>

          <p className="text-gray-700 text-lg leading-relaxed text-center">
           Fantasy curling scoring blends individual performance with team metrics to 
           reflect how the sport truly works. Curling doesn’t produce a wide range of 
           individual statistics, yet every player can influence every stone through 
           sweeping, communication, and strategic decision-making. Shooting percentage 
           is one of the only collected measure of personal execution, so comparing 
           a player's percentage to their team's overall performance can show 
           their broader influence on each end. This approach balances the limitations 
           of available data while highlighting players who elevate their rink, resulting 
           in a scoring model that rewards meaningful contribution across all positions. 
          </p>

        </div>
      </section>
    </div>
  )
}
