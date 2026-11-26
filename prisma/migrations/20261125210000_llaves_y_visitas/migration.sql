-- Llaves y visitas (L3).
-- CreateEnum
CREATE TYPE "KeyLocation" AS ENUM ('INMOBILIARIA', 'CONTACTO');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PEDIDA', 'RETIRADA', 'COORDINADA', 'REALIZADA', 'DEVUELTA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "VisitEventType" AS ENUM ('PEDIDA', 'RETIRADA', 'COORDINADA', 'REALIZADA', 'DEVUELTA', 'DEVOLUCION_CONFIRMADA', 'CANCELADA');

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- DropForeignKey

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "keyContactClientId" INTEGER,
ADD COLUMN     "keyContactRelation" TEXT,
ADD COLUMN     "keyLocation" "KeyLocation",
ADD COLUMN     "keyNotes" TEXT,
ADD COLUMN     "keyNumber" TEXT,
ADD COLUMN     "keySets" INTEGER;
-- CreateTable
CREATE TABLE "Visit" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "vendedorId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "slot" VARCHAR(5) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "keyLocation" "KeyLocation" NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'PEDIDA',
    "clientId" INTEGER,
    "pedidoId" INTEGER,
    "outcomeId" INTEGER,
    "retiradaAt" TIMESTAMP(3),
    "devueltaAt" TIMESTAMP(3),
    "returnConfirmedAt" TIMESTAMP(3),
    "returnConfirmedById" UUID,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitEvent" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "type" "VisitEventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byId" UUID NOT NULL,
    "note" TEXT,

    CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitOutcome" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_listingId_date_idx" ON "Visit"("listingId", "date");

-- CreateIndex
CREATE INDEX "Visit_vendedorId_date_idx" ON "Visit"("vendedorId", "date");

-- CreateIndex
CREATE INDEX "Visit_status_date_idx" ON "Visit"("status", "date");

-- CreateIndex
CREATE INDEX "Visit_clientId_idx" ON "Visit"("clientId");

-- CreateIndex
CREATE INDEX "Visit_pedidoId_idx" ON "Visit"("pedidoId");

-- CreateIndex
CREATE INDEX "VisitEvent_visitId_at_idx" ON "VisitEvent"("visitId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "VisitOutcome_name_key" ON "VisitOutcome"("name");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_keyContactClientId_fkey" FOREIGN KEY ("keyContactClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "VisitOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_returnConfirmedById_fkey" FOREIGN KEY ("returnConfirmedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_byId_fkey" FOREIGN KEY ("byId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- Dos visitas activas a la misma propiedad en el mismo turno: no. Las
-- canceladas liberan el turno.
CREATE UNIQUE INDEX "Visit_listing_turno_activo_key" ON "Visit"("listingId", "date", "slot") WHERE "status" <> 'CANCELADA';

-- Interesado: cliente o pedido, nunca los dos. La obligación de cargar
-- uno la controla el alta (si después se borra el pedido o el cliente,
-- la visita queda como historia sin interesado).
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_un_interesado_check" CHECK (num_nonnulls("clientId", "pedidoId") <= 1);

-- Turno de la lista fija: 07:00 a 21:30 cada media hora.
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_slot_check" CHECK ("slot" ~ '^(0[7-9]|1[0-9]|2[01]):(00|30)$');

-- Igual que el resto de las tablas del backoffice: RLS sin políticas
-- cierra el acceso por la API pública de Supabase; la app entra por Prisma.
ALTER TABLE "Visit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VisitEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VisitOutcome" ENABLE ROW LEVEL SECURITY;

-- Categorías de resultado iniciales (se administran desde el backoffice).
INSERT INTO "VisitOutcome" ("name", "sortOrder") VALUES
  ('Le interesó', 1),
  ('Pide segunda visita', 2),
  ('Hace oferta', 3),
  ('No le gustó la propiedad', 4),
  ('No le gustó la zona', 5),
  ('Fuera de presupuesto', 6),
  ('Descartado', 7);

-- Permisos nuevos (src/lib/permissions.ts).
UPDATE "Profile"
SET "permissions" = array(SELECT DISTINCT unnest("permissions" || ARRAY['visitas.pedir', 'visitas.gestionar_llaves', 'visitas.categorias']))
WHERE "role" = 'ADMIN';

UPDATE "Profile"
SET "permissions" = array(SELECT DISTINCT unnest("permissions" || ARRAY['visitas.pedir']))
WHERE "role" <> 'ADMIN';