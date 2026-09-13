"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        return;
      }
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-[fadeUp_0.45s_ease-out]">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">DataPulse</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Вход в админку
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Доступ только для авторизованных администраторов
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border border-[var(--line)] bg-[var(--surface)]/90 p-6 shadow-[0_20px_60px_-40px_rgba(19,32,51,0.55)] backdrop-blur"
        >
          <label className="block text-sm text-[var(--muted)]">
            Логин
            <input
              autoComplete="username"
              className="mt-1.5 w-full border border-[var(--line)] bg-white px-3 py-2.5 outline-none transition focus:border-[var(--accent)]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm text-[var(--muted)]">
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1.5 w-full border border-[var(--line)] bg-white px-3 py-2.5 outline-none transition focus:border-[var(--accent)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? (
            <p className="mt-4 border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-[var(--accent)] px-4 py-2.5 font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Проверка…" : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}
