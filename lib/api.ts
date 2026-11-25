// Typed client for the Spring Boot API. Requests go to /api/*, which Next.js proxies
// to the backend (see next.config.ts), so the login cookie stays first-party.

import type { Lang } from "./i18n";

export type Kind = "IN" | "OUT";

export interface Me { email: string; businessName: string; currency: string; language: Lang }

export interface Entry {
  id: number; kind: Kind; amount: number; note: string; category: string;
  payMethod: string; date: string; createdAt: string;
}
export interface NewEntry { kind: Kind; amount: number; note: string; category: string; payMethod: string; date: string }

export interface Payment { id: number; amount: number; paidOn: string; entryId: number | null; createdAt: string }
export interface Loan {
  id: number; direction: Kind; name: string; amount: number; note: string;
  lentOn: string; dueOn: string | null; paid: boolean; paidAt: string | null; createdAt: string;
  paidSoFar: number; remaining: number; payments: Payment[];
}
export interface LoanInput { direction: Kind; name: string; amount: number; note: string; lentOn: string; dueOn: string | null }
export interface PaymentInput { amount: number; paidOn: string; countAsEntry: boolean; entryNote: string }

export interface Share { key: string; amount: number; percent: number }
export interface MonthlyReport {
  month: string;
  totals: { income: number; expenses: number; net: number };
  days: { day: number; income: number; expenses: number }[];
  expenseByCategory: Share[];
  incomeByCategory: Share[];
  incomeByPayMethod: Share[];
}

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized?.();
    if (res.status >= 502 && res.status <= 504) throw new ApiError(res.status, "network");
    throw new ApiError(res.status, (data && typeof data.error === "string" && data.error) || "error");
  }
  return data as T;
}

export const api = {
  me: () => request<Me>("GET", "/me"),
  register: (email: string, password: string, language: Lang) =>
    request<Me>("POST", "/auth/register", { email, password, language }),
  login: (email: string, password: string) => request<Me>("POST", "/auth/login", { email, password }),
  logout: () => request<void>("POST", "/auth/logout"),
  saveSettings: (s: Omit<Me, "email">) => request<Me>("PUT", "/me/settings", s),
  eraseData: () => request<Me>("DELETE", "/me/data"),

  entries: (month?: string) => request<Entry[]>("GET", "/entries" + (month ? `?month=${month}` : "")),
  addEntry: (e: NewEntry) => request<Entry>("POST", "/entries", e),
  deleteEntry: (id: number) => request<void>("DELETE", `/entries/${id}`),

  report: (month: string) => request<MonthlyReport>("GET", `/reports/monthly?month=${month}`),

  loans: () => request<Loan[]>("GET", "/loans"),
  loan: (id: number) => request<Loan>("GET", `/loans/${id}`),
  addLoan: (l: LoanInput) => request<Loan>("POST", "/loans", l),
  updateLoan: (id: number, l: LoanInput) => request<Loan>("PUT", `/loans/${id}`, l),
  deleteLoan: (id: number) => request<void>("DELETE", `/loans/${id}`),
  addPayment: (id: number, p: PaymentInput) => request<Loan>("POST", `/loans/${id}/payments`, p),
  deletePayment: (loanId: number, paymentId: number) => request<Loan>("DELETE", `/loans/${loanId}/payments/${paymentId}`),
};
