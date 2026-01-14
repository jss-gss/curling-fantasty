"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomeNavBar() {
  return (
    <div className="w-full h-16 flex items-center bg-[#f3f4f6]">
      <div className="max-w-screen-xl mx-auto w-full flex items-center justify-between px-4">

        {/* LEFT — LOGO */}
        <div className="flex items-center">
          <Image
            src="/logos/button-home-logo.png"
            alt="BUTTON Logo"
            width={180}
            height={180}
            className="object-contain"
          />
        </div>

        {/* RIGHT — LOGIN */}
        <Link
          href="/login"
          className="text-[#234C6A] font-medium hover:underline"
        >
          Log in
        </Link>

      </div>
    </div>
  );
}
