"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Info,
  Calendar,
  Save,
  Trash2,
  Eraser,
  LogOut,
  Search,
  UserSearch,
} from "lucide-react";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

type ClientOpt = { id: string; name: string; code: string };
type WorkOrderOpt = { id: string; number: string; title: string; clientId: string };

export function SolicitudForm({ initialWorkOrderId }: { initialWorkOrderId?: string }) {
  const router = useRouter();
  const [trabajoNumero, setTrabajoNumero] = useState("");
  const [workOrderId, setWorkOrderId] = useState(initialWorkOrderId ?? "");
  const [rut, setRut] = useState("");
  const [clientId, setClientId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [fechaTrabajo, setFechaTrabajo] = useState(todayISO());
  const [fechaEntrega, setFechaEntrega] = useState(todayISO());
  const [diasSinOC, setDiasSinOC] = useState(0);
  const [solicitud1, setSolicitud1] = useState("");
  const [solicitud2, setSolicitud2] = useState("");
  const [solicitud3, setSolicitud3] = useState("");
  const [notasInternas, setNotasInternas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOpt[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [workOrderSearchOpen, setWorkOrderSearchOpen] = useState(false);
  const [woModalSearch, setWoModalSearch] = useState("");

  useEffect(() => {
    setDiasSinOC(daysBetween(fechaTrabajo, todayISO()));
  }, [fechaTrabajo]);

  useEffect(() => {
    fetch("/api/clients?activeOnly=true")
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/work-orders")
      .then((r) => r.json())
      .then((d) => setWorkOrders(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Sync the modal search with the outside input whenever the modal opens
  useEffect(() => {
    if (workOrderSearchOpen) {
      setWoModalSearch(trabajoNumero);
    }
  }, [workOrderSearchOpen, trabajoNumero]);

  function handleLimpia() {
    setTrabajoNumero("");
    setWorkOrderId(initialWorkOrderId ?? "");
    setRut("");
    setClientId("");
    setClienteNombre("");
    setFechaTrabajo(todayISO());
    setFechaEntrega(todayISO());
    setDiasSinOC(0);
    setSolicitud1("");
    setSolicitud2("");
    setSolicitud3("");
    setNotasInternas("");
    setError(null);
  }

  function handleBorrar() {
    if (!confirm("¿Borrar todos los datos del formulario?")) return;
    handleLimpia();
  }

  async function handleGrabar() {
    setError(null);
    if (!workOrderId) {
      setError("Selecciona un trabajo");
      return;
    }
    if (!clientId) {
      setError("Selecciona un cliente");
      return;
    }
    if (!fechaTrabajo || !fechaEntrega) {
      setError("Las fechas de trabajo y entrega son requeridas");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId,
          clientId,
          fechaTrabajo,
          fechaEntrega,
          diasSinOC,
          solicitud1: solicitud1 || null,
          solicitud2: solicitud2 || null,
          solicitud3: solicitud3 || null,
          notasInternas: notasInternas || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al crear la solicitud");
        return;
      }
      const created = await res.json();
      router.push(`/purchases/solicitudes/${created.id}`);
    } catch (e: any) {
      setError(e.message ?? "Error de red");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredClients = clients.filter((c) => {
    if (!rut) return true;
    const q = rut.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  });

  const filteredWOs = workOrders.filter((w) => {
    if (!woModalSearch) return true;
    const q = woModalSearch.toLowerCase();
    return (
      w.number.toLowerCase().includes(q) || w.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitud de Orden de Compra</h1>
          <p className="text-sm text-muted-foreground">
            Complete details to initiate a purchase order request.
          </p>
        </div>
        <Badge className="bg-[#14679C] text-white px-3 py-1 text-xs">
          STATUS: DRAFT
        </Badge>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Info className="h-5 w-5 text-[#14679C]" />
              Detalles del Trabajo
            </h2>
            <hr className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">TRABAJO N°</Label>
                <div className="flex gap-2">
                  <Input
                    value={trabajoNumero}
                    onChange={(e) => setTrabajoNumero(e.target.value)}
                    placeholder="34250"
                    className="bg-yellow-50 font-mono"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="bg-[#14679C] hover:bg-[#14679C]/90 shrink-0"
                    onClick={() => setWorkOrderSearchOpen((v) => !v)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {workOrderSearchOpen && (
                  <Dialog open={workOrderSearchOpen} onOpenChange={setWorkOrderSearchOpen}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Buscar trabajo</DialogTitle>
                        <DialogDescription>
                          Escribí el número o título del trabajo
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={woModalSearch}
                            onChange={(e) => setWoModalSearch(e.target.value)}
                            placeholder="Número o título del trabajo"
                            className="pl-9"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-1">
                          {filteredWOs.length === 0 && (
                            <div className="text-sm text-muted-foreground p-4 text-center">
                              Sin resultados
                            </div>
                          )}
                          {filteredWOs.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                setWorkOrderId(w.id);
                                setTrabajoNumero(w.number);
                                const woClient = clients.find((c) => c.id === w.clientId);
                                if (woClient) {
                                  setClientId(woClient.id);
                                  setClienteNombre(woClient.name);
                                  setRut(woClient.code);
                                }
                                setWorkOrderSearchOpen(false);
                              }}
                              className="w-full text-left p-3 hover:bg-muted rounded border"
                            >
                              <div className="font-mono font-semibold">{w.number}</div>
                              <div className="text-xs text-muted-foreground">{w.title}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">CÓDIGO CLIENTE</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={rut}
                      onChange={(e) => {
                        setRut(e.target.value);
                        setClientSearchOpen(true);
                      }}
                      onFocus={() => setClientSearchOpen(true)}
                      placeholder="e.g., CLI-001"
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setClientSearchOpen((v) => !v)}
                  >
                    <UserSearch className="h-4 w-4" />
                  </Button>
                </div>
                {clientSearchOpen && (
                  <div className="border rounded-md p-2 max-h-48 overflow-y-auto bg-background">
                    {filteredClients.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">Sin resultados</div>
                    )}
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientId(c.id);
                          setClienteNombre(c.name);
                          setRut(c.code);
                          setClientSearchOpen(false);
                        }}
                        className="w-full text-left text-sm p-2 hover:bg-muted rounded"
                      >
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {c.code}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-xs font-semibold tracking-wide">NOMBRE DEL CLIENTE</Label>
              <Input
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre completo o razón social"
                readOnly={!!clientId}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">FECHA TRABAJO</Label>
                <Input
                  type="date"
                  value={fechaTrabajo}
                  onChange={(e) => setFechaTrabajo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">FECHA ENTREGA TRABAJO</Label>
                <Input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 mt-4 max-w-[200px]">
              <Label className="text-xs font-semibold tracking-wide">DÍAS SIN ORDEN DE COMPRA</Label>
              <Input type="number" value={diasSinOC} onChange={(e) => setDiasSinOC(Number(e.target.value))} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Calendar className="h-5 w-5 text-[#14679C]" />
              Fechas de Solicitud
            </h2>
            <hr className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">SOLICITUD 1</Label>
                <Input type="date" value={solicitud1} onChange={(e) => setSolicitud1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">SOLICITUD 2</Label>
                <Input type="date" value={solicitud2} onChange={(e) => setSolicitud2(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">SOLICITUD 3</Label>
                <Input type="date" value={solicitud3} onChange={(e) => setSolicitud3(e.target.value)} />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground mb-4">
              PURCHASE WORKFLOW
            </h3>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-[#14679C] text-white flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <div className="pt-1">
                  <div className="font-semibold text-sm text-[#14679C]">Solicitud Generada</div>
                  <div className="text-xs text-muted-foreground">Current Step</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <div className="pt-1">
                  <div className="font-semibold text-sm text-muted-foreground">Revisión de Gerencia</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                </div>
                <div className="pt-1">
                  <div className="font-semibold text-sm text-muted-foreground">Orden Emitida</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </li>
            </ol>
          </Card>

          <Card className="p-6">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground mb-4">
              NOTAS INTERNAS
            </h3>
            <Textarea
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              placeholder="Add relevant information about this request..."
              rows={6}
            />
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleLimpia} disabled={submitting}>
          <Eraser className="h-4 w-4 mr-2" />
          LIMPIA
        </Button>
        <Button type="button" variant="outline" className="text-destructive border-destructive" onClick={handleBorrar} disabled={submitting}>
          <Trash2 className="h-4 w-4 mr-2" />
          BORRAR
        </Button>
        <Button type="button" onClick={handleGrabar} disabled={submitting} className="bg-[#14679C] hover:bg-[#14679C]/90">
          <Save className="h-4 w-4 mr-2" />
          {submitting ? "Guardando..." : "GRABAR"}
        </Button>
        <Link href="/purchases">
          <Button type="button" variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            SALIR
          </Button>
        </Link>
      </div>
    </div>
  );
}
