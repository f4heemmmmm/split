"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";

type Props = {
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string | number>;
  label?: string;
  confirmText?: string;
  confirmLabel?: string;
  small?: boolean;
};

// Two-step delete: first click asks, second click submits.
export default function ConfirmButton({
  action,
  fields,
  label = "Delete",
  confirmText = "Are you sure?",
  confirmLabel = "Yes, delete",
  small = false,
}: Props) {
  const [asking, setAsking] = useState(false);
  const size = small ? " btn-sm" : "";

  if (!asking) {
    return (
      <button type="button" className={`btn btn-danger-ghost${size}`} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="confirm">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <span className="confirm-text">{confirmText}</span>
      <SubmitButton className={`btn btn-danger${size}`} pendingText="Deleting...">
        {confirmLabel}
      </SubmitButton>
      <button type="button" className={`btn btn-ghost${size}`} onClick={() => setAsking(false)}>
        Cancel
      </button>
    </form>
  );
}
