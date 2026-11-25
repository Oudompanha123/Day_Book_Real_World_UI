"use client";

import type { Entry } from "@/lib/api";
import { fmtMoney, monthLabel, shiftMonth } from "@/lib/format";
import { catName, payName } from "@/lib/i18n";
import { dayLabel, metaSep } from "@/lib/ledger";
import { useLang } from "./Providers";
import { useSession } from "./Session";

export function Tally({ items }: { items: [label: string, value: number, cls: string][] }) {
  const { me } = useSession();
  return (
    <div className="tally">
      {items.map(([label, value, cls]) => (
        <div key={label}>
          <span>{label}</span>
          <strong className={cls}>{fmtMoney(value, me.currency)}</strong>
        </div>
      ))}
    </div>
  );
}

export function EntryTally({ s }: { s: { in: number; out: number; net: number } }) {
  const { t } = useLang();
  return (
    <Tally items={[
      [t("income"), s.in, "in-c"],
      [t("expenses"), s.out, "out-c"],
      [t("net"), s.net, s.net < 0 ? "out-c" : ""],
    ]} />
  );
}

export function EntryRow({ e, showDate, flash, onDelete }: {
  e: Entry; showDate?: boolean; flash?: boolean; onDelete: () => void;
}) {
  const { t, lang } = useLang();
  const { me, today } = useSession();
  const cat = catName(lang, e.category);
  const meta = [cat, payName(lang, e.payMethod)];
  if (showDate) meta.unshift(dayLabel(lang, t, e.date, today));
  const money = fmtMoney(e.amount, me.currency);
  return (
    <li className={flash ? "flash" : undefined}>
      <div className="what">
        <b>{e.note || cat}</b>
        <small>{meta.join(metaSep(lang))}</small>
      </div>
      <div className={"money " + (e.kind === "IN" ? "in-c" : "out-c")}>{(e.kind === "IN" ? "+" : "−") + money}</div>
      <button type="button" className="x" aria-label={t("aria.delete", { what: e.note || cat, amt: money })} onClick={onDelete}>×</button>
    </li>
  );
}

export function MonthNav() {
  const { t, lang } = useLang();
  const { viewMonth, setViewMonth, today } = useSession();
  const current = today.slice(0, 7);
  function step(n: number) {
    const next = shiftMonth(viewMonth, n);
    if (next <= current) setViewMonth(next);
  }
  return (
    <div className="monthnav">
      <button type="button" aria-label={t("aria.prev")} onClick={() => step(-1)}>‹</button>
      <h2>{monthLabel(lang, viewMonth)}</h2>
      <button type="button" aria-label={t("aria.next")} onClick={() => step(1)} disabled={viewMonth >= current}>›</button>
    </div>
  );
}
