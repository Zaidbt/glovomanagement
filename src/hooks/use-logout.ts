"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { clientEventTracker } from "@/lib/client-event-tracker";
import type { ExtendedSession } from "@/lib/auth";

export function useLogout() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    console.log("🚪 Logout initiated for user:", session?.user?.name);
    
    // Track logout before signing out
    if (session?.user) {
      try {
        console.log("📊 Tracking logout event...");
        console.log("📊 User details:", {
          name: session.user?.name,
          role: (session as unknown as ExtendedSession).user?.role,
          id: session.user?.id
        });
        
        const result = await clientEventTracker.trackUserLogout(
          session.user?.name || "Unknown",
          (session as unknown as ExtendedSession).user?.role || "Unknown"
        );
        
        console.log("✅ Logout event tracked successfully:", result);
      } catch (error) {
        console.error("❌ Error tracking user logout:", error);
        console.error("❌ Error details:", error);
      }
    } else {
      console.log("⚠️ No session found, skipping logout tracking");
    }

    // Sign out
    console.log("🔓 Signing out...");
    await signOut({ callbackUrl: "/login" });
  };

  return { handleLogout };
}
