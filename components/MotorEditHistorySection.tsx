import { parseMotorChangedFields, summarizeMotorChangedFields } from '@/lib/motor-edit-log';

type MotorEditHistoryEntry = {
  id: string;
  editedAt: Date | string;
  changedFields: unknown;
  user: {
    name: string | null;
  } | null;
};

type MotorEditHistorySectionProps = {
  editLogs: MotorEditHistoryEntry[];
};

function formatDateTime(value: Date | string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MotorEditHistorySection({ editLogs }: MotorEditHistorySectionProps) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <details data-testid="motor-edit-history" className="group">
        <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-[#121212] select-none">
          <span>Edit History</span>
          <span className="text-xs text-[#333333] group-open:rotate-180 transition-transform">▼</span>
        </summary>

        <div className="mt-4">
          {editLogs.length > 0 ? (
            <>
              <div className="space-y-3 md:hidden">
                {editLogs.map((entry) => {
                  const parsedChanges = parseMotorChangedFields(entry.changedFields);
                  const summaryLines = summarizeMotorChangedFields(parsedChanges);

                  return (
                    <div key={entry.id} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                      <div className="space-y-1 mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-[#333333]">Date/Time</p>
                        <p className="text-xs text-[#121212]">{formatDateTime(entry.editedAt)}</p>
                      </div>

                      <div className="space-y-1 mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-[#333333]">Changed By</p>
                        <p className="text-xs text-[#121212]">{entry.user?.name || 'Unknown User'}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-[#333333]">Changes</p>
                        {summaryLines.length > 0 ? (
                          <div className="space-y-1 text-xs text-[#333333]">
                            {summaryLines.map((line) => (
                              <p key={`${entry.id}-${line}`} className="leading-relaxed break-words">
                                {line}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#333333]">No tracked field changes.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block w-full min-w-0 max-w-full overflow-x-auto">
                <table className="w-full min-w-[720px] text-xs">
                  <thead>
                    <tr className="text-[#333333] border-b border-[var(--border)]">
                      <th className="text-left py-2 pr-4 font-medium">Date/Time</th>
                      <th className="text-left py-2 pr-4 font-medium">Changed By</th>
                      <th className="text-left py-2 font-medium">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editLogs.map((entry) => {
                      const parsedChanges = parseMotorChangedFields(entry.changedFields);
                      const summaryLines = summarizeMotorChangedFields(parsedChanges);

                      return (
                        <tr key={entry.id} className="border-b border-[var(--border)] last:border-0 align-top">
                          <td className="py-2 pr-4 text-[#333333] whitespace-nowrap">
                            {formatDateTime(entry.editedAt)}
                          </td>
                          <td className="py-2 pr-4 text-[#333333] whitespace-nowrap">
                            {entry.user?.name || 'Unknown User'}
                          </td>
                          <td className="py-2 text-[#333333]">
                            {summaryLines.length > 0 ? (
                              <div className="space-y-1">
                                {summaryLines.map((line) => (
                                  <p key={`${entry.id}-${line}`} className="leading-relaxed break-words">
                                    {line}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p>No tracked field changes.</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#333333] text-center py-6">No edit history yet</p>
          )}
        </div>
      </details>
    </div>
  );
}
