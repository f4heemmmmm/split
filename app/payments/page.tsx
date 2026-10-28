import ActionForm from "@/components/ActionForm";
import Chip from "@/components/Chip";
import ConfirmButton from "@/components/ConfirmButton";
import SubmitButton from "@/components/SubmitButton";
import { isAdmin } from "@/lib/auth";
import { getAll, todaySg } from "@/lib/data";
import { fmt } from "@/lib/money";
import { deletePayment, savePayment } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function PaymentsPage() {
  const [all, admin] = await Promise.all([getAll(), isAdmin()]);
  const person = new Map(all.people.map((p) => [p.id, p]));

  return (
    <>
      <h1>Payments</h1>

      {admin && (
        <section className="card">
          <h2>Record a payment</h2>
          <ActionForm action={savePayment} className="form">
            <div className="row-2">
              <label className="field">
                <span>From</span>
                <select name="from_person" required defaultValue="">
                  <option value="" disabled>
                    Who paid
                  </option>
                  {all.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>To</span>
                <select name="to_person" required defaultValue="">
                  <option value="" disabled>
                    Who received
                  </option>
                  {all.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row-2">
              <label className="field">
                <span>Amount (SGD)</span>
                <input name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required />
              </label>
              <label className="field">
                <span>Date</span>
                <input name="paid_on" type="date" defaultValue={todaySg()} required />
              </label>
            </div>
            <label className="field">
              <span>Note (optional)</span>
              <input name="note" autoComplete="off" placeholder="PayNow" />
            </label>
            <div className="actions">
              <SubmitButton>Record payment</SubmitButton>
            </div>
          </ActionForm>
        </section>
      )}

      <section className="card">
        {all.payments.length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <ul className="payments">
            {all.payments.map((pay) => {
              const from = person.get(pay.from_person);
              const to = person.get(pay.to_person);
              return (
                <li key={pay.id}>
                  <div className="pay-main">
                    <span className="settle-line">
                      <Chip name={from?.name ?? pay.from_person} color={from?.color ?? "blue"} />
                      <span className="muted">paid</span>
                      <Chip name={to?.name ?? pay.to_person} color={to?.color ?? "blue"} />
                    </span>
                    <span className="num settle-amount">{fmt(pay.amount)}</span>
                  </div>
                  <div className="pay-meta">
                    <span className="muted">
                      {formatDate(pay.paid_on)}
                      {pay.note ? ` · ${pay.note}` : ""}
                    </span>
                    {admin && (
                      <ConfirmButton action={deletePayment} fields={{ id: pay.id }} small confirmText="Delete?" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="fine">Amounts in SGD.</p>
      </section>
    </>
  );
}
