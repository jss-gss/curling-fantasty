"use client"

import { useEffect, useRef, useState } from "react"

export default function BottomNav() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <footer className="w-full bg-[#234C6A]">
      <div className="lg:hidden h-10 flex items-center px-4 relative" ref={menuRef}>
        <div className="flex items-center gap-3">
          <img src="/logos/button-main-logo.png" alt="Logo" className="h-4 w-auto" />
          <span className="text-white text-[10px] tracking-wide whitespace-nowrap">
            by a curler. for curlers.
          </span>
        </div>

        <button
          onClick={() => setOpen(prev => !prev)}
          className="ml-auto text-white h-9 w-9 rounded-md hover:bg-white/10 flex items-center justify-center"
          aria-label="Footer menu"
        >
          <span className="leading-none text-2xl -mt-px">☰</span>
        </button>

        {open && (
          <div className="absolute right-4 bottom-12 w-56 bg-white shadow-md rounded-md p-2 text-[#234C6A] z-50">
            <FooterItem label="How It Works" href="/howitworks" />
            <FooterItem label="About" href="/about" />
            <FooterItem label="Terms of Service" href="/termsofservice" />
            <FooterItem label="Privacy Policy" href="/privacypolicy" />
          </div>
        )}
      </div>

      <div className="hidden lg:flex h-10 items-center px-8">
        <div className="flex items-center gap-3">
          <img src="/logos/button-main-logo.png" alt="Logo" className="h-4 w-auto" />
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
      </div>
    </footer>
  )
}

function FooterItem({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block lg:inline text-[#234C6A] lg:text-white text-sm lg:text-[10px] px-3 py-2 lg:px-0 lg:py-0 rounded-md lg:rounded-none hover:bg-gray-100 lg:hover:bg-transparent lg:hover:text-[#3A6C8F] transition whitespace-nowrap"
    >
      {label}
    </a>
  )
}
