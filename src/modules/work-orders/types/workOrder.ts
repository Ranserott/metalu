export type WorkOrderItem = {
  material: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
};

export type WorkOrder = {
  id: string;
  number: string;
  clientId: string;
  client?: { id: string; name: string };
  quotationId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  rut: string | null;
  razonSocial: string | null;
  entregadoPor: string | null;
  celular: string | null;

  fechaTrabajo: Date | null;
  local: string | null;
  encargado: string | null;
  encargadoId: string | null;
  encargadoRel?: { id: string; name: string; rut: string; client: { id: string; name: string } } | null;
  condicionesPago: string | null;

  nroFactura: string | null;
  nroGuia: string | null;
  tipoOC: string | null;
  nroOrdenCompra: string | null;
  fechaEntrega: Date | null;
  plazoDias: number | null;

  neto: number | null;
  descuentoPorcentaje: number | null;
  subtotalAfecto: number | null;
  iva: number | null;
  total: number | null;

  materials?: WorkOrderItem[];
};
