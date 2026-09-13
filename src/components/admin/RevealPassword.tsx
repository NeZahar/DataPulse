"use client";

import { useState } from "react";

export function RevealPassword({
  connectionId,
  masked,
  csrfToken,
}: {
  connectionId: string;
  masked: string;
  csrfToken: string;
}) {
  const [value, setValue] = useState(masked);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (revealed) {
      setValue(masked);
      setRevealed(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/connections/${connectionId}/reveal`, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось показать пароль");
        return;
      }
      setValue(data.password);
      setRevealed(true);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-sm">{value}</span>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        {loading ? "…" : revealed ? "Скрыть" : "Показать"}
      </button>
      {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
    </div>
  );
}
