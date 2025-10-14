import { prisma } from "./prisma";

export async function seedEvents() {
  try {
    console.log("🌱 Seeding events...");

    // Get existing stores and users for realistic data
    const stores = await prisma.store.findMany();
    const users = await prisma.user.findMany();

    if (stores.length === 0 || users.length === 0) {
      console.log(
        "⚠️ No stores or users found. Please run the main seed script first."
      );
      return;
    }

    const adminUser = users.find((u) => u.role === "ADMIN");
    const collaborateurUser = users.find((u) => u.role === "COLLABORATEUR");
    const fournisseurUser = users.find((u) => u.role === "FOURNISSEUR");

    // Create sample events
    const events = [
      {
        type: "STORE_CREATED",
        title: "Nouveau store créé",
        description: `${
          stores[0]?.name || "Store Rabat"
        } a été créé avec succès`,
        userId: adminUser?.id,
        storeId: stores[0]?.id,
        metadata: { storeName: stores[0]?.name },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        type: "COLLABORATEUR_ADDED",
        title: "Collaborateur ajouté",
        description: `${
          collaborateurUser?.name || "Ahmed Benali"
        } a été ajouté au store ${stores[0]?.name || "Store Casablanca"}`,
        userId: adminUser?.id,
        storeId: stores[0]?.id,
        metadata: {
          collaborateurName: collaborateurUser?.name,
          storeName: stores[0]?.name,
        },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        type: "FOURNISSEUR_ADDED",
        title: "Fournisseur ajouté",
        description: `${
          fournisseurUser?.name || "Mohammed Alami"
        } a été ajouté au store ${stores[0]?.name || "Store Rabat"}`,
        userId: adminUser?.id,
        storeId: stores[0]?.id,
        metadata: {
          fournisseurName: fournisseurUser?.name,
          storeName: stores[0]?.name,
        },
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      },
      {
        type: "ORDER_CREATED",
        title: "Commande reçue",
        description: `Commande #1234 reçue pour ${
          stores[0]?.name || "Store Casablanca"
        }`,
        userId: null, // System event
        storeId: stores[0]?.id,
        metadata: { orderId: "#1234", storeName: stores[0]?.name },
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
      {
        type: "ORDER_UPDATED",
        title: "Commande mise à jour",
        description: "Commande #1230 - Statut: IN_PREPARATION",
        userId: collaborateurUser?.id,
        metadata: { orderId: "#1230", newStatus: "IN_PREPARATION" },
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
      {
        type: "USER_LOGIN",
        title: "Connexion utilisateur",
        description: `${
          adminUser?.name || "Admin System"
        } (ADMIN) s'est connecté`,
        userId: adminUser?.id,
        metadata: { userName: adminUser?.name, role: "ADMIN" },
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
    ];

    // Insert events
    for (const event of events) {
      await prisma.event.create({
        data: event,
      });
    }

    console.log(`✅ Created ${events.length} sample events`);
  } catch (error) {
    console.error("❌ Error seeding events:", error);
  }
}

// Run if called directly
if (require.main === module) {
  seedEvents()
    .then(() => {
      console.log("🎉 Events seeded successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Error:", error);
      process.exit(1);
    });
}
