import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "split_admin";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function sha256(s: string): Buffer {
  return createHash("sha256").update(s).digest();
}

function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

// Changing the passcode changes the token, which signs everyone out.
function token(passcode: string): string {
  return createHmac("sha256", passcode).update("split-admin-v1").digest("hex");
}

export function checkPasscode(input: string): boolean {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) return false;
  return safeEqual(input, passcode);
}

export async function isAdmin(): Promise<boolean> {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, token(passcode));
}

export async function setAdminCookie(): Promise<void> {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) return;
  (await cookies()).set(COOKIE, token(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
