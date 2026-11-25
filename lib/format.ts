import type { Lang } from "./i18n";

export const CURRENCIES: [code: string, name: string][] = [
  ["USD", "US dollar"], ["KHR", "Cambodian riel"], ["THB", "Thai baht"], ["VND", "Vietnamese dong"],
  ["LAK", "Lao kip"], ["MYR", "Malaysian ringgit"], ["SGD", "Singapore dollar"], ["IDR", "Indonesian rupiah"],
  ["PHP", "Philippine peso"], ["INR", "Indian rupee"], ["CNY", "Chinese yuan"], ["JPY", "Japanese yen"],
  ["KRW", "South Korean won"], ["AUD", "Australian dollar"], ["EUR", "Euro"], ["GBP", "British pound"],
  ["CAD", "Canadian dollar"], ["NGN", "Nigerian naira"], ["KES", "Kenyan shilling"], ["BRL", "Brazilian real"],
  ["MXN", "Mexican peso"],
];

const NO_DECIMALS = new Set(["KHR", "VND", "LAK", "IDR", "JPY", "KRW"]);

export function fmtMoney(n: number, cur: string): string {
  const z = NO_DECIMALS.has(cur) ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency: cur, currencyDisplay: "narrowSymbol",
      minimumFractionDigits: z, maximumFractionDigits: z,
    }).format(n);
  } catch {
    return `${cur} ${n.toFixed(z)}`;
  }
}

export function curSymbol(cur: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, { style: "currency", currency: cur, currencyDisplay: "narrowSymbol" }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? cur;
  } catch {
    return cur;
  }
}

export function currencyName(lang: Lang, code: string, fallback: string): string {
  if (lang !== "km") return fallback;
  try {
    const n = new Intl.DisplayNames(["km"], { type: "currency" }).of(code);
    if (n && n !== code) return n;
  } catch { /* older browsers */ }
  return fallback;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseAmt(s: string): number {
  const clean = String(s || "").replace(/[\s,]/g, "").replace(/[^\d.]/g, "");
  if (!clean) return NaN;
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : NaN;
}

/* ---------- dates (all as local YYYY-MM-DD strings) ---------- */
const pad = (n: number) => (n < 10 ? "0" : "") + n;
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => iso(new Date());
export const thisMonth = () => todayISO().slice(0, 7);
export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
}
export function yesterdayISO(): string {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return iso(y);
}
export function shiftMonth(ym: string, step: number): string {
  const d = parseISO(ym + "-01");
  d.setMonth(d.getMonth() + step);
  return iso(d).slice(0, 7);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 864e5);
}

const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const KM_DAYS = ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];

type DateOpts = { weekday?: "short" | "long"; day?: "numeric"; month?: "short" | "long"; year?: "numeric" };

/** Khmer dates are built by hand so they look the same on every phone, even without Khmer locale data. */
export function fmtDate(lang: Lang, d: Date, o: DateOpts): string {
  if (lang !== "km") return d.toLocaleDateString(undefined, o);
  const parts: string[] = [];
  if (o.weekday) parts.push((o.weekday === "long" ? "ថ្ងៃ" : "") + KM_DAYS[d.getDay()]);
  if (o.day) parts.push(String(d.getDate()));
  if (o.month) parts.push(KM_MONTHS[d.getMonth()]);
  if (o.year) parts.push(String(d.getFullYear()));
  return parts.join(" ");
}

export const shortDate = (lang: Lang, s: string) => fmtDate(lang, parseISO(s), { day: "numeric", month: "short" });
export const fullDate = (lang: Lang, s: string) =>
  fmtDate(lang, parseISO(s), { weekday: "short", day: "numeric", month: "long", year: "numeric" });
export const monthLabel = (lang: Lang, ym: string) => fmtDate(lang, parseISO(ym + "-01"), { month: "long", year: "numeric" });

/** Instant (ISO timestamp) → local YYYY-MM-DD */
export const instantToDate = (s: string) => iso(new Date(s));
