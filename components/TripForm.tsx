import Link from "next/link";
import { saveTrip } from "@/app/actions";
import type { Trip } from "@/lib/data";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";

export default function TripForm({ trip }: { trip?: Trip }) {
  return (
    <ActionForm action={saveTrip} className="form">
      {trip && <input type="hidden" name="id" value={trip.id} />}
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={trip?.name} required autoComplete="off" placeholder="Trip 5" />
      </label>
      <label className="field">
        <span>MYR per 1 SGD</span>
        <input
          name="rate"
          type="number"
          inputMode="decimal"
          step="0.0001"
          min="0.0001"
          defaultValue={trip?.rate ?? 3.1}
          required
        />
        <small className="hint">Only used to convert MYR amounts. Not shown on public pages.</small>
      </label>
      <div className="actions">
        <SubmitButton>{trip ? "Save trip" : "Create trip"}</SubmitButton>
        <Link href={trip ? `/trips/${trip.id}` : "/"} className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </ActionForm>
  );
}
