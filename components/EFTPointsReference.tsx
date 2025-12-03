// components/EFTPointsReference.tsx
import React from "react";

export default function EFTPointsReference({ className = "" }: { className?: string }) {
  return (
    <div className={className} style={{ marginTop: 12 }}>
      <a
        href="https://technique-eft.com/decouvrir-eft/points-illustres.html"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Voir image et localisation des points EFT (ouvre un nouvel onglet)"
        style={{ textDecoration: "none", color: "#0f3d69", display: "inline-flex", gap: 10, alignItems: "center" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a2 2 0 11-.001 3.999A2 2 0 0112 7zm2 10h-4v-1c0-1 2-1.5 2-2.5 0-1-1-1-1-1v-.5a2.5 2.5 0 10-5 0V15h2v1h6v-1z"/>
        </svg>

        <div>
          <div style={{ fontWeight: 600 }}>Repères visuels : points EFT (photo + localisation)</div>
          <div style={{ fontSize: 13, color: "#555" }}>
            Voir la photo des points et la description précise (s&apos;ouvre dans un nouvel onglet).
          </div>
               

        </div>
      </a>
    </div>
  );
}
