-- Nuevos valores del ciclo de vida de una colocación sin administración
-- (BORRADOR/FIRMADO) -- ver comentario en el enum ContractStatus.
ALTER TYPE "ContractStatus" ADD VALUE 'BORRADOR';
ALTER TYPE "ContractStatus" ADD VALUE 'FIRMADO';
