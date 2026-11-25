import type { Entry } from "./api";
import { round2, parseISO, yesterdayISO, fmtDate } from "./format";
import type { Lang } from "./i18n";

export function sums(list: Entry[]) {
  let inc = 0, out = 0;
  for (const e of list) {
    if (e.kind === "IN") inc += e.amount; else out += e.amount;
  }
  return { in: round2(inc), out: round2(out), net: round2(inc - out) };
}

/** "Today", "Yesterday", or a short/long date. */
export function dayLabel(lang: Lang, t: (k: "today" | "yesterday") => string, d: string, today: string, long = false) {
  if (d === today) return t("today");
  if (d === yesterdayISO()) return t("yesterday");
  return fmtDate(lang, parseISO(d), long
    ? { weekday: "long", day: "numeric", month: "long" }
    : { weekday: "short", day: "numeric", month: "short" });
}

export const metaSep = (lang: Lang) => (lang === "km" ? " · " : ", ");
