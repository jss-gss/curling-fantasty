export default function BottomNav() {
  return (
    <footer className="hidden lg:flex w-full h-10 bg-[#234C6A] items-center px-8">
      <div className="flex items-center gap-3">
        <img
          src="/logos/button-main-logo.png"
          alt="Logo"
          className="h-4 w-auto"
        />

        <span className="text-white text-[10px] tracking-wide whitespace-nowrap">
          by a curler. for curlers.
        </span>
      </div>

      <div className="ml-auto flex items-center gap-12">
        <FooterItem label="How It Works" href="/howitworks" />
        <FooterItem label="About" href="/about" />
        <FooterItem label="Terms of Service" href="/termsofservice" />
        <FooterItem label="Privacy Policy" href="/privacypolicy" />
      </div>
    </footer>
  )
}

function FooterItem({
  label,
  href,
}: {
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-white text-[10px] hover:text-[#3A6C8F] transition whitespace-nowrap"
    >
      {label}
    </a>
  )
}
