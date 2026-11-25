"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { errorKey, translate, type Lang, type MessageKey, type Vars } from "@/lib/i18n";

/* ---------- language ---------- */

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // The boot script in app/layout.tsx has already put the saved language on <html lang>.
  // Render nothing until we've read it, so the page never flashes in the wrong language.
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    setLangState(document.documentElement.lang === "km" ? "km" : "en");
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    try { localStorage.setItem("daybook-lang", l); } catch { /* private mode */ }
  }, []);

  const value = useMemo<LangContextValue | null>(
    () => (lang ? { lang, setLang, t: (key, vars) => translate(lang, key, vars) } : null),
    [lang, setLang],
  );

  if (!value) return null;
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const v = useContext(LangContext);
  if (!v) throw new Error("useLang must be used inside LangProvider");
  return v;
}

/** Turns any thrown error into a translated, user-facing sentence. */
export function useErrorText() {
  const { t } = useLang();
  return useCallback((e: unknown) => t(errorKey(e instanceof ApiError ? e.code : "error")), [t]);
}

/* ---------- toast with optional undo ---------- */

interface ToastState { id: number; msg: string; undo?: () => Promise<void> | void }
interface ToastContextValue { show: (msg: string, undo?: () => Promise<void> | void) => void }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, undo?: () => Promise<void> | void) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setToast({ id, msg, undo });
    timer.current = setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), undo ? 6000 : 4000);
  }, []);

  async function runUndo() {
    const undo = toast?.undo;
    setToast(null);
    if (!undo) return;
    try {
      await undo();
    } catch {
      show(t("err.generic"));
    }
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={"toast" + (toast ? " show" : "")} role="status">
        <span>{toast?.msg}</span>
        {toast?.undo && <button type="button" onClick={runUndo}>{t("undo")}</button>}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const v = useContext(ToastContext);
  if (!v) throw new Error("useToast must be used inside ToastProvider");
  return v;
}
