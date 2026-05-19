import { getAuditLogs } from "@/modules/audit-logs/services/auditLogService";
import { AuditLogTable } from "@/modules/audit-logs/components/AuditLogTable";

export default async function AuditLogsPage() {
  const auditLogs = await getAuditLogs();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Auditoria</h1>
          <p className="text-sm text-gray-500">Registro de auditoria</p>
        </div>
      </div>

      <AuditLogTable data={auditLogs} />
    </div>
  );
}