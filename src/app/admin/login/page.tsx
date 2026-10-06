import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminAccess } from "@/lib/admin/session";
import { safeNextPath } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Sign in · Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const access = adminAccess();
  return (
    <main data-theme="light" className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-[360px]">
        <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-mute">WAHAU</p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]">Admin sign in</h1>
        {access === "ready" ? (
          <LoginForm next={safeNextPath(next)} />
        ) : (
          <div role="alert" className="mt-6 rounded-xl border border-line-soft bg-white px-5 py-4 text-[14px]">
            <p className="font-semibold">Admin access isn’t set up.</p>
            <p className="mt-1 text-ink-2">
              {access === "weak_password"
                ? "ADMIN_PASSWORD must be at least 12 characters."
                : "Set ADMIN_PASSWORD (at least 12 characters) in .env.local and restart the server."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
