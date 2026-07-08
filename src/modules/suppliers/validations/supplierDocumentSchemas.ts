import { z } from "zod";

export const SupplierDocumentSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  tipoDocumento: z.enum(["FACTURA", "BOLETA", "PAGARE", "OTROS", "CHEQUE"], {
    message: "Tipo de documento requerido",
  }),
  documento: z.string().min(1, "Documento requerido"),
  fechaDocumento: z.coerce.date({ message: "Fecha de documento inválida" }),
  valor: z.number().positive("El valor debe ser mayor a 0"),
  fechaVencimiento: z.coerce.date({ message: "Fecha de vencimiento inválida" }),
  estado: z.enum(["PAGADO", "PENDIENTE", "CANCELADO"], {
    message: "Estado requerido",
  }),
});

export type SupplierDocumentInput = z.infer<typeof SupplierDocumentSchema>;