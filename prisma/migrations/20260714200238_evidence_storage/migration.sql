-- CreateEnum
CREATE TYPE "EvidenceStorageProvider" AS ENUM ('LOCAL', 'VERCEL_BLOB');

-- AlterTable
ALTER TABLE "EvidenceRecord" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "storageProvider" "EvidenceStorageProvider";
