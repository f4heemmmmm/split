"use client";

import { useFormStatus } from "react-dom";

type Props = { children: React.ReactNode; className?: string; pendingText?: string };

export default function SubmitButton({ children, className = "btn btn-primary", pendingText = "Saving..." }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
