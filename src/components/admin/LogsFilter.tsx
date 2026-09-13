"use client";

import { useRouter } from "next/navigation";

export function LogsFilter({
  level,
  accountId,
}: {
  level?: string;
  accountId?: string;
}) {
  const router = useRouter();

  function update(nextLevel: string) {
    const params = new URLSearchParams();
    if (nextLevel) params.set("level", nextLevel);
    if (accountId) params.set("accountId", accountId);
    router.push(`/admin/logs${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <select
      value={level || ""}
      onChange={(e) => update(e.target.value)}
      className="border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
    >
      <option value="">Все уровни</option>
      <option value="error">error</option>
      <option value="warn">warn</option>
      <option value="info">info</option>
      <option value="debug">debug</option>
    </select>
  );
}
