import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import Link from "next/link";
import { logout } from "./actions";
import { isAdmin } from "@/lib/auth";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: { default: "Split", template: "%s · Split" },
  description: "Who owes whom from our trips.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        <header className="site-header">
          <div className="wrap header-inner">
            <Link href="/" className="brand">
              Split
            </Link>
            <nav className="nav">
              <Link href="/">Trips</Link>
              <Link href="/payments">Payments</Link>
              {admin ? (
                <form action={logout}>
                  <button type="submit" className="nav-button">
                    Sign out
                  </button>
                </form>
              ) : (
                <Link href="/login">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="wrap main">{children}</main>
      </body>
    </html>
  );
}
