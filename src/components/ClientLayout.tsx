"use client";

import { useEffect } from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Supprimer les attributs Grammarly après l'hydratation
    const removeGrammarlyAttributes = () => {
      const body = document.body;
      if (body) {
        body.removeAttribute("data-new-gr-c-s-check-loaded");
        body.removeAttribute("data-gr-ext-installed");
      }
    };

    // Supprimer immédiatement
    removeGrammarlyAttributes();

    // Observer les changements du DOM pour supprimer les attributs récurrents
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.target === document.body
        ) {
          removeGrammarlyAttributes();
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        "data-new-gr-c-s-check-loaded",
        "data-gr-ext-installed",
      ],
    });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
}
