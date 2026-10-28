"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="card narrow">
      <h1>Something went wrong</h1>
      <p className="muted">{error.message || "The page could not load."}</p>
      <button type="button" className="btn" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
