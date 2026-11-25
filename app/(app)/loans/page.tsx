"use client";

import Link from "next/link";
import { useState } from "react";
import { Tally } from "@/components/Ledger";
import { PayBox } from "@/components/LoanForms";
import { useErrorText, useLang, useToast } from "@/components/Providers";
import { useSession } from "@/components/Session";
import { api, type Kind, type Loan } from "@/lib/api";
import { daysBetween, fmtMoney, instantToDate, parseAmt, round2, shortDate, yesterdayISO } from "@/lib/format";
import { dayLabel, metaSep } from "@/lib/ledger";
import { useData } from "@/lib/useData";

export default function LoansPage() {
  const { t, lang } = useLang();
  const { me, version, bump, today } = useSession();
  const toast = useToast();
  const errText = useErrorText();
  const cur = me.currency;

  const [side, setSide] = useState<Kind>("IN");
  const [openPay, setOpenPay] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [on, setOn] = useState(today);
  const [due, setDue] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useData(() => api.loans(), [version]);
  const loans = data ?? [];
  const openAll = loans.filter((l) => !l.paid);
  const owedMe = round2(openAll.filter((l) => l.direction === "IN").reduce((s, l) => s + l.remaining, 0));
  const iOwe = round2(openAll.filter((l) => l.direction === "OUT").reduce((s, l) => s + l.remaining, 0));
  const bal = round2(owedMe - iOwe);

  const open = openAll
    .filter((l) => l.direction === side)
    .sort((a, b) => {
      const ad = a.dueOn ?? "9999", bd = b.dueOn ?? "9999";
      return ad !== bd ? (ad < bd ? -1 : 1) : a.createdAt.localeCompare(b.createdAt);
    });
  const settled = loans.filter((l) => l.paid).sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));

  function chooseSide(s: Kind) {
    setSide(s);
    setOpenPay(null);
    setErr("");
  }

  async function add() {
    const n = parseAmt(amt);
    if (!name.trim()) return setErr(t(side === "IN" ? "loan.errNameIn" : "loan.errNameOut"));
    if (!(n > 0)) return setErr(t("err.amount"));
    const lentOn = on || today;
    if (due && due < lentOn) return setErr(t("loan.errDue"));
    setErr("");
    setBusy(true);
    try {
      await api.addLoan({ direction: side, name: name.trim(), amount: round2(n), note: note.trim(), lentOn, dueOn: due || null });
      toast.show(t(side === "IN" ? "loan.addedIn" : "loan.addedOut", { name: name.trim() }));
      setName(""); setAmt(""); setNote(""); setOn(today); setDue("");
      bump();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(l: Loan) {
    try {
      await api.deleteLoan(l.id);
      bump();
      toast.show(t("loan.removed", { name: l.name }));
    } catch (e) {
      toast.show(errText(e));
    }
  }

  function whenText(instant: string) {
    const d = instantToDate(instant);
    if (d === today) return t("when.today");
    if (d === yesterdayISO()) return t("when.yesterday");
    return t("when.on", { date: dayLabel(lang, t, d, today) });
  }

  const onEnter = (ev: React.KeyboardEvent) => { if (ev.key === "Enter") add(); };

  return (
    <section>
      <Tally items={[
        [t("loan.theyOwe"), owedMe, "in-c"],
        [t("loan.iOwe"), iOwe, "out-c"],
        [t("loan.balance"), bal, bal < 0 ? "out-c" : ""],
      ]} />

      <div className="kind" role="radiogroup" aria-label={t("loan.whichList")} style={{ margin: "20px 0 14px" }}>
        {(["IN", "OUT"] as const).map((s) => (
          <button key={s} type="button" role="radio" className={s === "IN" ? "in" : "out"} aria-checked={side === s} onClick={() => chooseSide(s)}>
            {t(s === "IN" ? "loan.theyOwe" : "loan.iOwe")}
          </button>
        ))}
      </div>

      <div className="sheet">
        <input className="field" maxLength={60} autoComplete="off" aria-label={t("loan.name")}
          placeholder={t(side === "IN" ? "loan.phWhoIn" : "loan.phWhoOut")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onEnter} />
        <input className="field" inputMode="decimal" autoComplete="off" aria-label={t("loan.amountOwed")}
          placeholder={t("amount")} value={amt} onChange={(e) => setAmt(e.target.value)} onKeyDown={onEnter} />
        <input className="field" maxLength={120} autoComplete="off" aria-label={t("loan.whatFor")}
          placeholder={t("loan.phNote")} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter} />
        <div className="row dates">
          <label className="date">{t(side === "IN" ? "loan.lentOn" : "loan.borrowedOn")}{" "}
            <input type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} />
          </label>
          <label className="date">{t("loan.dueOpt")}{" "}
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
        <button className="btn wide" type="button" onClick={add} disabled={busy}>{t(side === "IN" ? "loan.addIn" : "loan.addOut")}</button>
        <p className="err" role="status">{err}</p>
      </div>

      <h2>{t(side === "IN" ? "loan.openIn" : "loan.openOut")}</h2>
      <ul className="ledger">
        {data && open.length === 0 && (
          <li className="empty" style={{ display: "block", borderBottom: 0 }}>{t(side === "IN" ? "loan.emptyIn" : "loan.emptyOut")}</li>
        )}
        {open.map((l) => {
          const meta: string[] = [];
          if (l.note) meta.push(l.note);
          meta.push(t(side === "IN" ? "loan.lent" : "loan.borrowed", { x: shortDate(lang, l.lentOn) }));
          if (l.paidSoFar > 0) meta.push(t("loan.paidOf", { p: fmtMoney(l.paidSoFar, cur), total: fmtMoney(l.amount, cur) }));
          const diff = l.dueOn ? daysBetween(today, l.dueOn) : null;
          return (
            <li key={l.id}>
              <Link className="what linkish" href={`/loans/${l.id}`}>
                <b>{l.name}</b>
                <small>{meta.join(metaSep(lang))}</small>
                {diff !== null && <br />}
                {diff !== null && diff < 0 && <small className="late">{diff === -1 ? t("loan.overdue1") : t("loan.overdueN", { n: -diff })}</small>}
                {diff === 0 && <small className="late">{t("loan.dueToday")}</small>}
                {diff !== null && diff > 0 && <small>{t("loan.due", { date: shortDate(lang, l.dueOn!) })}</small>}
              </Link>
              <div className={"money " + (side === "IN" ? "in-c" : "out-c")}>{fmtMoney(l.remaining, cur)}</div>
              <div className="acts">
                <button type="button" className={"act" + (side === "OUT" ? " outside" : "")} aria-expanded={openPay === l.id}
                  onClick={() => setOpenPay(openPay === l.id ? null : l.id)}>
                  {t(side === "IN" ? "loan.gotPaid" : "loan.payBack")}
                </button>
                <button type="button" className="x" aria-label={t("loan.remove", { name: l.name })} onClick={() => remove(l)}>×</button>
              </div>
              {openPay === l.id && <PayBox loan={l} onClose={() => setOpenPay(null)} />}
            </li>
          );
        })}
      </ul>

      {settled.length > 0 && (
        <details>
          <summary>{t("loan.settledN", { n: settled.length })}</summary>
          <ul className="ledger">
            {settled.slice(0, 50).map((l) => (
              <li key={l.id}>
                <Link className="what linkish" href={`/loans/${l.id}`}>
                  <b>{l.name}</b>
                  <small>{t(l.direction === "IN" ? "loan.paidYouBack" : "loan.youPaidBack", { when: whenText(l.paidAt ?? l.createdAt) })}</small>
                </Link>
                <div className="money muted">{fmtMoney(l.amount, cur)}</div>
                <button type="button" className="x" aria-label={t("loan.removeSettled", { name: l.name })} onClick={() => remove(l)}>×</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
