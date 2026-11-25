"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useErrorText, useLang } from "@/components/Providers";
import { SessionContext, type SessionValue } from "@/components/Session";
import { api, ApiError, setUnauthorizedHandler, type Me } from "@/lib/api";
import { fmtDate, todayISO } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

const TABS = [
  { href: "/", key: "nav.today" },
  { href: "/history", key: "nav.history" },
  { href: "/loans", key: "nav.owed" },
  { href: "/report", key: "nav.report" },
  { href: "/setup", key: "nav.setup" },
] as const;

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, lang, setLang } = useLang();
  const errText = useErrorText();
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const [today, setToday] = useState(todayISO());
  const [viewMonth, setViewMonth] = useState(today.slice(0, 7));

  useEffect(() => {
    setUnauthorizedHandler(() => router.replace("/login"));
    api.me().then(
      (m) => {
        setMe(m);
        if (m.language !== document.documentElement.lang) setLang(m.language);
      },
      (e) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        else setLoadError(e);
      },
    );
    return () => setUnauthorizedHandler(null);
  }, [router, setLang]);

  // Midnight rollover
  useEffect(() => {
    const id = setInterval(() => setToday((d) => (d === todayISO() ? d : todayISO())), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.title = (me?.businessName ? me.businessName + " · " : "") + "Daybook";
  }, [me?.businessName]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const session = useMemo<SessionValue | null>(
    () => (me ? { me, setMe, version, bump, today, viewMonth, setViewMonth } : null),
    [me, version, bump, today, viewMonth],
  );

  async function switchLang() {
    const next: Lang = lang === "km" ? "en" : "km";
    setLang(next);
    if (me) {
      try { setMe(await api.saveSettings({ businessName: me.businessName, currency: me.currency, language: next })); }
      catch { /* the device still remembers it */ }
    }
  }

  if (!session) {
    return <div className="loading">{loadError ? errText(loadError) : t("loading")}</div>;
  }

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <SessionContext.Provider value={session}>
      <div className="wrap">
        <header className="top">
          <h1>{me!.businessName || t("app.biz")}</h1>
          <div className="hright">
            <div className="date">{fmtDate(lang, new Date(), { weekday: "short", day: "numeric", month: "short" })}</div>
            <button type="button" className="langbtn" lang={lang === "km" ? "en" : "km"} aria-label={t("lang.switch")} onClick={switchLang}>
              {lang === "km" ? "English" : "ខ្មែរ"}
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
      <nav className="tabs" aria-label={t("aria.sections")}>
        <div className="in">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} aria-current={active(tab.href) ? "page" : undefined}>
              {t(tab.key)}
            </Link>
          ))}
        </div>
      </nav>
    </SessionContext.Provider>
  );
}
