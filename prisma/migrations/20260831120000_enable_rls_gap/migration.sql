-- Cierra un agujero que se fue acumulando desde 20260825113456_backoffice_security:
-- cada tabla nueva creada por una migración de Prisma queda expuesta por
-- PostgREST con la publishable key (pública en el bundle del cliente) a
-- menos que se le active RLS explícitamente — Prisma no lo hace solo.
-- Sin policies, solo el rol dueño de la tabla (la connection string de
-- Prisma) puede leer/escribir; "anon"/"authenticated" quedan bloqueados.
-- Ninguna de estas tablas se consulta desde el browser (todo pasa por
-- Prisma server-side, tanto el sitio público como el backoffice), así
-- que no rompe nada habilitarlo.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListingImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ListingVideo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractGuarantor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractConcept" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Concept" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IndexType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommissionScheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleCommissionInstallment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileContractGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentPartialPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentDebtPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectionSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
