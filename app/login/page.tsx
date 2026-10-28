import { redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";
import { isAdmin } from "@/lib/auth";
import { login } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/");
  return (
    <section className="card narrow">
      <h1>Sign in</h1>
      <p className="muted">Only needed to add or change things. Everyone can view without signing in.</p>
      <ActionForm action={login} className="form">
        <label className="field">
          <span>Passcode</span>
          <input name="passcode" type="password" autoComplete="current-password" required autoFocus />
        </label>
        <div className="actions">
          <SubmitButton pendingText="Checking...">Sign in</SubmitButton>
        </div>
      </ActionForm>
    </section>
  );
}
