// app/layout.tsx
import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import React from "react";

export const metadata: Metadata = {
  title: {
    default: "École EFT France — EFTY, votre auto-séance EFT guidée.",
    template: "%s · École EFT France",
  },
  description:
    "EFTY — votre auto-séance EFT guidée, fidèle à l’EFT d’origine de Gary Craig et développée par Geneviève Gagos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ID codé en dur pour être visible dans le HTML rendu côté serveur (détection Google OK).
  const GA_ID = "G-1HHC2VHQP4";

  return (
    <html lang="fr">
      <head>
        {/* Chatkit (existant) */}
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="beforeInteractive"
        />

        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            // Envoi immédiat du page_view (pas d'attente de consentement)
            gtag('config', '${GA_ID}');
          `}
        </Script>

        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/efty-apple-touch-icon.png" />
        <meta name="theme-color" content="#0f3d69" />
        <link rel="icon" href="/favicon.ico" />
        
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/efty-apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0f3d69" />
      </head>

      <body className="antialiased">{children}</body>
    </html>
  );
}
