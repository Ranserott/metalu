import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAuditLogs } from "@/modules/audit-logs/services/auditLogService";
import { AuditLogTable } from "@/modules/audit-logs/components/AuditLogTable";

export default async function AuditLogsPage() {
  const auditLogs = await getAuditLogs();

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ScrollText}
        title="Auditoria"
        description="Registro de auditoria"
      />

      <AuditLogTable data={auditLogs} />
    </div>
  );
}