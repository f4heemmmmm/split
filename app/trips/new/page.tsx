import { redirect } from "next/navigation";
import TripForm from "@/components/TripForm";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "New trip" };

export default async function NewTripPage() {
  if (!(await isAdmin())) redirect("/login");
  return (
    <section className="card narrow">
      <h1>New trip</h1>
      <TripForm />
    </section>
  );
}
