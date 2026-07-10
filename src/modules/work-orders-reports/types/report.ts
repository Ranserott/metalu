export type WorkOrderReportType = "by-client" | "by-workorder";

export type ClientOption = { id: string; name: string; code: string };
export type EncargadoOption = { id: string; name: string; clientId: string };
export type LocalOption = { value: string };

export type ByClientRow = {
  id: string;
  number: string;
  fechaTrabajo: Date | null;
  local: string | null;
  encargadoNombre: string | null;
  nroFactura: string | null;
  nroGuia: string | null;
  nroOrdenCompra: string | null;
  status: string;
  total: number;
};

export type ByClientGroup = {
  clientId: string;
  clientName: string;
  clientCode: string;
  rows: ByClientRow[];
  groupTotal: number;
};

export type ByClientTotals = {
  count: number;
  totalAmount: number;
};

export type ByWorkOrderRow = {
  id: string;
  number: string;
  fechaTrabajo: Date | null;
  clientId: string;
  clientName: string;
  local: string | null;
  status: string;
  nroFactura: string | null;
  nroGuia: string | null;
  description: string | null;
  total: number;
};

export type ByWorkOrderTotals = {
  count: number;
  totalAmount: number;
};

export type WorkOrderReportFilters = {
  clientId?: string;
  local?: string;
  encargadoId?: string;
  facturado?: "all" | "yes" | "no";
  nroFactura?: string;
  nroGuia?: string;
  nroOrdenCompra?: string;
  status?: string;
  description?: string;
  from?: string;
  to?: string;
  number?: string;
};