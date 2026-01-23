"use client";

import { useEffect, ReactNode } from "react";
import confetti from "canvas-confetti";

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
  useEffect(() => {
    if (open && !viewOnly) {
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [open, viewOnly]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center"
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
          {icon}
        </div>

        <p className="text-xl font-semibold text-[#234C6A] mb-6">
          {title}
        </p>

        {description && (
          <p className="text-gray-600 mb-4">{description}</p>
        )}

        {!viewOnly && (
          <>
            <p className="text-sm text-gray-600 italic mb-6">
              You’re really sweeping up the milestones.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
