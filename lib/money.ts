// Pure money logic. Safe to import on the server and in client components.

export type Currency = "SGD" | "MYR";
export type SplitType = "equal" | "custom";

export type MoneyExpense = {
  paid_by: string;
  amount: number;
  currency: Currency;
  split_type: SplitType;
  participants: string[];
  shares: Record<string, number>;
};

export type MoneyPayment = {
  from_person: string;
  to_person: string;
  amount: number;
};

export type Transfer = { from: string; to: string; amount: number };

// Half up to 2dp. The nudge stops 9.295 from showing as 9.29.
export function round2(x: number): number {
  return Math.round((x + Math.sign(x) * 1e-9) * 100) / 100;
}

export function fmt(x: number): string {
  return round2(x).toFixed(2);
}

// rate is MYR per 1 SGD
export function toSgd(amount: number, currency: Currency, rate: number): number {
  return currency === "MYR" ? amount / rate : amount;
}

// Each person's share of one expense, in SGD, at full precision.
export function shares(e: MoneyExpense, rate: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (e.split_type === "equal") {
    const n = e.participants.length;
    if (n === 0) return out;
    const each = toSgd(e.amount, e.currency, rate) / n;
    for (const p of e.participants) out[p] = each;
  } else {
    for (const [p, v] of Object.entries(e.shares)) {
      if (v) out[p] = toSgd(v, e.currency, rate);
    }
  }
  return out;
}

// Positive means the person gets money back.
export function balances(
  personIds: string[],
  expenses: (MoneyExpense & { rate: number })[],
  payments: MoneyPayment[],
): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const id of personIds) bal[id] = 0;
  for (const e of expenses) {
    bal[e.paid_by] = (bal[e.paid_by] ?? 0) + toSgd(e.amount, e.currency, e.rate);
    for (const [p, v] of Object.entries(shares(e, e.rate))) {
      bal[p] = (bal[p] ?? 0) - v;
    }
  }
  for (const pay of payments) {
    bal[pay.from_person] = (bal[pay.from_person] ?? 0) + pay.amount;
    bal[pay.to_person] = (bal[pay.to_person] ?? 0) - pay.amount;
  }
  return bal;
}

// Greedy: biggest debtor pays biggest creditor until everyone is within 1 cent.
export function settle(bal: Record<string, number>, order: string[] = Object.keys(bal)): Transfer[] {
  const cents = new Map<string, number>();
  for (const id of order) cents.set(id, Math.round(round2(bal[id] ?? 0) * 100));
  const out: Transfer[] = [];
  for (let guard = 0; guard < 1000; guard++) {
    let debtor = "";
    let creditor = "";
    for (const [id, c] of cents) {
      if (c < 0 && (!debtor || c < cents.get(debtor)!)) debtor = id;
      if (c > 0 && (!creditor || c > cents.get(creditor)!)) creditor = id;
    }
    if (!debtor || !creditor) break;
    const owe = -cents.get(debtor)!;
    const due = cents.get(creditor)!;
    if (owe <= 1 || due <= 1) break;
    const amt = Math.min(owe, due);
    out.push({ from: debtor, to: creditor, amount: amt / 100 });
    cents.set(debtor, cents.get(debtor)! + amt);
    cents.set(creditor, due - amt);
  }
  return out;
}
