"use client";

import { useRef, useState } from "react";
import { EntryRow, EntryTally } from "@/components/Ledger";
import { useErrorText, useLang, useToast } from "@/components/Providers";
import { useSession } from "@/components/Session";
import { api, type Entry, type Kind } from "@/lib/api";
import { curSymbol, fmtMoney, parseAmt, round2 } from "@/lib/format";
import { CATEGORIES, PAY_METHODS, catName, payName } from "@/lib/i18n";
import { sums } from "@/lib/ledger";
import { useData } from "@/lib/useData";

export default function TodayPage() {
  const { t, lang } = useLang();
  const { me, version, bump, today } = useSession();
  const toast = useToast();
  const errText = useErrorText();

  const [kind, setKind] = useState<Kind>("IN");
  const [cat, setCat] = useState<string>(CATEGORIES.IN[0]);
  const [pay, setPay] = useState<string>(PAY_METHODS[0]);
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [flashId, setFlashId] = useState<number | null>(null);
  const amtRef = useRef<HTMLInputElement>(null);

  const { data } = useData(() => api.entries(today.slice(0, 7)), [today, version]);
  const list = (data ?? []).filter((e) => e.date === today);

  function chooseKind(k: Kind) {
    setKind(k);
    setCat(CATEGORIES[k][0]);
  }

  async function add() {
    const n = parseAmt(amt);
    if (!(n > 0)) {
      setErr(t("err.amount"));
      amtRef.current?.focus();
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const e = await api.addEntry({ kind, amount: round2(n), note: note.trim(), category: cat, payMethod: pay, date: date || today });
      setAmt("");
      setNote("");
      setFlashId(e.id);
      bump();
      toast.show(
        t(kind === "IN" ? "toast.addedIn" : "toast.addedOut", { amt: fmtMoney(e.amount, me.currency) }),
        async () => { await api.deleteEntry(e.id); bump(); },
      );
      amtRef.current?.focus();
    } catch (x) {
      setErr(errText(x));
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: Entry) {
    try {
      await api.deleteEntry(e.id);
      bump();
      toast.show(t("toast.deleted"), async () => {
        await api.addEntry({ kind: e.kind, amount: e.amount, note: e.note, category: e.category, payMethod: e.payMethod, date: e.date });
        bump();
      });
    } catch (x) {
      toast.show(errText(x));
    }
  }

  const onEnter = (ev: React.KeyboardEvent) => { if (ev.key === "Enter") add(); };

  return (
    <section>
      <div className="sheet">
        <div className="kind" role="radiogroup" aria-label={t("aria.kind")}>
          {(["IN", "OUT"] as const).map((k) => (
            <button key={k} type="button" role="radio" className={k === "IN" ? "in" : "out"}
              aria-checked={kind === k} onClick={() => chooseKind(k)}>
              {t(k === "IN" ? "income" : "expense")}
            </button>
          ))}
        </div>
        <label className="amt" htmlFor="amt">
          <span className="sym">{curSymbol(me.currency)}</span>
          <input id="amt" ref={amtRef} inputMode="decimal" autoComplete="off" placeholder="0" aria-label={t("amount")}
            value={amt} onChange={(e) => setAmt(e.target.value)} onKeyDown={onEnter} />
        </label>
        <input className="field" maxLength={120} autoComplete="off" aria-label={t("note")}
          placeholder={t(kind === "IN" ? "ph.sold" : "ph.paidFor")}
          value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter} />
        <div className="chips" aria-label={t("category")}>
          {CATEGORIES[kind].map((c) => (
            <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}>{catName(lang, c)}</button>
          ))}
        </div>
        <div className="chips" aria-label={t("paidBy")}>
          {PAY_METHODS.map((p) => (
            <button key={p} type="button" aria-pressed={p === pay} onClick={() => setPay(p)}>{payName(lang, p)}</button>
          ))}
        </div>
        <div className="row">
          <label className="date">{t("date")}{" "}
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <button className="btn wide" type="button" onClick={add} disabled={busy}>
          {t(kind === "IN" ? "btn.addIn" : "btn.addOut")}
        </button>
        <p className="err" role="status">{err}</p>
      </div>

      <h2>{t("today")}</h2>
      <EntryTally s={sums(list)} />
      <ul className="ledger" style={{ marginTop: 8 }}>
        {list.length === 0 && data && (
          <li className="empty" style={{ display: "block", borderBottom: 0 }}>{t("today.empty")}</li>
        )}
        {list.map((e) => (
          <EntryRow key={e.id} e={e} flash={e.id === flashId} onDelete={() => remove(e)} />
        ))}
      </ul>
    </section>
  );
}
