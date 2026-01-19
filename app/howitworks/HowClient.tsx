export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-[#0a0a0a] text-gray-300 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <h1 className="text-3xl font-semibold text-white tracking-wide">
          About
        </h1>

        {/* Card 1 — The Origin */}
        <div className="bg-black/40 border border-[#234C6A] rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-medium text-white mb-3">Built by a Curler</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            This project started with a simple idea: curling deserves a fantasy
            experience that’s as strategic and fun as the sport itself. Built by
            someone who loves the game, the goal is to bring fans closer to the
            action and give the curling community something new to enjoy.
          </p>
        </div>

        {/* Card 2 — The Purpose */}
        <div className="bg-black/40 border border-[#234C6A] rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-medium text-white mb-3">Why This Exists</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Curling is full of strategy, momentum swings, and clutch moments.
            Fantasy sports highlight those details — and curling deserves that
            spotlight. This app is designed to celebrate the sport, connect fans,
            and make following events even more exciting.
          </p>
        </div>

        {/* Card 3 — The Vision */}
        <div className="bg-black/40 border border-[#234C6A] rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-medium text-white mb-3">The Vision</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            The long‑term goal is to build the best curling‑focused fantasy
            platform out there — simple to use, fun to compete in, and built with
            respect for the sport. As the app grows, more features, stats, and
            league formats will be added based on community feedback.
          </p>
        </div>

        {/* Card 4 — A Note to Users */}
        <div className="bg-black/40 border border-[#234C6A] rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-medium text-white mb-3">A Note to the Community</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Whether you're a competitive curler, a casual fan, or someone who
            stumbled into the sport and fell in love with it, this app is for you.
            Thanks for being part of something new — and for helping grow the game
            we all care about.
          </p>
        </div>

      </div>
    </div>
  );
}
