"use client"

import { useEffect } from "react"
import Image from "next/image"
import confetti from "canvas-confetti"

export default function WelcomeModal({
  onClose,
}: {
  onClose: () => void
  username: string
}) {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    })
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md text-center p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
          aria-label="Close"
        >
          ×
        </button>

        <div className="mb-4">
          <h1 className="text-2xl font-bold text-[#234C6A] leading-tight">
            <span className="block">Welcome to the</span>
          </h1>

          <div className="mt-2 flex justify-center">
            <Image
              src="/logos/button-home-logo.png"
              alt="BUTTON Logo"
              width={160}
              height={80}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 italic">
          Have you ever found it so easily?
        </p>

        <p className="text-md text-gray-600">
          See what's happening around the sheets by exploring leagues or polishing up your profile. Good curling!
        </p>
      </div>
    </div>
  )
}
