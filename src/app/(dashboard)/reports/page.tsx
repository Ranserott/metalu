import { getReports } from "@/modules/reports/services/reportService";
import { ReportTable } from "@/modules/reports/components/ReportTable";

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-gray-500">Modulo de reportes</p>
        </div>
      </div>

      <ReportTable data={reports} />
    </div>
  );
}