"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/actions";

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
};

// A form wired to a server action that returns { error } or { ok }.
export default function ActionForm({ action, children, className }: Props) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="msg msg-error" role="alert">{state.error}</p>}
      {state?.ok && <p className="msg msg-ok" role="status">{state.ok}</p>}
    </form>
  );
}
