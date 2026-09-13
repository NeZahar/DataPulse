"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="ml-2 border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
    >
      {loading ? "…" : "Выйти"}
    </button>
  );
}
