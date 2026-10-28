import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/Chip";
import { isAdmin } from "@/lib/auth";
import { getAll, tripExpenses } from "@/lib/data";
import { fmt, shares, toSgd } from "@/lib/money";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const all = await getAll();
  return { title: all.trips.find((t) => t.id === Number(id))?.name ?? "Trip" };
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const [all, admin] = await Promise.all([getAll(), isAdmin()]);
  const trip = all.trips.find((t) => t.id === Number(id));
  if (!trip) notFound();

  const person = new Map(all.people.map((p) => [p.id, p]));
  const rows = tripExpenses(all, trip.id).map((e) => ({
    e,
    total: toSgd(e.amount, e.currency, trip.rate),
    share: shares(e, trip.rate),
  }));

  const personTotals: Record<string, number> = {};
  for (const r of rows) {
    for (const [p, v] of Object.entries(r.share)) personTotals[p] = (personTotals[p] ?? 0) + v;
  }
  const tripTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/" className="back">
            ← Trips
          </Link>
          <h1>{trip.name}</h1>
        </div>
        {admin && (
          <div className="actions">
            <Link href={`/trips/${trip.id}/expenses/new`} className="btn btn-primary btn-sm">
              Add expense
            </Link>
            <Link href={`/trips/${trip.id}/edit`} className="btn btn-sm">
              Edit trip
            </Link>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="card muted">No expenses yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th rowSpan={2} className="col-item">
                  Item
                </th>
                <th rowSpan={2}>Paid by</th>
                <th rowSpan={2} className="num">
                  Total
                </th>
                <th colSpan={all.people.length} className="group">
                  Each owes
                </th>
                {admin && <th rowSpan={2} aria-label="Edit" />}
              </tr>
              <tr>
                {all.people.map((p) => (
                  <th key={p.id} className="num">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ e, total, share }) => {
                const payer = person.get(e.paid_by);
                return (
                  <tr key={e.id} className={e.is_grab ? "grab" : undefined}>
                    <td className="col-item">{e.item}</td>
                    <td>
                      <Chip name={payer?.name ?? e.paid_by} color={payer?.color ?? "blue"} />
                    </td>
                    <td className="num amount">{fmt(total)}</td>
                    {all.people.map((p) => (
                      <td key={p.id} className={p.id === e.paid_by ? "num dim" : "num"}>
                        {share[p.id] != null ? fmt(share[p.id]) : ""}
                      </td>
                    ))}
                    {admin && (
                      <td>
                        <Link href={`/expenses/${e.id}/edit`} className="edit-link">
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th className="col-item">Total</th>
                <td />
                <td className="num">{fmt(tripTotal)}</td>
                {all.people.map((p) => (
                  <td key={p.id} className="num">
                    {personTotals[p.id] != null ? fmt(personTotals[p.id]) : ""}
                  </td>
                ))}
                {admin && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="fine">Amounts in SGD. Your own share is dimmed when you paid. Grab rides are in green.</p>
    </>
  );
}
