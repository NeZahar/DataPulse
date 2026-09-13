import Link from "next/link";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AccountsSearch } from "@/components/admin/AccountsSearch";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  const accounts = await prisma.account.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query } },
            { displayName: { contains: query } },
            { deviceId: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      connections: true,
      _count: { select: { logs: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Аккаунты</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Пользователи Pulse и их данные для подключения к 1С
          </p>
        </div>
        <AccountsSearch initialQuery={query} />
      </div>

      <div className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--bg)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Аккаунт</th>
              <th className="px-4 py-3 font-medium">1С</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Активность</th>
              <th className="px-4 py-3 font-medium">Логи</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[var(--muted)]">
                  Аккаунты не найдены
                </td>
              </tr>
            ) : (
              accounts.map((account) => {
                const primary = account.connections[0];
                return (
                  <tr key={account.id} className="hover:bg-[var(--accent-soft)]/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/accounts/${account.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {account.email}
                      </Link>
                      {account.displayName ? (
                        <p className="text-xs text-[var(--muted)]">{account.displayName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {primary ? (
                        <>
                          <div>{primary.serverUrl}</div>
                          <div className="text-[var(--muted)]">
                            {primary.username}
                            {primary.baseName ? ` · ${primary.baseName}` : ""}
                          </div>
                        </>
                      ) : (
                        <span className="text-[var(--muted)]">нет</span>
                      )}
                      {account.connections.length > 1 ? (
                        <div className="text-[var(--muted)]">
                          +{account.connections.length - 1} ещё
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {primary ? (
                        <StatusBadge status={primary.status} />
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                      {account.lastSeenAt
                        ? new Date(account.lastSeenAt).toLocaleString("ru-RU")
                        : "никогда"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{account._count.logs}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
