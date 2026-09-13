import { StatusBadge } from "@/components/admin/StatusBadge";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [accounts, connections, errorLogs, recentLogs, byStatus] = await Promise.all([
    prisma.account.count(),
    prisma.oneCConnection.count(),
    prisma.connectionLog.count({
      where: {
        level: "error",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.connectionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { account: { select: { id: true, email: true } } },
    }),
    prisma.oneCConnection.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">Обзор</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Состояние аккаунтов и подключений к 1С
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Аккаунты" value={accounts} href="/admin/accounts" />
          <Stat label="Подключения 1С" value={connections} href="/admin/accounts" />
          <Stat label="Ошибки за 24ч" value={errorLogs} href="/admin/logs" accent="danger" />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Статусы подключений</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {["connected", "degraded", "error", "disconnected", "unknown"].map((status) => (
            <div
              key={status}
              className="flex items-center gap-2 border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
            >
              <StatusBadge status={status} />
              <span className="font-mono text-sm">{statusMap[status] ?? 0}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Последние события</h2>
          <Link href="/admin/logs" className="text-sm text-[var(--accent)] hover:underline">
            Все логи
          </Link>
        </div>
        <div className="mt-3 overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
          {recentLogs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">Пока нет событий</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {recentLogs.map((log) => (
                <li key={log.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <StatusBadge status={log.level} kind="level" />
                    <span className="font-mono">
                      {new Date(log.createdAt).toLocaleString("ru-RU")}
                    </span>
                    <Link
                      href={`/admin/accounts/${log.account.id}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {log.account.email}
                    </Link>
                    <span className="font-mono text-[var(--ink)]">{log.event}</span>
                  </div>
                  <p className="mt-1 text-sm">{log.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  accent?: "danger";
}) {
  return (
    <Link
      href={href}
      className="border border-[var(--line)] bg-[var(--surface)] px-4 py-4 transition hover:border-[var(--accent)]"
    >
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p
        className={`mt-2 font-mono text-3xl font-semibold ${
          accent === "danger" && value > 0 ? "text-[var(--danger)]" : ""
        }`}
      >
        {value}
      </p>
    </Link>
  );
}
