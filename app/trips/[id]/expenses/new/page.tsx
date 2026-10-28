import { notFound, redirect } from "next/navigation";
import { saveExpense } from "@/app/actions";
import ExpenseForm from "@/components/ExpenseForm";
import { isAdmin } from "@/lib/auth";
import { getAll } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add expense" };

export default async function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isAdmin())) redirect("/login");
  const all = await getAll();
  const trip = all.trips.find((t) => t.id === Number(id));
  if (!trip) notFound();

  return (
    <section className="card narrow">
      <h1>Add expense</h1>
      <ExpenseForm action={saveExpense} trips={all.trips} people={all.people} tripId={trip.id} />
    </section>
  );
}
