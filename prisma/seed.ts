import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("Natura5600", 12);

  const admin = await prisma.user.upsert({
    where: { username: "Natura.beldi" },
    update: {},
    create: {
      username: "Natura.beldi",
      password: hashedPassword,
      role: "ADMIN",
      name: "Admin Natura Beldi",
      email: "admin@natura-beldi.com",
      phone: "+212600000000",
      isActive: true,
    },
  });

  console.log("Admin user created:", admin.username);

  // Create sample stores
  const store1 = await prisma.store.upsert({
    where: { id: "store-1" },
    update: {},
    create: {
      id: "store-1",
      name: "Store Casablanca",
      address: "Avenue Mohammed V, Casablanca",
      phone: "+212522000000",
      twilioNumber: "+212522000001",
      glovoStoreId: "glovo-casa-001",
      isActive: true,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { id: "store-2" },
    update: {},
    create: {
      id: "store-2",
      name: "Store Rabat",
      address: "Avenue Hassan II, Rabat",
      phone: "+212537000000",
      twilioNumber: "+212537000001",
      glovoStoreId: "glovo-rabat-001",
      isActive: true,
    },
  });

  console.log("Sample stores created");

  // Create sample collaborateur
  const collaborateurPassword = await bcrypt.hash("collab123", 12);

  const collaborateur = await prisma.user.upsert({
    where: { username: "collab.casa" },
    update: {},
    create: {
      username: "collab.casa",
      password: collaborateurPassword,
      role: "COLLABORATEUR",
      name: "Ahmed Benali",
      email: "ahmed@natura-beldi.com",
      phone: "+212600000001",
      isActive: true,
    },
  });

  // Assign collaborateur to store
  await prisma.collaborateurStore.upsert({
    where: {
      collaborateurId_storeId: {
        collaborateurId: collaborateur.id,
        storeId: store1.id,
      },
    },
    update: {},
    create: {
      collaborateurId: collaborateur.id,
      storeId: store1.id,
    },
  });

  console.log("Sample collaborateur created and assigned");

  // Create sample fournisseur
  const fournisseurPassword = await bcrypt.hash("fourni123", 12);

  const fournisseur = await prisma.user.upsert({
    where: { username: "fourni.viande" },
    update: {},
    create: {
      username: "fourni.viande",
      password: fournisseurPassword,
      role: "FOURNISSEUR",
      name: "Boucherie Alami",
      email: "alami@natura-beldi.com",
      phone: "+212600000002",
      isActive: true,
    },
  });

  // Assign fournisseur to store
  await prisma.fournisseurStore.upsert({
    where: {
      fournisseurId_storeId: {
        fournisseurId: fournisseur.id,
        storeId: store1.id,
      },
    },
    update: {},
    create: {
      fournisseurId: fournisseur.id,
      storeId: store1.id,
    },
  });

  console.log("Sample fournisseur created and assigned");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
