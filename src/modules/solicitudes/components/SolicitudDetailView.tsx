"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, X, CheckCircle2 } from "lucide-react";
import { SolicitudReviewForm } from "./SolicitudReviewForm";
import { RejectDialog, CancelDialog, ApproveDialog } from "./TransitionDialogs";
import type { SolicitudOrdenCompra } from "../types/solicitud";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SOLICITUD_GENERADA: "secondary",
  EN_REVISION: "default",
  ORDEN_EMITIDA: "default",
  RECHAZADA: "destructive",
  CANCELADA: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  SOLICITUD_GENERADA: "SOLICITUD GENERADA",
  EN_REVISION: "EN REVISIÓN",
  ORDEN_EMITIDA: "ORDEN EMITIDA",
  RECHAZADA: "RECHAZADA",
  CANCELADA: "CANCELADA",
};

type CurrentUser = { id: string; role: "admin" | "trabajador" };

export function SolicitudDetailView({
  solicitud,
  currentUser,
}: {
  solicitud: SolicitudOrdenCompra;
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const isAdmin = currentUser.role === "admin";
  const isCreator = solicitud.createdById === currentUser.id;
  const isEditablePaso1 =
    solicitud.status === "SOLICITUD_GENERADA" && (isCreator || isAdmin);
  const isReviewable = solicitud.status === "EN_REVISION" && isAdmin;
  const isTerminal = ["ORDEN_EMITIDA", "RECHAZADA", "CANCELADA"].includes(solicitud.status);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function doTransition(action: "submit" | "approve" | "reject" | "cancel", body: any = {}) {
    setActionError(null);
    setActionInProgress(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "Error en la transición");
        return;
      }
      router.refresh();
    } catch (e: any) {
      setActionError(e.message ?? "Error de red");
    } finally {
      setActionInProgress(false);
    }
  }

  function fmtDate(d: Date | string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-CL");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono">{solicitud.number}</h1>
            <p className="text-sm text-muted-foreground">
              {solicitud.workOrder?.number} · {solicitud.client?.name}
            </p>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[solicitud.status]} className="px-3 py-1 text-xs">
          STATUS: {STATUS_LABEL[solicitud.status]}
        </Badge>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Read-only paso 1 data */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Detalles del Trabajo</h2>
        <hr className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Trabajo N°</div>
            <div className="font-mono">{solicitud.workOrder?.number}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">RUT Cliente</div>
            <div className="font-mono">{solicitud.client?.code}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">Cliente</div>
            <div>{solicitud.client?.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fecha Trabajo</div>
            <div>{fmtDate(solicitud.fechaTrabajo)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fecha Entrega</div>
            <div>{fmtDate(solicitud.fechaEntrega)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Días sin OC</div>
            <div>{solicitud.diasSinOC}</div>
          </div>
        </div>
        <hr className="my-4" />
        <h3 className="text-sm font-semibold mb-2">Fechas de Solicitud</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Solicitud 1</div>
            <div>{fmtDate(solicitud.solicitud1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Solicitud 2</div>
            <div>{fmtDate(solicitud.solicitud2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Solicitud 3</div>
            <div>{fmtDate(solicitud.solicitud3)}</div>
          </div>
        </div>
        {solicitud.notasInternas && (
          <>
            <hr className="my-4" />
            <div className="text-xs text-muted-foreground">Notas Internas</div>
            <div className="text-sm whitespace-pre-wrap mt-1">{solicitud.notasInternas}</div>
          </>
        )}
      </Card>

      {/* Paso 2 review form (admin only, EN_REVISION) */}
      {isReviewable && (
        <SolicitudReviewForm
          solicitudId={solicitud.id}
          initialSupplierId={solicitud.supplierId}
          initialItems={solicitud.items}
          initialDiscount={solicitud.discount}
          initialDiscountType={solicitud.discountType}
        />
      )}

      {/* Emitted: show link to the created Purchase */}
      {solicitud.status === "ORDEN_EMITIDA" && solicitud.purchaseId && (
        <Card className="p-6 border-green-600">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div className="flex-1">
              <div className="font-semibold">PO Emitida</div>
              <div className="text-sm text-muted-foreground">
                La orden de compra fue creada y aparece en la pestaña "Emitidas" de /purchases.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Rejected/Cancelled banner */}
      {solicitud.status === "RECHAZADA" && (
        <Card className="p-6 border-destructive">
          <div className="font-semibold text-destructive mb-2">Solicitud rechazada</div>
          {solicitud.rejectionReason && (
            <div className="text-sm">{solicitud.rejectionReason}</div>
          )}
        </Card>
      )}
      {solicitud.status === "CANCELADA" && (
        <Card className="p-6 border-muted">
          <div className="font-semibold text-muted-foreground">Solicitud cancelada</div>
        </Card>
      )}

      {/* Action bar */}
      {!isTerminal && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          {solicitud.status === "SOLICITUD_GENERADA" && (isCreator || isAdmin) && (
            <Button onClick={() => doTransition("submit")} disabled={actionInProgress}>
              <Send className="h-4 w-4 mr-2" />
              Submit for review
            </Button>
          )}
          {isReviewable && (
            <>
              <Button
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={actionInProgress}
              >
                <X className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button
                onClick={() => setApproveOpen(true)}
                disabled={
                  actionInProgress ||
                  !solicitud.supplierId ||
                  solicitud.items.length === 0
                }
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprobar y Emitir
              </Button>
            </>
          )}
          {(isCreator || isAdmin) &&
            (solicitud.status === "SOLICITUD_GENERADA" || solicitud.status === "EN_REVISION") && (
              <Button variant="outline" onClick={() => setCancelOpen(true)} disabled={actionInProgress}>
                Cancelar solicitud
              </Button>
            )}
        </div>
      )}

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={async (reason) => doTransition("reject", { reason })}
      />
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={() => doTransition("cancel")}
      />
      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        onConfirm={() => doTransition("approve")}
        summary={{
          supplierName: solicitud.supplier?.name ?? "—",
          total: Number(solicitud.total ?? 0),
          itemCount: solicitud.items.length,
        }}
      />
    </div>
  );
}
