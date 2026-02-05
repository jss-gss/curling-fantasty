"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import confetti from "canvas-confetti"

interface AchievementModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string | null
  iconSrc?: string | null
  viewOnly?: boolean
  earnedAt?: string | null
}

export default function AchievementModal({
  open,
  onClose,
  title,
  description,
  iconSrc,
  viewOnly = false,
  earnedAt
}: AchievementModalProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (open) setLoaded(false)
  }, [open, iconSrc])

  useEffect(() => {
    if (open && !viewOnly) {
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      })
    }
  }, [open, viewOnly])

  if (!open) return null

  function formatDate(dateString: string) {
    const cleaned = dateString.replace("T", " ").split(" ")[0]
    const [year, month, day] = cleaned.split("-")
    return `${month}/${day}/${year}`
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-[calc(100%-2rem)] sm:w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>

        {!viewOnly && (
          <h1 className="text-2xl font-bold text-[#234C6A] mb-4 flex items-center justify-center gap-3">
            New Pin Collected!
          </h1>
        )}

        <div className="flex justify-center mb-4">
          <div className="relative h-[160px] w-[160px]">
            {!loaded && (
              <div className="absolute inset-0 rounded-full bg-gray-200 animate-pulse" />
            )}

            {iconSrc && (
              <Image
                src={iconSrc}
                alt={title}
                width={160}
                height={160}
                onLoad={() => setLoaded(true)}
                unoptimized
                className="animate-pin-breath"
              />
            )}
          </div>
        </div>

        <p className="text-xl font-semibold text-[#234C6A] mb-6">{title}</p>

        {description && <p className="text-gray-600 mb-4">{description}</p>}
        
        {!viewOnly && (
          <p className="text-xs text-gray-500 italic mb-4">
            You're really sweeping up the milestones.
          </p>
        )}
        {viewOnly && earnedAt && (
          <p className="text-xs text-gray-500 italic mb-4">
            Earned on {formatDate(earnedAt)}
          </p>
        )}
      </div>
    </div>
  )
}
