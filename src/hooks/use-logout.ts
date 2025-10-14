"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { clientEventTracker } from "@/lib/client-event-tracker";
import type { ExtendedSession } from "@/lib/auth";

export function useLogout() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    // Track logout before signing out
    if (session?.user) {
      try {
        await clientEventTracker.trackUserLogout(
          session.user?.name || "Unknown",
          (session as unknown as ExtendedSession).user?.role || "Unknown"
        );
      } catch (error) {
        console.error("Error tracking user logout:", error);
      }
    }

    // Sign out
    await signOut({ callbackUrl: "/login" });
  };

  return { handleLogout };
}
