-- CreateTable
CREATE TABLE "CreditCheck" (
    "id" SERIAL NOT NULL,
    "cuit" VARCHAR(11) NOT NULL,
    "denominacion" TEXT,
    "found" BOOLEAN NOT NULL,
    "situacionActual" INTEGER,
    "periodoInformado" TEXT,
    "deudaData" JSONB,
    "historicoData" JSONB,
    "chequesRechazadosData" JSONB,
    "consultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consultedById" UUID NOT NULL,

    CONSTRAINT "CreditCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditCheck_cuit_key" ON "CreditCheck"("cuit");

-- CreateIndex
CREATE INDEX "CreditCheck_consultedById_idx" ON "CreditCheck"("consultedById");

-- AddForeignKey
ALTER TABLE "CreditCheck" ADD CONSTRAINT "CreditCheck_consultedById_fkey" FOREIGN KEY ("consultedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: todo el acceso pasa por Prisma con la service role, nunca por
-- los roles anon/authenticated de Supabase (mismo criterio que el
-- resto de las tablas del sistema).
ALTER TABLE "CreditCheck" ENABLE ROW LEVEL SECURITY;
