"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Me {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isPremium: boolean;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  longestStreak: number;
  progress: { level: number; intoLevel: number; span: number; pct: number; toNext: number };
  dailyUsed: number;
  dailyLimit: number | null;
}

const Ctx = createContext<{
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setMe: (m: Me | null) => void;
}>({ me: null, loading: true, refresh: async () => {}, setMe: () => {} });

export function UserProvider({ initial, children }: { initial?: Me | null; children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json();
      setMe(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) refresh();
  }, [initial, refresh]);

  return <Ctx.Provider value={{ me, loading, refresh, setMe }}>{children}</Ctx.Provider>;
}

export const useUser = () => useContext(Ctx);
