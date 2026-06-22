"use client";

import Link from "next/link";
import { Logo } from "./brand";
import { Icon } from "./icons";
import { useTheme } from "./theme-provider";

export function PublicNav() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="btn-ghost h-9 w-9 !px-0" title="Toggle theme">
            {theme === "dark" ? <Icon.Sun className="h-5 w-5" /> : <Icon.Moon className="h-5 w-5" />}
          </button>
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">
            Log in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
