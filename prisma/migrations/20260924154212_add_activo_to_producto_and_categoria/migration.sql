-- AlterTable
ALTER TABLE "categorias" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;
