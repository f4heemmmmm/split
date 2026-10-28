import Link from "next/link";

export default function NotFound() {
  return (
    <section className="card narrow">
      <h1>Not found</h1>
      <p className="muted">That page doesn&apos;t exist.</p>
      <Link href="/" className="btn">
        Back to trips
      </Link>
    </section>
  );
}
