"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FournisseurSidebar } from "@/components/fournisseur/fournisseur-sidebar";
import type { ExtendedSession } from "@/lib/auth";

export default function FournisseurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    const extSession = session as unknown as ExtendedSession;
    if (!session || !extSession.user?.role || extSession.user.role !== "FOURNISSEUR") {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const extSession = session as unknown as ExtendedSession;
  if (!session || !extSession.user?.role || extSession.user.role !== "FOURNISSEUR") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FournisseurSidebar />
      <main className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
