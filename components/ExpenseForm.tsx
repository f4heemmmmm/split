"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { FormState } from "@/app/actions";
import type { Expense } from "@/lib/data";
import { fmt, round2, shares as shareOf, toSgd, type Currency, type SplitType } from "@/lib/money";
import SubmitButton from "./SubmitButton";

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  trips: { id: number; name: string; rate: number }[];
  people: { id: string; name: string; color: string }[];
  tripId: number;
  expense?: Expense;
};

export default function ExpenseForm({ action, trips, people, tripId: initialTrip, expense }: Props) {
  const [state, formAction] = useActionState(action, null);

  // Controlled, so React's form reset after an error doesn't wipe what was typed.
  const [item, setItem] = useState(expense?.item ?? "");
  const [isGrab, setIsGrab] = useState(expense?.is_grab ?? false);
  const [tripId, setTripId] = useState(expense?.trip_id ?? initialTrip);
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? people[0]?.id ?? "");
  const [currency, setCurrency] = useState<Currency>(expense?.currency ?? "MYR");
  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type ?? "equal");
  const [amount, setAmount] = useState(
    expense && expense.split_type === "equal" ? String(expense.amount) : "",
  );
  const [ticked, setTicked] = useState<string[]>(
    expense && expense.split_type === "equal" ? expense.participants : people.map((p) => p.id),
  );
  const [custom, setCustom] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const p of people) {
      const v = expense?.split_type === "custom" ? expense.shares[p.id] : undefined;
      out[p.id] = v ? String(v) : "";
    }
    return out;
  });

  const rate = trips.find((t) => t.id === tripId)?.rate ?? 1;

  const customTotal = round2(
    Object.values(custom).reduce((sum, v) => sum + (Number(v) > 0 ? Number(v) : 0), 0),
  );
  const total = splitType === "equal" ? Number(amount) || 0 : customTotal;

  const preview = useMemo(() => {
    const parsed: Record<string, number> = {};
    for (const [k, v] of Object.entries(custom)) if (Number(v) > 0) parsed[k] = Number(v);
    return shareOf(
      {
        paid_by: paidBy,
        amount: Number(amount) || 0,
        currency,
        split_type: splitType,
        participants: ticked,
        shares: parsed,
      },
      rate,
    );
  }, [paidBy, amount, currency, splitType, ticked, custom, rate]);

  function toggle(id: string) {
    setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  return (
    <form action={formAction} className="form">
      {expense && <input type="hidden" name="id" value={expense.id} />}

      <label className="field">
        <span>Item</span>
        <input name="item" value={item} onChange={(e) => setItem(e.target.value)} required autoComplete="off" placeholder="Grab To CIQ" />
      </label>

      <div className="row-2">
        <label className="field">
          <span>Trip</span>
          <select name="trip_id" value={tripId} onChange={(e) => setTripId(Number(e.target.value))}>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Paid by</span>
          <select name="paid_by" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="row-2">
        <fieldset className="field">
          <legend>Currency</legend>
          <div className="seg">
            {(["SGD", "MYR"] as const).map((c) => (
              <label key={c} className={currency === c ? "on" : ""}>
                <input type="radio" name="currency" value={c} checked={currency === c} onChange={() => setCurrency(c)} />
                {c}
              </label>
            ))}
          </div>
          <small className="hint">1 SGD = {rate} MYR for this trip</small>
        </fieldset>
        <fieldset className="field">
          <legend>Split</legend>
          <div className="seg">
            {(
              [
                ["equal", "Equally"],
                ["custom", "Custom"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className={splitType === v ? "on" : ""}>
                <input type="radio" name="split_type" value={v} checked={splitType === v} onChange={() => setSplitType(v)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="check">
        <input type="checkbox" name="is_grab" checked={isGrab} onChange={(e) => setIsGrab(e.target.checked)} />
        Grab ride
      </label>

      {splitType === "equal" ? (
        <>
          <label className="field">
            <span>Amount ({currency})</span>
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <fieldset className="field">
            <legend>Split between</legend>
            <div className="ticks">
              {people.map((p) => (
                <label key={p.id} className="check">
                  <input
                    type="checkbox"
                    name="participants"
                    value={p.id}
                    checked={ticked.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      ) : (
        <fieldset className="field">
          <legend>Amount per person ({currency})</legend>
          <div className="custom-grid">
            {people.map((p) => (
              <label key={p.id} className="field">
                <span>{p.name}</span>
                <input
                  name={`share_${p.id}`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={custom[p.id] ?? ""}
                  onChange={(e) => setCustom((c) => ({ ...c, [p.id]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <small className="hint">
            Total {fmt(customTotal)} {currency}
          </small>
        </fieldset>
      )}

      <div className="preview">
        <div className="preview-head">
          <span>Each owes (SGD)</span>
          <span>Total {fmt(toSgd(total, currency, rate))}</span>
        </div>
        <ul>
          {people.map((p) => (
            <li key={p.id} className={p.id === paidBy ? "dim" : ""}>
              <span>{p.name}</span>
              <span className="num">{preview[p.id] != null ? fmt(preview[p.id]) : ""}</span>
            </li>
          ))}
        </ul>
      </div>

      {state?.error && <p className="msg msg-error" role="alert">{state.error}</p>}

      <div className="actions">
        <SubmitButton>{expense ? "Save changes" : "Add expense"}</SubmitButton>
        <Link href={`/trips/${tripId}`} className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
