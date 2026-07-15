import { auth } from "@/lib/auth/auth";
import { isAdmin, isSupervisor } from "./permissions";

export type GateResult =
  | { allowed: true }
  | { allowed: false; status: 401 | 403; error: string };

/**
 * Regla unificada: ¿puede el usuario actual mutar (PUT/DELETE/PATCH-status) un
 * registro del dominio (WorkOrder o Quotation) en el estado actual?
 *
 * - Admin: siempre.
 * - Supervisor: solo si status === "DRAFT".
 * - Resto: denegado. Los demás roles ya tienen sus reglas de CRUD contempladas
 *   en ROLE_PERMISSIONS; este helper aplica solo al gate de status del Supervisor.
 */
export async function canMutateRecord(currentStatus: string): Promise<GateResult> {
  const session = await auth();
  if (!session?.user) {
    return { allowed: false, status: 401, error: "Unauthorized" };
  }
  const roles = session.user.roles ?? [];
  if (isAdmin(roles)) return { allowed: true };
  if (isSupervisor(roles)) {
    return currentStatus === "DRAFT"
      ? { allowed: true }
      : {
          allowed: false,
          status: 403,
          error: "Solo podés modificar registros en estado Borrador",
        };
  }
  return { allowed: false, status: 403, error: "Sin permiso para modificar este registro" };
}

/**
 * Pre-procesa el payload de POST /api/work-orders para forzar `status = "DRAFT"`
 * cuando el caller es supervisor (ellos no pueden crear OTs en IN_PROGRESS).
 * Devuelve el payload saneado + userId listo para createWorkOrder().
 */
export async function prepareWorkOrderCreate(
  payload: { status?: string; [key: string]: any },
): Promise<
  | { ok: true; data: Record<string, any>; userId: string }
  | { ok: false; status: 401; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const roles = session.user.roles ?? [];
  const data =
    isSupervisor(roles) && payload.status !== "DRAFT"
      ? { ...payload, status: "DRAFT" }
      : payload;
  return { ok: true, data, userId: session.user.id };
}