/*
  Warnings:

  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `assignedTo` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `customerInfo` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `glovoOrderId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `orders` table. All the data in the column will be lost.
  - Added the required column `orderId` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "order_items";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderCode" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderTime" TEXT,
    "estimatedPickupTime" TEXT,
    "utcOffsetMinutes" TEXT,
    "paymentMethod" TEXT,
    "currency" TEXT,
    "estimatedTotalPrice" INTEGER,
    "deliveryFee" INTEGER,
    "minimumBasketSurcharge" INTEGER,
    "customerCashPaymentAmount" INTEGER,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerHash" TEXT,
    "customerInvoicingDetails" JSONB,
    "courierName" TEXT,
    "courierPhone" TEXT,
    "products" JSONB,
    "allergyInfo" TEXT,
    "specialRequirements" TEXT,
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credentialId" TEXT,
    CONSTRAINT "orders_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("createdAt", "id", "notes", "status", "storeId", "updatedAt") SELECT "createdAt", "id", "notes", "status", "storeId", "updatedAt" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
