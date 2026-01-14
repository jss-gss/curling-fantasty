"use client";

import { useEffect } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";

export default function WelcomeModal({
  onClose,
  username
}: {
  onClose: () => void;
  username: string;
}) {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">

        {/* X BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-[#234C6A] mb-2 flex items-center justify-center gap-2">
          Welcome to the
          <Image
            src="/logos/button-home-logo.png"
            alt="BUTTON Logo"
            width={125}
            height={125}
            className="inline-block object-contain"
          />
          !
        </h1>

        <p className="text-sm text-gray-600 mb-6 italic">
          Have you ever found it so easily?
        </p>

        <p className="text-md mb-6">
          See what's happening around the sheets by exploring leagues or polishing up your profile.
        </p>

        <h1 className="text-2xl font-bold text-[#234C6A]">
          Good curling, {username}!
        </h1>
      </div>
    </div>
  );
}
