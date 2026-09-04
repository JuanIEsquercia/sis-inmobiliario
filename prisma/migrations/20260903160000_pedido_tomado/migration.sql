-- Quién se hizo cargo de un pedido -- exclusivo (ver tomarPedido).
ALTER TABLE "Pedido" ADD COLUMN "tomadoPorId" UUID;
ALTER TABLE "Pedido" ADD COLUMN "tomadoAt" TIMESTAMP(3);

ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_tomadoPorId_fkey" FOREIGN KEY ("tomadoPorId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
