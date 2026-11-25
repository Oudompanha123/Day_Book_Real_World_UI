"use client";

import { useEffect, useRef } from "react";
import { MonthNav, Tally } from "@/components/Ledger";
import { useErrorText, useLang } from "@/components/Providers";
import { useSession } from "@/components/Session";
import { api, type Share } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { catName, payName, type MessageKey } from "@/lib/i18n";
import { dayLabel } from "@/lib/ledger";
import { useData } from "@/lib/useData";

export default function ReportPage() {
  const { t, lang } = useLang();
  const { me, version, viewMonth, today } = useSession();
  const errText = useErrorText();
  const { data: r, error } = useData(() => api.report(viewMonth), [viewMonth, version]);
  const cur = me.currency;
  const chartRef = useRef<HTMLDivElement>(null);

  // On a narrow phone the chart scrolls sideways; start at today for the current month.
  useEffect(() => {
    const el = chartRef.current;
    if (el && r && viewMonth === today.slice(0, 7)) {
      const dayX = (Number(today.slice(8)) / r.days.length) * el.scrollWidth;
      el.scrollLeft = Math.max(0, dayX - el.clientWidth + 40);
    }
  }, [r, viewMonth, today]);

  if (!r) {
    return <section><MonthNav /><div className="empty">{error ? errText(error) : t("loading")}</div></section>;
  }

  const W = 20, H = 150, top = 8;
  const max = Math.max(1, ...r.days.flatMap((d) => [d.income, d.expenses]));
  const width = r.days.length * W + 10;
  const best = r.days.reduce<{ day: number; v: number } | null>(
    (b, d) => (d.income > (b?.v ?? 0) ? { day: d.day, v: d.income } : b), null);

  const bars = (items: Share[], empty: MessageKey, label: (k: string) => string, inbars = false) => (
    <ul className={"bars" + (inbars ? " inbars" : "")}>
      {items.length === 0 && <li className="muted">{t(empty)}</li>}
      {items.map((s) => (
        <li key={s.key}>
          <div className="lbl"><span>{label(s.key)}</span><span className="num">{fmtMoney(s.amount, cur)}{"  "}({s.percent}%)</span></div>
          <div className="track"><div className="fill" style={{ width: s.percent + "%" }} /></div>
        </li>
      ))}
    </ul>
  );

  return (
    <section>
      <MonthNav />
      <Tally items={[
        [t("income"), r.totals.income, "in-c"],
        [t("expenses"), r.totals.expenses, "out-c"],
        [t("net"), r.totals.net, r.totals.net < 0 ? "out-c" : ""],
      ]} />

      <h2>{t("rep.daily")}</h2>
      <div className="legend">
        <span><i style={{ background: "var(--in)" }} />{t("income")}</span>
        <span><i style={{ background: "var(--out)" }} />{t("expenses")}</span>
      </div>
      <div className="chart" ref={chartRef}>
        <svg viewBox={`0 0 ${width} ${H + 24}`} role="img" aria-label={t("rep.chartAria")}>
          <line className="ax" x1={0} x2={width} y1={H + top} y2={H + top} />
          {r.days.map((d, i) => {
            const x = 5 + i * W;
            const hi = Math.round((d.income / max) * H);
            const ho = Math.round((d.expenses / max) * H);
            return (
              <g key={d.day}>
                {hi > 0 && <rect className="bi" x={x + 2} y={H + top - hi} width={7} height={hi} rx={1.5} />}
                {ho > 0 && <rect className="bo" x={x + 10} y={H + top - ho} width={7} height={ho} rx={1.5} />}
                {(i === 0 || (i + 1) % 5 === 0) && <text x={x + W / 2} y={H + top + 14} textAnchor="middle">{d.day}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="muted small">
        {best
          ? t("rep.best", { day: dayLabel(lang, t, `${viewMonth}-${String(best.day).padStart(2, "0")}`, today, true), amt: fmtMoney(best.v, cur) })
          : t("rep.noIncomeYet")}
      </p>

      <h2>{t("rep.went")}</h2>
      {bars(r.expenseByCategory, "rep.noExp", (k) => catName(lang, k))}
      <h2>{t("rep.came")}</h2>
      {bars(r.incomeByCategory, "rep.noInc", (k) => catName(lang, k), true)}
      <h2>{t("rep.how")}</h2>
      {bars(r.incomeByPayMethod, "rep.noInc", (k) => payName(lang, k), true)}
    </section>
  );
}
