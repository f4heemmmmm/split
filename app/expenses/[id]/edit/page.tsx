import { notFound, redirect } from "next/navigation";
import { deleteExpense, saveExpense } from "@/app/actions";
import ConfirmButton from "@/components/ConfirmButton";
import ExpenseForm from "@/components/ExpenseForm";
import { isAdmin } from "@/lib/auth";
import { getAll } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit expense" };

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isAdmin())) redirect("/login");
  const all = await getAll();
  const expense = all.expenses.find((e) => e.id === Number(id));
  if (!expense) notFound();

  return (
    <section className="card narrow">
      <h1>Edit expense</h1>
      <ExpenseForm
        action={saveExpense}
        trips={all.trips}
        people={all.people}
        tripId={expense.trip_id}
        expense={expense}
      />
      <div className="danger-zone">
        <ConfirmButton
          action={deleteExpense}
          fields={{ id: expense.id, trip_id: expense.trip_id }}
          label="Delete expense"
          confirmText={`Delete ${expense.item}?`}
        />
      </div>
    </section>
  );
}
