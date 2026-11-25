"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useErrorText, useLang } from "@/components/Providers";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const errText = useErrorText();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in? Go straight to the app.
  useEffect(() => {
    api.me().then(() => router.replace("/"), () => {});
  }, [router]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setErr(t("auth.errEmail"));
    if (mode === "signup" && password.length < 8) return setErr(t("auth.errShort"));
    if (!password) return setErr(t("auth.errBad"));
    setErr("");
    setBusy(true);
    try {
      const me = mode === "signup" ? await api.register(e, password, lang) : await api.login(e, password);
      if (me.language !== lang) setLang(me.language);
      router.replace("/");
    } catch (x) {
      setErr(errText(x));
      setBusy(false);
    }
  }

  const signup = mode === "signup";

  return (
    <main className="auth">
      <div className="brand">
        <h1>Daybook</h1>
        <button type="button" className="langbtn" lang={lang === "km" ? "en" : "km"} aria-label={t("lang.switch")}
          onClick={() => setLang(lang === "km" ? "en" : "km")}>
          {lang === "km" ? "English" : "ខ្មែរ"}
        </button>
      </div>
      <p className="intro">{t("auth.intro")}</p>
      <form className="sheet" onSubmit={submit} noValidate>
        <h2 style={{ marginTop: 0 }}>{t(signup ? "auth.signUp" : "auth.signIn")}</h2>
        <label htmlFor="email">{t("auth.email")}</label>
        <input className="field" id="email" type="email" autoComplete="email" inputMode="email"
          value={email} onChange={(ev) => setEmail(ev.target.value)} />
        <label htmlFor="password">{t("auth.password")}</label>
        <input className="field" id="password" type="password" autoComplete={signup ? "new-password" : "current-password"}
          value={password} onChange={(ev) => setPassword(ev.target.value)} />
        <button className="btn wide" type="submit" disabled={busy}>{t(signup ? "auth.signUp" : "auth.signIn")}</button>
        <p className="err" role="status">{err}</p>
      </form>
      <p className="switch">
        <button type="button" className="linkbtn" onClick={() => { setMode(signup ? "signin" : "signup"); setErr(""); }}>
          {t(signup ? "auth.toSignIn" : "auth.toSignUp")}
        </button>
      </p>
    </main>
  );
}
