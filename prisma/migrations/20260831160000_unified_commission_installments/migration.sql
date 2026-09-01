-- Unifica el cobro en cuotas de Venta y Alquiler en una sola tabla
-- (CommissionInstallment) y agrega trazabilidad uniforme a agente
-- vendedor en Appraisal y CashMovement. Verificado antes de escribir
-- esta migración: SaleCommissionInstallment y Sale están en 0 filas
-- (se puede reemplazar sin preservar datos), pero SÍ hay 1 fila real de
-- RentalCommission con un CashMovement enganchado directo por
-- "rentalCommissionId" (alta ya probada en vivo) — esa fila y su camino
-- de cobro directo se dejan intactos, así que el nuevo constraint de
-- abajo tiene que seguir permitiéndolo en paralelo al camino nuevo por
-- cuotas.

-- DropForeignKey
ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_source_fk_check";

-- DropForeignKey
ALTER TABLE "CashMovement" DROP CONSTRAINT "CashMovement_saleCommissionInstallmentId_fkey";

-- DropIndex
DROP INDEX "CashMovement_saleCommissionInstallmentId_key";

-- AlterTable
ALTER TABLE "CashMovement" DROP COLUMN "saleCommissionInstallmentId";

-- DropForeignKey
ALTER TABLE "Appraisal" DROP CONSTRAINT "Appraisal_agentId_fkey";

-- AlterTable (rename, no RESTRICT de datos: la columna renombrada
-- conserva sus valores tal cual — hoy no hay ninguna fila con este
-- campo seteado, pero el patrón es el correcto igual si en el futuro
-- hubiera datos)
ALTER TABLE "Appraisal" RENAME COLUMN "agentId" TO "vendedorAgentId";

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_vendedorAgentId_fkey" FOREIGN KEY ("vendedorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable (0 filas verificado — sin lógica de migración de datos)
DROP TABLE "SaleCommissionInstallment";

-- DropEnum
DROP TYPE "PagareSigner";

-- CreateEnum
CREATE TYPE "CommissionInstallmentSource" AS ENUM ('VENTA', 'ALQUILER');

-- CreateEnum
CREATE TYPE "CommissionParty" AS ENUM ('COMPRADOR', 'VENDEDOR', 'INQUILINO', 'PROPIETARIO');

-- CreateTable
CREATE TABLE "CommissionInstallment" (
    "id" SERIAL NOT NULL,
    "source" "CommissionInstallmentSource" NOT NULL,
    "saleId" INTEGER,
    "rentalCommissionId" INTEGER,
    "numeroCuota" INTEGER NOT NULL,
    "totalCuotas" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "paidAt" TIMESTAMP(3),
    "method" "PaymentMethod",
    "attributedTo" "CommissionParty",
    "pagareFirmado" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionInstallment_status_idx" ON "CommissionInstallment"("status");

-- CreateIndex
CREATE INDEX "CommissionInstallment_saleId_idx" ON "CommissionInstallment"("saleId");

-- CreateIndex
CREATE INDEX "CommissionInstallment_rentalCommissionId_idx" ON "CommissionInstallment"("rentalCommissionId");

-- CreateIndex
-- Parciales (no expresables en schema.prisma, mismo criterio que el
-- @@check de CashMovement documentado más arriba en el schema): cada
-- tabla padre tiene su propia numeración de cuotas 1..N, y como source
-- determina cuál de los dos FKs va seteado, un único índice compuesto
-- sobre los dos no alcanzaría (NULL nunca choca contra NULL en Postgres).
CREATE UNIQUE INDEX "CommissionInstallment_saleId_numeroCuota_key" ON "CommissionInstallment"("saleId", "numeroCuota") WHERE "saleId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CommissionInstallment_rentalCommissionId_numeroCuota_key" ON "CommissionInstallment"("rentalCommissionId", "numeroCuota") WHERE "rentalCommissionId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "CommissionInstallment" ADD CONSTRAINT "CommissionInstallment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInstallment" ADD CONSTRAINT "CommissionInstallment_rentalCommissionId_fkey" FOREIGN KEY ("rentalCommissionId") REFERENCES "RentalCommission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariante a mano (mismo criterio que arriba): exactamente uno de los
-- dos FKs seteado, y coincidiendo con `source`.
ALTER TABLE "CommissionInstallment" ADD CONSTRAINT "CommissionInstallment_source_fk_check" CHECK (
  (source = 'VENTA' AND "saleId" IS NOT NULL AND "rentalCommissionId" IS NULL) OR
  (source = 'ALQUILER' AND "rentalCommissionId" IS NOT NULL AND "saleId" IS NULL)
);

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN "commissionInstallmentId" INTEGER,
ADD COLUMN "vendedorAgentId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_commissionInstallmentId_key" ON "CashMovement"("commissionInstallmentId");

-- CreateIndex
CREATE INDEX "CashMovement_vendedorAgentId_idx" ON "CashMovement"("vendedorAgentId");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_commissionInstallmentId_fkey" FOREIGN KEY ("commissionInstallmentId") REFERENCES "CommissionInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_vendedorAgentId_fkey" FOREIGN KEY ("vendedorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invariante corregida: la versión anterior (2026-08-25) no conocía
-- COMISION_RENOVACION (sumado después) ni commissionInstallmentId
-- (nuevo acá), así que ya había quedado desactualizada — confirmar el
-- cobro de una comisión de renovación hoy rompería este check. VENTA y
-- COMISION_ALQUILER aceptan su FK directo legado O el nuevo
-- commissionInstallmentId (nunca los dos a la vez): hay 1 fila real hoy
-- de COMISION_ALQUILER con "rentalCommissionId" directo que tiene que
-- seguir siendo válida.
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_source_fk_check" CHECK (
  (source = 'ADMINISTRACION' AND "paymentId" IS NOT NULL AND "rentalCommissionId" IS NULL AND "saleId" IS NULL AND "commissionInstallmentId" IS NULL AND "appraisalId" IS NULL) OR
  (source = 'COMISION_ALQUILER' AND "paymentId" IS NULL AND "saleId" IS NULL AND "appraisalId" IS NULL AND (("rentalCommissionId" IS NOT NULL) IS DISTINCT FROM ("commissionInstallmentId" IS NOT NULL))) OR
  (source = 'COMISION_RENOVACION' AND "paymentId" IS NULL AND "saleId" IS NULL AND "commissionInstallmentId" IS NULL AND "appraisalId" IS NULL AND "rentalCommissionId" IS NOT NULL) OR
  (source = 'VENTA' AND "paymentId" IS NULL AND "rentalCommissionId" IS NULL AND "appraisalId" IS NULL AND (("saleId" IS NOT NULL) IS DISTINCT FROM ("commissionInstallmentId" IS NOT NULL))) OR
  (source = 'TASACION' AND "paymentId" IS NULL AND "rentalCommissionId" IS NULL AND "saleId" IS NULL AND "commissionInstallmentId" IS NULL AND "appraisalId" IS NOT NULL)
);

-- Cierra el mismo agujero de RLS que 20260831120000_enable_rls_gap para
-- la tabla nueva de esta migración.
ALTER TABLE "CommissionInstallment" ENABLE ROW LEVEL SECURITY;
