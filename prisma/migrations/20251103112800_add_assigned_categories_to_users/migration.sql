-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assignedCategories" TEXT[] DEFAULT '{}';

-- CreateIndex (for faster lookups by category)
CREATE INDEX IF NOT EXISTS "users_assignedCategories_idx" ON "users" USING GIN ("assignedCategories");
