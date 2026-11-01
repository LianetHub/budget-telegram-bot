-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "spentAt" TIMESTAMP(3);

-- Backfill: spent day equals the moment the record was created.
UPDATE "Expense" SET "spentAt" = "createdAt" WHERE "spentAt" IS NULL;

-- Make required
ALTER TABLE "Expense" ALTER COLUMN "spentAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");

-- CreateIndex
CREATE INDEX "Expense_userId_spentAt_idx" ON "Expense"("userId", "spentAt");
