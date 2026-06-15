import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getSolicitudById } from "@/modules/solicitudes/services/solicitudService";
import { SolicitudDetailView } from "@/modules/solicitudes/components/SolicitudDetailView";
import { isAdmin } from "@/lib/auth/permissions";

export default async function SolicitudDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return <div className="p-6">No autorizado. Iniciá sesión.</div>;
  }

  const { id } = await params;
  const solicitud = await getSolicitudById(id);
  if (!solicitud) notFound();

  const admin = isAdmin(session.user.roles);

  return (
    <SolicitudDetailView
      solicitud={solicitud as any}
      currentUser={{
        id: session.user.id,
        role: admin ? "admin" : "trabajador",
      }}
    />
  );
}
