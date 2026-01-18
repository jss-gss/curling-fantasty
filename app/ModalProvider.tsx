"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import AchievementModal from "@/components/AchievementModal";

const ModalContext = createContext<any>(null);

export function useAchievementModal() {
  return useContext(ModalContext);
}

export default function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ReactNode | null>(null);

  return (
    <ModalContext.Provider value={{ modal, setModal }}>
      {children}
      {modal}
    </ModalContext.Provider>
  );
}
