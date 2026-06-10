-- AlterTable
ALTER TABLE "work_order_materials" ADD COLUMN     "total" DECIMAL(12,2),
ADD COLUMN     "unit_price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "celular" TEXT,
ADD COLUMN     "condiciones_pago" TEXT,
ADD COLUMN     "descuento_porcentaje" DECIMAL(5,2),
ADD COLUMN     "encargado" TEXT,
ADD COLUMN     "entregado_por" TEXT,
ADD COLUMN     "fecha_entrega" TIMESTAMP(3),
ADD COLUMN     "fecha_trabajo" TIMESTAMP(3),
ADD COLUMN     "iva" DECIMAL(12,2),
ADD COLUMN     "local" TEXT,
ADD COLUMN     "neto" DECIMAL(12,2),
ADD COLUMN     "nro_factura" TEXT,
ADD COLUMN     "nro_guia" TEXT,
ADD COLUMN     "nro_orden_compra" TEXT,
ADD COLUMN     "plazo_dias" INTEGER,
ADD COLUMN     "razon_social" TEXT,
ADD COLUMN     "rut" TEXT,
ADD COLUMN     "subtotal_afecto" DECIMAL(12,2),
ADD COLUMN     "tipo_oc" TEXT DEFAULT 'ORDEN INTERNO',
ADD COLUMN     "total" DECIMAL(12,2);
