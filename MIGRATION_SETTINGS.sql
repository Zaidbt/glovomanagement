-- Migration: Add Settings Table
-- Run this SQL on your production database

CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default values
INSERT INTO "settings" ("id", "key", "value", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'preparation_alert_minutes', '5', 'Délai d''alerte pour préparation commande (minutes)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'pickup_alert_minutes', '5', 'Délai d''alerte pour récupération panier (minutes)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS "settings_key_idx" ON "settings"("key");
