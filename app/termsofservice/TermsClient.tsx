export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a2342] py-16 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-10 border border-gray-200">

        <h1 className="text-2xl sm:text-3xl font-bold text-[#1f4785] mb-4">
          Terms of Service
        </h1>

        <p className="text-gray-600 mb-8">Last updated: January 2026</p>

        <div className="space-y-10 text-gray-700 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Using the App
            </h2>
            <p>
              This app is designed for fantasy curling leagues, scoring, and related
              gameplay. By using the app, you agree to follow these terms and use the
              service responsibly.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Your Account
            </h2>
            <p>
              You are responsible for keeping your account information secure. If you
              believe your account has been accessed without permission, please contact
              us so we can help.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Acceptable Use
            </h2>
            <p>
              You agree not to misuse the app, attempt to disrupt service, or engage in
              abusive behavior toward other users. We may suspend or remove accounts
              that violate these rules.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Changes to the Service
            </h2>
            <p>
              We may update or change features of the app at any time to improve the
              experience. We will do our best to communicate major changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Liability
            </h2>
            <p>
              We work hard to keep the app running smoothly, but we cannot guarantee
              uninterrupted service. We are not responsible for losses caused by
              outages, bugs, or misuse of the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1f4785] mb-2">
              Contact
            </h2>
            <p>
              If you have questions about these terms, reach out anytime.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
