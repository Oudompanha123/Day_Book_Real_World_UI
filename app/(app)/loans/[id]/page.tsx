"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoanEditForm, PayBox } from "@/components/LoanForms";
import { useErrorText, useLang, useToast } from "@/components/Providers";
import { useSession } from "@/components/Session";
import { api, type Payment } from "@/lib/api";
import { daysBetween, fmtMoney, fullDate, instantToDate, round2, shortDate } from "@/lib/format";
import { metaSep } from "@/lib/ledger";
import { useData } from "@/lib/useData";

export default function LoanPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { t, lang } = useLang();
  const { me, version, bump, today } = useSession();
  const toast = useToast();
  const errText = useErrorText();
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cur = me.currency;

  // One request gives this loan and any other loans with the same person.
  const { data, error } = useData(() => api.loans(), [version]);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const back = <Link href="/loans" className="back">{t("loan.all")}</Link>;
  if (!data) return <section>{back}<div className="empty">{error ? errText(error) : t("loading")}</div></section>;
  const d = data.find((l) => l.id === id);
  if (!d) return <section>{back}<div className="empty">{t("loan.gone")}</div></section>;

  const inward = d.direction === "IN";
  const pct = d.amount > 0 ? Math.min(100, Math.round((d.paidSoFar / d.amount) * 100)) : 0;
  let status = t("st.open"), statusCls = "";
  if (d.paid) status = t("st.settled");
  else if (d.dueOn && d.dueOn < today) {
    const late = daysBetween(d.dueOn, today);
    status = late === 1 ? t("loan.overdue1") : t("loan.overdueN", { n: late });
    statusCls = "late";
  } else if (d.dueOn === today) {
    status = t("loan.dueToday");
    statusCls = "late";
  }

  // Balance left after each payment, oldest first
  let running = d.amount;
  const withAfter = d.payments.map((p) => {
    running = round2(running - p.amount);
    return { p, after: Math.max(0, running) };
  });

  const key = d.name.trim().toLowerCase();
  const same = data.filter((x) => x.name.trim().toLowerCase() === key);
  const them = round2(same.filter((x) => !x.paid && x.direction === "IN").reduce((s, x) => s + x.remaining, 0));
  const mine = round2(same.filter((x) => !x.paid && x.direction === "OUT").reduce((s, x) => s + x.remaining, 0));

  async function removePayment(p: Payment) {
    try {
      await api.deletePayment(d!.id, p.id);
      bump();
      toast.show(t("loan.payDeleted", { amt: fmtMoney(p.amount, cur) }), async () => {
        await api.addPayment(d!.id, {
          amount: p.amount, paidOn: p.paidOn, countAsEntry: p.entryId !== null,
          entryNote: t(inward ? "pay.noteFrom" : "pay.noteTo", { name: d!.name }),
        });
        bump();
      });
    } catch (e) {
      toast.show(errText(e));
    }
  }

  async function deleteLoan() {
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await api.deleteLoan(d!.id);
      bump();
      router.push("/loans");
      toast.show(t("loan.removed", { name: d!.name }));
    } catch (e) {
      toast.show(errText(e));
    }
  }

  const facts: [string, string, string][] = [
    [t(inward ? "loan.amtLent" : "loan.amtBorrowed"), fmtMoney(d.amount, cur), ""],
    [t(inward ? "loan.lentOn" : "loan.borrowedOn"), fullDate(lang, d.lentOn), ""],
    [t("loan.dueDate"), d.dueOn ? fullDate(lang, d.dueOn) : t("loan.noDue"), d.dueOn ? "" : "muted"],
    [t("loan.status"), status, statusCls],
    [t("loan.whatFor"), d.note || t("loan.notAdded"), d.note ? "" : "muted"],
  ];
  if (d.paid && d.paidAt) facts.push([t("loan.settledOn"), fullDate(lang, instantToDate(d.paidAt)), ""]);

  return (
    <section>
      {back}
      <div className="dhead">
        <h2>{d.name}</h2>
        <span className={"pill " + (inward ? "pin" : "pout")}>{t(inward ? "loan.owesYou" : "loan.youOwe")}</span>
      </div>
      <div className="sheet">
        <div className="muted">{t(d.paid ? "loan.fullyPaid" : "loan.stillOwed")}</div>
        <div className={"owed-total" + (d.paid ? "" : inward ? " in-c" : " out-c")}>{fmtMoney(d.paid ? d.amount : d.remaining, cur)}</div>
        <div className="track big"><div className={"fill " + (inward ? "fin" : "fout")} style={{ width: pct + "%" }} /></div>
        <div className="muted small">{t("loan.paidOfPct", { p: fmtMoney(d.paidSoFar, cur), total: fmtMoney(d.amount, cur), pct })}</div>
      </div>

      <h2>{t("loan.details")}</h2>
      {editing ? (
        <LoanEditForm loan={d} onDone={() => setEditing(false)} />
      ) : (
        <>
          <dl className="facts">
            {facts.map(([k, v, cls]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{k}</dt>
                <dd className={cls}>{v}</dd>
              </div>
            ))}
          </dl>
          <button type="button" className="btn ghost" style={{ marginTop: 14 }} onClick={() => { setEditing(true); setPaying(false); }}>
            {t("loan.edit")}
          </button>
        </>
      )}

      <h2>{t("loan.payments")}</h2>
      <ul className="ledger">
        {withAfter.length === 0 && <li className="empty" style={{ display: "block", borderBottom: 0 }}>{t("loan.noPays")}</li>}
        {withAfter.slice().reverse().map(({ p, after }) => {
          let sub = t("loan.leftAfter", { amt: fmtMoney(after, cur) });
          if (p.entryId !== null) sub += t(inward ? "loan.countedIn" : "loan.countedOut");
          return (
            <li key={p.id}>
              <div className="what"><b>{fullDate(lang, p.paidOn)}</b><small>{sub}</small></div>
              <div className={"money " + (inward ? "in-c" : "out-c")}>{fmtMoney(p.amount, cur)}</div>
              <button type="button" className="x" aria-label={t("loan.delPayAria", { amt: fmtMoney(p.amount, cur) })} onClick={() => removePayment(p)}>×</button>
            </li>
          );
        })}
      </ul>
      {!d.paid && (paying
        ? <PayBox loan={d} onClose={() => setPaying(false)} />
        : <button type="button" className="btn" style={{ marginTop: 14 }} onClick={() => { setPaying(true); setEditing(false); }}>{t("loan.record")}</button>)}

      {same.length > 1 && (
        <>
          <h2>{t("loan.others", { name: d.name })}</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            {t("loan.altogether", { name: d.name, a: fmtMoney(them, cur), b: fmtMoney(mine, cur) })}
          </p>
          <ul className="ledger">
            {same.filter((x) => x.id !== d.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((x) => (
              <li key={x.id}>
                <Link className="what linkish" href={`/loans/${x.id}`}>
                  <b>{t(x.direction === "IN" ? "loan.lent" : "loan.borrowed", { x: fmtMoney(x.amount, cur) })}</b>
                  <small>{shortDate(lang, x.lentOn) + metaSep(lang) + t(x.paid ? "st.settledLc" : "st.openLc")}</small>
                </Link>
                <div className={"money " + (x.paid ? "muted" : x.direction === "IN" ? "in-c" : "out-c")}>{fmtMoney(x.remaining, cur)}</div>
                <span />
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>{t("loan.delete")}</h2>
      <button type="button" className="btn danger" onClick={deleteLoan}>{t(confirmDelete ? "loan.deleteConfirm" : "loan.deleteThis")}</button>
    </section>
  );
}
