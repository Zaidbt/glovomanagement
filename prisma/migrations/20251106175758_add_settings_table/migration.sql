-- CreateTable
CREATE TABLE IF NOT EXISTS "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "settings_key_idx" ON "settings"("key");

-- Insert default settings
INSERT INTO "settings" ("id", "key", "value", "description", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'preparation_alert_minutes',
    '5',
    'Délai d''alerte pour préparation commande (minutes)',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'preparation_alert_minutes');

INSERT INTO "settings" ("id", "key", "value", "description", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'pickup_alert_minutes',
    '5',
    'Délai d''alerte pour récupération panier (minutes)',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'pickup_alert_minutes');
