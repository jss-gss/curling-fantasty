export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a2342] py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-10 border border-gray-200">

        <h1 className="text-2xl sm:text-3xl font-bold text-[#1f4785] mb-4">
          Privacy Policy
        </h1>

        <p className="text-gray-600 mb-8">Last updated: January 2026</p>

        <div className="space-y-10 text-gray-700 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              What We Collect
            </h2>
            <p>
              We collect only the information needed to run the app and improve your
              experience. This includes account information you provide (like your
              email), fantasy league activity (picks, scores, achievements), and basic
              device and usage data. We do not sell your data or share your personal
              information with advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              How We Use Your Information
            </h2>
            <p>
              We use your information to create and manage your account, run fantasy
              leagues and scoring, improve the app, fix bugs, and communicate with you
              about updates or support.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              How Your Data Is Stored
            </h2>
            <p>
              Your data is stored securely using modern cloud infrastructure. We take
              reasonable steps to protect it from unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Third‑Party Services
            </h2>
            <p>
              We use trusted third‑party tools to help run the app. These services only
              receive the information necessary to perform their functions.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Your Choices
            </h2>
            <p>
              You can update your account information, request deletion of your
              account, or contact us with any privacy questions.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Contact
            </h2>
            <p>
              If you have questions about this policy or your data, reach out anytime.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
