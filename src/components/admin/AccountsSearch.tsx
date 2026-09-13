"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AccountsSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/admin/accounts${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск по email / имени / device"
        className="min-w-[220px] border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
      />
      <button
        type="submit"
        className="bg-[var(--accent)] px-3 py-2 text-sm text-white hover:brightness-110"
      >
        Найти
      </button>
    </form>
  );
}
