"use client";

import { useState } from "react";
import { EntryRow, EntryTally, MonthNav } from "@/components/Ledger";
import { useErrorText, useLang, useToast } from "@/components/Providers";
import { useSession } from "@/components/Session";
import { api, type Entry } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { catName, payName } from "@/lib/i18n";
import { dayLabel, sums } from "@/lib/ledger";
import { useData } from "@/lib/useData";

export default function HistoryPage() {
  const { t, lang } = useLang();
  const { me, version, bump, viewMonth, today } = useSession();
  const toast = useToast();
  const errText = useErrorText();
  const [q, setQ] = useState("");
  const { data } = useData(() => api.entries(viewMonth), [viewMonth, version]);

  const query = q.trim().toLowerCase();
  // Search matches the note and the category/pay method in either language.
  const list = (data ?? []).filter((e) => !query ||
    [e.note, e.category, e.payMethod, catName(lang, e.category), payName(lang, e.payMethod)]
      .join(" ").toLowerCase().includes(query));

  const groups = new Map<string, Entry[]>();
  for (const e of list) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date)!.push(e);
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

  return (
    <section>
      <MonthNav />
      <input className="field" type="search" placeholder={t("ph.search")} aria-label={t("search")}
        value={q} onChange={(e) => setQ(e.target.value)} />
      <EntryTally s={sums(list)} />
      {data && list.length === 0 && (
        <div className="empty" style={{ marginTop: 14 }}>{t(query ? "hist.noMatch" : "hist.empty")}</div>
      )}
      {[...groups.entries()].map(([d, items]) => (
        <div key={d}>
          <div className="dayhead">
            {dayLabel(lang, t, d, today, true)}
            <span className="num">{t("netAmt", { amt: fmtMoney(sums(items).net, me.currency) })}</span>
          </div>
          <ul className="ledger">
            {items.map((e) => <EntryRow key={e.id} e={e} onDelete={() => remove(e)} />)}
          </ul>
        </div>
      ))}
    </section>
  );
}
