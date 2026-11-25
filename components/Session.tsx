"use client";

import { createContext, useContext } from "react";
import type { Me } from "@/lib/api";

export interface SessionValue {
  me: Me;
  setMe: (m: Me) => void;
  /** Increases after every change, so pages know to reload their data. */
  version: number;
  bump: () => void;
  /** Today's local date (YYYY-MM-DD); updates at midnight. */
  today: string;
  /** Month shown on History and Report (YYYY-MM). */
  viewMonth: string;
  setViewMonth: (m: string) => void;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession must be used inside the signed-in layout");
  return v;
}
