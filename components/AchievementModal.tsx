"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { ReactNode } from "react";

interface AchievementModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | null;
  icon: ReactNode;
  viewOnly?: boolean;
}

export default function AchievementModal({
  open,
  onClose,
  title,
  description,
  icon,
  viewOnly = false
}: AchievementModalProps) {

  if (!open) return null;

  useEffect(() => {
    if (!viewOnly) {
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [viewOnly]);

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
        {!viewOnly && (
          <h1 className="text-2xl font-bold text-[#234C6A] mb-4 flex items-center justify-center gap-3">
          New Pin Collected!
        </h1>
        )}
        

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="flex justify-center mb-4">
            {icon}
          </div>
        </div>

        {/* Achievement Title */}
        <p className="text-xl font-semibold text-[#234C6A] mb-6">
          {title}
        </p>

        {description && (
          <p className="text-gray-600 mb-4">{description}</p>
        )}

       {!viewOnly && (
          <p className="text-sm text-gray-600 italic mb-6">
            You’re really sweeping up the milestones.
          </p>
        )}


        {/* Close Button */}
        {!viewOnly && (
          <button
          onClick={onClose}
          className="mt-2 px-5 py-2 bg-[#234C6A] text-white rounded-md hover:bg-[#1B3C53] transition"
        >
          Good curling!
        </button>
        )}
      </div>
    </div>
  );
}
