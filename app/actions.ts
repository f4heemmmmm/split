"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPasscode, clearAdminCookie, isAdmin, setAdminCookie } from "@/lib/auth";
import { COLORS, todaySg, type Color } from "@/lib/data";
import { round2 } from "@/lib/money";
import { db } from "@/lib/supabase";

export type FormState = { error?: string; ok?: string } | null;

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}

function str(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

function num(fd: FormData, name: string): number {
  const s = str(fd, name);
  return s === "" ? NaN : Number(s);
}

// "grab to ciq" -> "Grab To Ciq". Leaves existing capitals alone, so "DTF" stays "DTF".
function titleCase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|[\s(/-])(\p{Ll})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

async function nextSortOrder(table: "expenses" | "trips" | "people"): Promise<number> {
  const { data } = await db()
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  return (data?.[0] ? Number(data[0].sort_order) : 0) + 1;
}

function done() {
  revalidatePath("/", "layout");
}

// Auth

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  if (!checkPasscode(str(fd, "passcode"))) return { error: "Wrong passcode." };
  await setAdminCookie();
  done();
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearAdminCookie();
  done();
  redirect("/");
}

// Expenses

export async function saveExpense(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();

  const id = num(fd, "id");
  const tripId = num(fd, "trip_id");
  const item = titleCase(str(fd, "item"));
  const paidBy = str(fd, "paid_by");
  const currency = str(fd, "currency");
  const splitType = str(fd, "split_type");
  const isGrab = fd.get("is_grab") === "on";

  if (!item) return { error: "Enter an item name." };
  if (!Number.isInteger(tripId)) return { error: "Pick a trip." };
  if (!paidBy) return { error: "Pick who paid." };
  if (currency !== "SGD" && currency !== "MYR") return { error: "Pick SGD or MYR." };

  let amount: number;
  let participants: string[] = [];
  const shares: Record<string, number> = {};

  if (splitType === "equal") {
    amount = round2(num(fd, "amount"));
    participants = fd.getAll("participants").map(String).filter(Boolean);
    if (!(amount > 0)) return { error: "Enter an amount above 0." };
    if (participants.length === 0) return { error: "Tick at least one person." };
  } else if (splitType === "custom") {
    for (const [key, value] of fd.entries()) {
      if (!key.startsWith("share_")) continue;
      const v = String(value).trim();
      if (v === "") continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return { error: "Custom amounts must be 0 or more." };
      if (n > 0) shares[key.slice("share_".length)] = round2(n);
    }
    amount = round2(Object.values(shares).reduce((a, b) => a + b, 0));
    if (!(amount > 0)) return { error: "Enter at least one custom amount." };
  } else {
    return { error: "Pick a split type." };
  }

  const row = {
    trip_id: tripId,
    item,
    paid_by: paidBy,
    amount,
    currency,
    split_type: splitType,
    participants,
    shares,
    is_grab: isGrab,
  };

  const { error } = Number.isInteger(id)
    ? await db().from("expenses").update(row).eq("id", id)
    : await db().from("expenses").insert({ ...row, sort_order: await nextSortOrder("expenses") });
  if (error) return { error: error.message };

  done();
  redirect(`/trips/${tripId}`);
}

export async function deleteExpense(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = num(fd, "id");
  const tripId = num(fd, "trip_id");
  const { error } = await db().from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  done();
  redirect(Number.isInteger(tripId) ? `/trips/${tripId}` : "/");
}

// Trips

export async function saveTrip(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();

  const id = num(fd, "id");
  const name = titleCase(str(fd, "name"));
  const rate = num(fd, "rate");

  if (!name) return { error: "Enter a trip name." };
  if (!(rate > 0)) return { error: "Enter a rate above 0." };

  let tripId = id;
  if (Number.isInteger(id)) {
    const { error } = await db().from("trips").update({ name, rate }).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await db()
      .from("trips")
      .insert({ name, rate, sort_order: await nextSortOrder("trips") })
      .select("id")
      .single();
    if (error) return { error: error.message };
    tripId = Number(data.id);
  }

  done();
  redirect(`/trips/${tripId}`);
}

export async function deleteTrip(fd: FormData): Promise<void> {
  await requireAdmin();
  const { error } = await db().from("trips").delete().eq("id", num(fd, "id"));
  if (error) throw new Error(error.message);
  done();
  redirect("/");
}

// Payments

async function insertPayment(
  from: string,
  to: string,
  amount: number,
  note: string,
  paidOn: string,
): Promise<string | null> {
  if (!from || !to) return "Pick who paid and who received.";
  if (from === to) return "Pick two different people.";
  if (!(amount > 0)) return "Enter an amount above 0.";
  const { error } = await db()
    .from("payments")
    .insert({ from_person: from, to_person: to, amount: round2(amount), note: note || null, paid_on: paidOn });
  return error ? error.message : null;
}

export async function savePayment(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "paid_on")) ? str(fd, "paid_on") : todaySg();
  const error = await insertPayment(str(fd, "from_person"), str(fd, "to_person"), num(fd, "amount"), str(fd, "note"), paidOn);
  if (error) return { error };
  done();
  return { ok: "Payment recorded." };
}

// Records one Settle up line exactly as shown.
export async function markPaid(fd: FormData): Promise<void> {
  await requireAdmin();
  const error = await insertPayment(str(fd, "from_person"), str(fd, "to_person"), num(fd, "amount"), "Settle up", todaySg());
  if (error) throw new Error(error);
  done();
}

export async function deletePayment(fd: FormData): Promise<void> {
  await requireAdmin();
  const { error } = await db().from("payments").delete().eq("id", num(fd, "id"));
  if (error) throw new Error(error.message);
  done();
}

// People

export async function savePerson(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();

  const id = str(fd, "id");
  const name = str(fd, "name").replace(/\s+/g, " ");
  const color = str(fd, "color") as Color;

  if (!name) return { error: "Enter a name." };
  if (!COLORS.includes(color)) return { error: "Pick a color." };

  if (id) {
    const { error } = await db().from("people").update({ name, color }).eq("id", id);
    if (error) return { error: error.message };
    done();
    return { ok: "Saved." };
  }

  const { data: existing, error: readError } = await db().from("people").select("id");
  if (readError) return { error: readError.message };
  const taken = new Set((existing ?? []).map((r) => String(r.id)));
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "") || "person";
  let newId = base;
  for (let i = 2; taken.has(newId); i++) newId = `${base}${i}`;

  const { error } = await db()
    .from("people")
    .insert({ id: newId, name, color, sort_order: await nextSortOrder("people") });
  if (error) return { error: error.message };
  done();
  return { ok: `Added ${name}.` };
}
