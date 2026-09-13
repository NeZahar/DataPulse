import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LogsFilter } from "@/components/admin/LogsFilter";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; accountId?: string }>;
}) {
  const { level, accountId } = await searchParams;

  const logs = await prisma.connectionLog.findMany({
    where: {
      ...(level ? { level } : {}),
      ...(accountId ? { accountId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      account: { select: { id: true, email: true } },
      connection: { select: { id: true, label: true, serverUrl: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Логи подключений</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            События синхронизации и состояния соединений с 1С
          </p>
        </div>
        <LogsFilter level={level} accountId={accountId} />
      </div>

      <div className="overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
        {logs.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--muted)]">Логи не найдены</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {logs.map((log) => (
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
                  {log.connection ? (
                    <span className="font-mono">
                      {log.connection.label || log.connection.serverUrl}
                    </span>
                  ) : null}
                  <span className="font-mono text-[var(--ink)]">{log.event}</span>
                </div>
                <p className="mt-1 text-sm">{log.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
