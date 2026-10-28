import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import Chip from "@/components/Chip";
import SubmitButton from "@/components/SubmitButton";
import { isAdmin } from "@/lib/auth";
import { COLORS, getAll, withRates } from "@/lib/data";
import { balances, fmt, round2, settle, toSgd } from "@/lib/money";
import { markPaid, savePerson } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [all, admin] = await Promise.all([getAll(), isAdmin()]);
  const ids = all.people.map((p) => p.id);
  const person = new Map(all.people.map((p) => [p.id, p]));
  const bal = balances(ids, withRates(all), all.payments);
  const transfers = settle(bal, ids);

  const trips = all.trips.map((t) => {
    const list = all.expenses.filter((e) => e.trip_id === t.id);
    const total = list.reduce((sum, e) => sum + toSgd(e.amount, e.currency, t.rate), 0);
    return { ...t, count: list.length, total };
  });

  return (
    <>
      <section className="card">
        <h2>Settle up</h2>
        {transfers.length === 0 ? (
          <p className="muted">All settled. Nobody owes anything.</p>
        ) : (
          <ul className="settle">
            {transfers.map((t) => {
              const from = person.get(t.from);
              const to = person.get(t.to);
              return (
                <li key={`${t.from}-${t.to}`}>
                  <span className="settle-line">
                    <Chip name={from?.name ?? t.from} color={from?.color ?? "blue"} />
                    <span className="muted">pays</span>
                    <Chip name={to?.name ?? t.to} color={to?.color ?? "blue"} />
                  </span>
                  <span className="settle-amount num">{fmt(t.amount)}</span>
                  {admin && (
                    <form action={markPaid} className="settle-action">
                      <input type="hidden" name="from_person" value={t.from} />
                      <input type="hidden" name="to_person" value={t.to} />
                      <input type="hidden" name="amount" value={t.amount.toFixed(2)} />
                      <SubmitButton className="btn btn-sm" pendingText="Saving...">
                        Mark paid
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="fine">Amounts in SGD.</p>
      </section>

      <section className="card">
        <h2>Balances</h2>
        <ul className="balances">
          {all.people.map((p) => {
            const b = round2(bal[p.id] ?? 0);
            return (
              <li key={p.id}>
                <Chip name={p.name} color={p.color} />
                <span className={b < 0 ? "bal bal-owes" : "bal"}>
                  {Math.abs(b) < 0.01 ? "Settled" : b > 0 ? `Gets back ${fmt(b)}` : `Owes ${fmt(-b)}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Trips</h2>
          {admin && (
            <Link href="/trips/new" className="btn btn-sm">
              New trip
            </Link>
          )}
        </div>
        {trips.length === 0 ? (
          <p className="muted">No trips yet.</p>
        ) : (
          <ul className="trips">
            {trips.map((t) => (
              <li key={t.id}>
                <Link href={`/trips/${t.id}`}>
                  <span className="trip-name">{t.name}</span>
                  <span className="muted">
                    {t.count} {t.count === 1 ? "item" : "items"}
                  </span>
                  <span className="num trip-total">{fmt(t.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {admin && (
        <section className="card">
          <h2>People</h2>
          <div className="people">
            {all.people.map((p) => (
              <ActionForm key={p.id} action={savePerson} className="person-row">
                <input type="hidden" name="id" value={p.id} />
                <input name="name" defaultValue={p.name} aria-label="Name" required />
                <ColorSelect value={p.color} />
                <SubmitButton className="btn btn-sm">Save</SubmitButton>
              </ActionForm>
            ))}
            <ActionForm action={savePerson} className="person-row">
              <input name="name" placeholder="New person" aria-label="New person's name" required />
              <ColorSelect value={COLORS.find((c) => !all.people.some((p) => p.color === c)) ?? "teal"} />
              <SubmitButton className="btn btn-sm">Add</SubmitButton>
            </ActionForm>
          </div>
        </section>
      )}
    </>
  );
}

function ColorSelect({ value }: { value: string }) {
  return (
    <select name="color" defaultValue={value} aria-label="Color">
      {COLORS.map((c) => (
        <option key={c} value={c}>
          {c[0].toUpperCase() + c.slice(1)}
        </option>
      ))}
    </select>
  );
}
