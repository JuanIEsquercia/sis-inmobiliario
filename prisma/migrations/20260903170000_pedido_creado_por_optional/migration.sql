-- Nullable a proposito: un pedido que entra por el formulario publico
-- de la landing no tiene ningun Profile logueado detras. null en
-- creadoPorId es la marca de "vino de la web" (ver crearPedidoPublico).
ALTER TABLE "Pedido" ALTER COLUMN "creadoPorId" DROP NOT NULL;
