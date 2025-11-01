-- Add Glovo credential support to Store model
-- This migration adds the glovoCredentialId field without affecting existing data

-- Add glovoCredentialId column to stores table (nullable, won't affect existing records)
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "glovoCredentialId" TEXT;

-- No need to modify credentials table as we're just renaming the relation

-- Add comment for documentation
COMMENT ON COLUMN "stores"."glovoCredentialId" IS 'Foreign key to Credential table for Glovo API access';
COMMENT ON COLUMN "stores"."glovoStoreId" IS 'Glovo Vendor ID for this store';
