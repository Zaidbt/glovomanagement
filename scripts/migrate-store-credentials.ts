#!/usr/bin/env tsx

/**
 * Migration script to handle existing stores without twilioCredentialId
 * This script will:
 * 1. Find all stores without twilioCredentialId
 * 2. Assign them the first available Twilio credential
 * 3. Log the migration results
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateStoreCredentials() {
  console.log("🔄 Starting store credentials migration...");

  try {
    // 1. Find all stores without twilioCredentialId
    const storesWithoutCredential = await prisma.store.findMany({
      where: {
        twilioCredentialId: null,
      },
    });

    console.log(
      `📊 Found ${storesWithoutCredential.length} stores without Twilio credentials`
    );

    if (storesWithoutCredential.length === 0) {
      console.log("✅ All stores already have Twilio credentials assigned");
      return;
    }

    // 2. Find the first available Twilio credential
    const twilioCredential = await prisma.credential.findFirst({
      where: {
        type: "TWILIO",
        isActive: true,
      },
    });

    if (!twilioCredential) {
      console.log("⚠️ No active Twilio credentials found. Skipping migration.");
      return;
    }

    console.log(
      `🔑 Using Twilio credential: ${
        twilioCredential.instanceName || twilioCredential.name
      }`
    );

    // 3. Update all stores without credentials
    const updateResult = await prisma.store.updateMany({
      where: {
        twilioCredentialId: null,
      },
      data: {
        twilioCredentialId: twilioCredential.id,
      },
    });

    console.log(
      `✅ Updated ${updateResult.count} stores with Twilio credential`
    );

    // 4. Verify the migration
    const remainingStores = await prisma.store.count({
      where: {
        twilioCredentialId: null,
      },
    });

    if (remainingStores === 0) {
      console.log(
        "🎉 Migration completed successfully! All stores now have Twilio credentials."
      );
    } else {
      console.log(
        `⚠️ ${remainingStores} stores still don't have Twilio credentials`
      );
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateStoreCredentials()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateStoreCredentials };
