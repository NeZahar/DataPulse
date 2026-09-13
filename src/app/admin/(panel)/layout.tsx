import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { LogoutButton } from "@/components/admin/LogoutButton";

const nav = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/accounts", label: "Аккаунты" },
  { href: "/admin/logs", label: "Логи" },
];

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/admin/login");
  if (!session.csrfToken) redirect("/admin/login");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent)]">DataPulse</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Админ-панель</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Сессия: {session.username}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-sm transition hover:bg-[var(--accent-soft)]"
            >
              {item.label}
            </Link>
          ))}
          <LogoutButton csrfToken={session.csrfToken} />
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
