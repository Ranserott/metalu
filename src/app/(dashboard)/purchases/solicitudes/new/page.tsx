import { SolicitudForm } from "@/modules/solicitudes/components/SolicitudForm";

export default async function NewSolicitudPage({
  searchParams,
}: {
  searchParams: Promise<{ workOrderId?: string }>;
}) {
  const { workOrderId } = await searchParams;
  return <SolicitudForm initialWorkOrderId={workOrderId} />;
}
