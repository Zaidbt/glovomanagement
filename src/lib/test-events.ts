import { prisma } from "./prisma";

async function testEvents() {
  try {
    console.log("🔍 Testing events in database...");

    // Check if events table exists and has data
    const eventCount = await prisma.event.count();
    console.log(`📊 Total events in database: ${eventCount}`);

    if (eventCount > 0) {
      const recentEvents = await prisma.event.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              role: true,
            },
          },
          store: {
            select: {
              name: true,
            },
          },
        },
      });

      console.log("📋 Recent events:");
      recentEvents.forEach((event, index) => {
        console.log(
          `${index + 1}. ${event.title} - ${
            event.description
          } (${event.createdAt.toLocaleString()})`
        );
      });
    } else {
      console.log("⚠️ No events found in database");
    }
  } catch (error) {
    console.error("❌ Error testing events:", error);
  }
}

testEvents()
  .then(() => {
    console.log("✅ Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });
