"use client";

import { useState } from "react";
import { api, type Loan, type Kind } from "@/lib/api";
import { fmtMoney, parseAmt, round2, todayISO } from "@/lib/format";
import { useErrorText, useLang, useToast } from "./Providers";
import { useSession } from "./Session";

/** "Got paid" / "Pay back" box. Records a payment and offers undo. */
export function PayBox({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const { t } = useLang();
  const { me, bump, today } = useSession();
  const toast = useToast();
  const errText = useErrorText();
  const inward = loan.direction === "IN";
  const [amt, setAmt] = useState(String(loan.remaining));
  const [date, setDate] = useState(today);
  const [count, setCount] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const cur = me.currency;

  async function submit() {
    const n = parseAmt(amt);
    if (!(n > 0)) return setErr(t("err.amount"));
    if (n > loan.remaining + 0.001) return setErr(t("pay.tooMuch", { amt: fmtMoney(loan.remaining, cur) }));
    const paidOn = date || today;
    if (paidOn > todayISO()) return setErr(t("pay.future"));
    setErr("");
    setBusy(true);
    try {
      const before = new Set(loan.payments.map((p) => p.id));
      const updated = await api.addPayment(loan.id, {
        amount: round2(n), paidOn, countAsEntry: count,
        entryNote: t(inward ? "pay.noteFrom" : "pay.noteTo", { name: loan.name }),
      });
      const added = updated.payments.find((p) => !before.has(p.id));
      onClose();
      bump();
      const msg = updated.paid
        ? t("pay.settled", { name: loan.name })
        : t("pay.saved", { amt: fmtMoney(n, cur), left: fmtMoney(updated.remaining, cur) });
      toast.show(msg, added ? async () => { await api.deletePayment(loan.id, added.id); bump(); } : undefined);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paybox">
      <p>{t(inward ? "pay.howIn" : "pay.howOut", { name: loan.name })}</p>
      <input className="field" inputMode="decimal" autoComplete="off" aria-label={t("pay.amount")}
        value={amt} onChange={(e) => setAmt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="date">{t("pay.paidOn")}{" "}
          <input type="date" value={date} max={today} aria-label={t("pay.date")} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={count} onChange={(e) => setCount(e.target.checked)} />
        {t(inward ? "pay.countIn" : "pay.countOut")}
      </label>
      <div className="row">
        <button type="button" className="btn" onClick={submit} disabled={busy}>{t("pay.save")}</button>
        <button type="button" className="btn ghost" onClick={onClose}>{t("cancel")}</button>
      </div>
      <p className="err" role="status">{err}</p>
    </div>
  );
}

/** Edit a loan's details on its page. */
export function LoanEditForm({ loan, onDone }: { loan: Loan; onDone: () => void }) {
  const { t } = useLang();
  const { me, bump, today } = useSession();
  const toast = useToast();
  const errText = useErrorText();
  const [name, setName] = useState(loan.name);
  const [amt, setAmt] = useState(String(loan.amount));
  const [note, setNote] = useState(loan.note);
  const [dir, setDir] = useState<Kind>(loan.direction);
  const [on, setOn] = useState(loan.lentOn);
  const [due, setDue] = useState(loan.dueOn ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = parseAmt(amt);
    if (!name.trim()) return setErr(t("loan.errName"));
    if (!(n > 0)) return setErr(t("err.amount"));
    if (n < loan.paidSoFar - 0.001) return setErr(t("loan.errBelowPaid", { amt: fmtMoney(loan.paidSoFar, me.currency) }));
    const lentOn = on || loan.lentOn;
    if (due && due < lentOn) return setErr(t("loan.errDue"));
    setErr("");
    setBusy(true);
    try {
      await api.updateLoan(loan.id, { direction: dir, name: name.trim(), amount: round2(n), note: note.trim(), lentOn, dueOn: due || null });
      bump();
      onDone();
      toast.show(t("loan.saved"));
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  const lbl = (text: string, node: React.ReactNode) => (
    <label className="flabel"><span>{text}</span>{node}</label>
  );

  return (
    <div className="sheet">
      {lbl(t("loan.name"), <input className="field" value={name} maxLength={60} autoComplete="off" onChange={(e) => setName(e.target.value)} />)}
      {lbl(t("amount"), <input className="field" inputMode="decimal" autoComplete="off" value={amt} onChange={(e) => setAmt(e.target.value)} />)}
      {lbl(t("loan.whatFor"), <input className="field" value={note} maxLength={120} autoComplete="off" placeholder={t("loan.phNote")} onChange={(e) => setNote(e.target.value)} />)}
      {lbl(t("loan.whichList"), (
        <select className="field" value={dir} onChange={(e) => setDir(e.target.value as Kind)}>
          <option value="IN">{t("loan.theyOwe")}</option>
          <option value="OUT">{t("loan.iOwe")}</option>
        </select>
      ))}
      <div className="row dates">
        <label className="date">{t("date")} <input type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} /></label>
        <label className="date">{t("loan.dueShort")} <input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={submit} disabled={busy}>{t("loan.saveChanges")}</button>
        <button type="button" className="btn ghost" onClick={onDone}>{t("cancel")}</button>
      </div>
      <p className="err" role="status">{err}</p>
    </div>
  );
}
