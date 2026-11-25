"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useErrorText, useLang, useToast } from "@/components/Providers";
import { useSession } from "@/components/Session";
import { api, type Me } from "@/lib/api";
import { CURRENCIES, currencyName, todayISO } from "@/lib/format";
import { catName, payName, type Lang } from "@/lib/i18n";

type Theme = "auto" | "light" | "dark";

export default function SetupPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const { me, setMe, bump } = useSession();
  const toast = useToast();
  const errText = useErrorText();
  const [name, setName] = useState(me.businessName);
  const [theme, setTheme] = useState<Theme>("light");
  const [exportErr, setExportErr] = useState("");
  const [eraseArmed, setEraseArmed] = useState(false);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("daybook-theme");
      if (v === "auto" || v === "dark") setTheme(v);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!eraseArmed) return;
    const timer = setTimeout(() => setEraseArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [eraseArmed]);

  async function save(next: Omit<Me, "email">) {
    try {
      setMe(await api.saveSettings(next));
    } catch (e) {
      toast.show(errText(e));
    }
  }

  function onName(v: string) {
    setName(v);
    setMe({ ...me, businessName: v }); // header updates while typing
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => save({ businessName: v.trim(), currency: me.currency, language: me.language }), 600);
  }

  function onLang(l: Lang) {
    setLang(l);
    save({ businessName: name.trim(), currency: me.currency, language: l });
  }

  function onTheme(v: Theme) {
    setTheme(v);
    const root = document.documentElement;
    // Light is the default: no attribute and nothing saved. "auto" follows the device setting.
    if (v === "light") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", v);
    try {
      if (v === "light") localStorage.removeItem("daybook-theme"); else localStorage.setItem("daybook-theme", v);
    } catch { /* ignore */ }
  }

  async function exportCsv() {
    setExportErr("");
    try {
      const [entries, loans] = await Promise.all([api.entries(), api.loans()]);
      const esc = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows: unknown[][] = [[t("date"), t("csv.type"), t("amount"), t("csv.cur"), t("category"), t("paidBy"), t("note")]];
      for (const e of entries) {
        rows.push([e.date, t(e.kind === "IN" ? "income" : "expense"), e.amount, me.currency, catName(lang, e.category), payName(lang, e.payMethod), e.note]);
      }
      if (loans.length) {
        rows.push([], [t("csv.loans")]);
        rows.push([t("loan.name"), t("csv.dir"), t("amount"), t("csv.paidSoFar"), t("loan.stillOwed"), t("date"), t("loan.dueDate"), t("loan.status"), t("note")]);
        for (const l of loans) {
          rows.push([l.name, t(l.direction === "IN" ? "loan.theyOwe" : "loan.iOwe"), l.amount, l.paidSoFar, l.remaining,
            l.lentOn, l.dueOn ?? "", t(l.paid ? "st.settled" : "st.open"), l.note]);
        }
      }
      const csv = "\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `daybook-${todayISO()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setExportErr(t("set.downloadFailed"));
    }
  }

  async function erase() {
    if (!eraseArmed) return setEraseArmed(true);
    setEraseArmed(false);
    try {
      const m = await api.eraseData();
      setMe(m);
      setName(m.businessName);
      bump();
      toast.show(t("erase.done"));
    } catch (e) {
      toast.show(errText(e));
    }
  }

  async function signOut() {
    try { await api.logout(); } catch { /* the cookie expires anyway */ }
    router.replace("/login");
  }

  return (
    <section className="set">
      <h2 style={{ marginTop: 0 }}>{t("set.title")}</h2>
      <div className="sheet">
        <label htmlFor="sLang">{t("set.lang")}</label>
        <select className="field" id="sLang" value={lang} onChange={(e) => onLang(e.target.value as Lang)}>
          <option value="km" lang="km">ខ្មែរ (Khmer)</option>
          <option value="en" lang="en">English</option>
        </select>
        <label htmlFor="sName">{t("set.biz")}</label>
        <input className="field" id="sName" maxLength={60} autoComplete="off" value={name} onChange={(e) => onName(e.target.value)} />
        <label htmlFor="sCur">{t("set.cur")}</label>
        <select className="field" id="sCur" value={me.currency}
          onChange={(e) => save({ businessName: name.trim(), currency: e.target.value, language: me.language })}>
          {CURRENCIES.map(([code, label]) => (
            <option key={code} value={code}>{currencyName(lang, code, label)} ({code})</option>
          ))}
        </select>
        <label htmlFor="sTheme">{t("set.theme")}</label>
        <select className="field" id="sTheme" value={theme} onChange={(e) => onTheme(e.target.value as Theme)}>
          <option value="auto">{t("set.auto")}</option>
          <option value="light">{t("set.light")}</option>
          <option value="dark">{t("set.dark")}</option>
        </select>
        <p className="muted small" style={{ margin: "6px 0 0" }}>{t("set.autosave")}</p>
      </div>

      <h2>{t("set.account")}</h2>
      <p className="muted" style={{ marginTop: 0, overflowWrap: "anywhere" }}>{t("set.signedInAs", { email: me.email })}</p>
      <button className="btn ghost" type="button" onClick={signOut}>{t("set.signOut")}</button>

      <h2>{t("set.data")}</h2>
      <div className="status"><span className="dot" /><span>{t("set.dataNote")}</span></div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn ghost" type="button" onClick={exportCsv}>{t("set.export")}</button>
      </div>
      <p className="err" role="status">{exportErr}</p>

      <h2>{t("set.over")}</h2>
      <p className="muted small" style={{ marginTop: 0 }}>{t("set.overDesc")}</p>
      <button className="btn danger" type="button" onClick={erase}>{t(eraseArmed ? "erase.again" : "erase.btn")}</button>
    </section>
  );
}
