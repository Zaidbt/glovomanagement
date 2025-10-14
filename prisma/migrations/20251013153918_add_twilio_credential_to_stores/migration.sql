-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "twilioNumber" TEXT,
    "glovoStoreId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "twilioCredentialId" TEXT,
    CONSTRAINT "stores_twilioCredentialId_fkey" FOREIGN KEY ("twilioCredentialId") REFERENCES "credentials" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_stores" ("address", "createdAt", "glovoStoreId", "id", "isActive", "name", "phone", "twilioNumber", "updatedAt") SELECT "address", "createdAt", "glovoStoreId", "id", "isActive", "name", "phone", "twilioNumber", "updatedAt" FROM "stores";
DROP TABLE "stores";
ALTER TABLE "new_stores" RENAME TO "stores";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
