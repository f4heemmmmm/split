import "server-only";
import { cache } from "react";
import { db } from "./supabase";
import type { Currency, SplitType } from "./money";

export type Color = "blue" | "orange" | "purple" | "gold" | "teal" | "pink";
export const COLORS: Color[] = ["blue", "orange", "purple", "gold", "teal", "pink"];

export type Person = { id: string; name: string; color: Color; sort_order: number };

export type Trip = { id: number; name: string; rate: number; sort_order: number };

export type Expense = {
  id: number;
  trip_id: number;
  item: string;
  paid_by: string;
  amount: number;
  currency: Currency;
  split_type: SplitType;
  participants: string[];
  shares: Record<string, number>;
  is_grab: boolean;
  sort_order: number;
};

export type Payment = {
  id: number;
  from_person: string;
  to_person: string;
  amount: number;
  note: string | null;
  paid_on: string;
};

export type AllData = {
  people: Person[];
  trips: Trip[];
  expenses: Expense[];
  payments: Payment[];
};

type Row = Record<string, unknown>;

function rows(res: { data: Row[] | null; error: { message: string } | null }, table: string): Row[] {
  if (res.error) throw new Error(`Could not load ${table}: ${res.error.message}`);
  return res.data ?? [];
}

// Cached per request, so a page and its metadata share one round trip.
export const getAll = cache(async function getAll(): Promise<AllData> {
  const s = db();
  const [p, t, e, pay] = await Promise.all([
    s.from("people").select("*").order("sort_order").order("id"),
    s.from("trips").select("*").order("sort_order").order("id"),
    s.from("expenses").select("*").order("sort_order").order("id"),
    s.from("payments").select("*").order("paid_on", { ascending: false }).order("id", { ascending: false }),
  ]);

  const people = rows(p, "people").map((r) => ({
    id: String(r.id),
    name: String(r.name),
    color: r.color as Color,
    sort_order: Number(r.sort_order),
  }));

  const trips = rows(t, "trips").map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    rate: Number(r.rate),
    sort_order: Number(r.sort_order),
  }));

  const expenses = rows(e, "expenses").map((r) => {
    const raw = (r.shares ?? {}) as Record<string, unknown>;
    const sh: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) sh[k] = Number(v);
    return {
      id: Number(r.id),
      trip_id: Number(r.trip_id),
      item: String(r.item),
      paid_by: String(r.paid_by),
      amount: Number(r.amount),
      currency: r.currency as Currency,
      split_type: r.split_type as SplitType,
      participants: ((r.participants ?? []) as unknown[]).map(String),
      shares: sh,
      is_grab: Boolean(r.is_grab),
      sort_order: Number(r.sort_order),
    };
  });

  const payments = rows(pay, "payments").map((r) => ({
    id: Number(r.id),
    from_person: String(r.from_person),
    to_person: String(r.to_person),
    amount: Number(r.amount),
    note: r.note == null ? null : String(r.note),
    paid_on: String(r.paid_on),
  }));

  return { people, trips, expenses, payments };
});

// Non-Grab items first, Grab rides at the bottom, each in sort order.
export function tripExpenses(all: AllData, tripId: number): Expense[] {
  const list = all.expenses.filter((e) => e.trip_id === tripId);
  return [...list.filter((e) => !e.is_grab), ...list.filter((e) => e.is_grab)];
}

export function withRates(all: AllData) {
  const rate = new Map(all.trips.map((t) => [t.id, t.rate]));
  return all.expenses.map((e) => ({ ...e, rate: rate.get(e.trip_id) ?? 1 }));
}

// Today's date in Singapore, as YYYY-MM-DD.
export function todaySg(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
}
