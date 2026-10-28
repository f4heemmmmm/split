import { notFound, redirect } from "next/navigation";
import { deleteTrip } from "@/app/actions";
import ConfirmButton from "@/components/ConfirmButton";
import TripForm from "@/components/TripForm";
import { isAdmin } from "@/lib/auth";
import { getAll } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit trip" };

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isAdmin())) redirect("/login");
  const all = await getAll();
  const trip = all.trips.find((t) => t.id === Number(id));
  if (!trip) notFound();
  const count = all.expenses.filter((e) => e.trip_id === trip.id).length;

  return (
    <section className="card narrow">
      <h1>Edit trip</h1>
      <TripForm trip={trip} />
      <div className="danger-zone">
        <ConfirmButton
          action={deleteTrip}
          fields={{ id: trip.id }}
          label="Delete trip"
          confirmText={`Delete ${trip.name} and its ${count} ${count === 1 ? "expense" : "expenses"}?`}
        />
      </div>
    </section>
  );
}
