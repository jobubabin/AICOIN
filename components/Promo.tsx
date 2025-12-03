"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./promo-module.module.css";

type Props = {
  /** Quand `mobile` est présent, on affiche la barre compacte fixée en bas (mobile only) */
  mobile?: boolean;
};

type PromoState = "expanded" | "collapsed" | "hidden";

const STORAGE_KEY = "promo.state";

export default function Promo({ mobile }: Props) {
  // Par défaut : desktop = expanded, mobile = collapsed
  const defaultState: PromoState =
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)")
      .matches
      ? "collapsed"
      : "expanded";

  const [state, setState] = useState<PromoState>(defaultState);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Charger l’état persistant
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PromoState | null;
    if (saved) setState(saved);
  }, []);

  // Gérer le padding-bottom seulement quand la barre est VISIBLE ET collée en bas (mobile)
  useEffect(() => {
    if (!mobile) return; // seulement pour la barre mobile
    const body = document.body;

    const applyPadding = () => {
      if (state === "hidden") {
        body.style.paddingBottom = "";
        return;
      }
      const el = containerRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      body.style.paddingBottom = `${Math.ceil(h)}px`;
    };

    applyPadding();
    const ro = new ResizeObserver(applyPadding);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      body.style.paddingBottom = "";
    };
  }, [state, mobile]);

  if (state === "hidden") return null;

  // Version MOBILE fixée en bas : compacte par défaut
  if (mobile) {
    return (
      <div
        ref={containerRef}
        className={`${styles.mobileBar} ${
          state === "collapsed" ? styles.compact : styles.expanded
        }`}
        role="region"
        aria-label="Informations et liens utiles"
      >
        {state === "collapsed" ? (
          <div className={styles.compactInner}>
            <button
              onClick={() => {
                setState("expanded");
                localStorage.setItem(STORAGE_KEY, "expanded");
              }}
              className={styles.expandBtn}
              aria-label="Ouvrir les informations"
            >
              Pour aller plus loin avec l&apos;EFT
            </button>
            <button
              onClick={() => {
                setState("hidden");
                localStorage.setItem(STORAGE_KEY, "hidden");
              }}
              className={styles.closeIcon}
              aria-label="Masquer"
            >
              ×
            </button>
          </div>
        ) : (
          <div className={styles.expandedInner}>
            <div className={styles.title}>Pour aller plus loin avec l&apos;EFT</div>
            <p className={styles.subtitle}>
              Des formations fidèles à l&apos;EFT d&apos;origine et la méthode{" "}
              <strong>TIPS®</strong>.
            </p>

            <div className={styles.btnGroup}>
              <a
                className={styles.btnSecondary}
                href="https://www.ecole-eft-france.fr/realigner-sa-pratique-eft/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Réaligner sa pratique EFT
              </a>
              <a
                className={styles.btnPrimary}
                href="https://www.ecole-eft-france.fr/formations-eft/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Formations EFT
              </a>
              <a
                className={styles.btnSecondary}
                href="https://www.ecole-eft-france.fr/methode-tips/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Méthode TIPS®
              </a>
            </div>

            <p className={styles.supportText}>
              EFTY te soutient. Voudrais-tu soutenir EFTY ?
            </p>
            <a
              className={styles.btnGhost}
              href="https://www.helloasso.com/associations/ecole-eft-france/formulaires/5"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Soutenir EFTY (nouvelle fenêtre)"
            >
              <span aria-hidden>❤️</span> Soutenir EFTY
            </a>

            <div className={styles.actionsRow}>
              <button
                className={styles.collapse}
                onClick={() => {
                  setState("collapsed");
                  localStorage.setItem(STORAGE_KEY, "collapsed");
                }}
                aria-label="Réduire"
              >
                Réduire
              </button>
              <button
                className={styles.close}
                onClick={() => {
                  setState("hidden");
                  localStorage.setItem(STORAGE_KEY, "hidden");
                }}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Version DESKTOP (dans la sidebar)
  return (
    <div className={styles.desktopCard} role="region" aria-labelledby="promo-h1">
      <h2 id="promo-h1" className={styles.desktopTitle}>
        Pour aller plus loin avec l&apos;EFT
      </h2>
      <p className={styles.desktopSubtitle}>
        Des formations fidèles à l&apos;EFT d&apos;origine et la méthode{" "}
        <strong>TIPS®</strong>.
      </p>

      <div className={styles.btnGroup}>
        <a
          className={styles.btnSecondary}
          href="https://www.ecole-eft-france.fr/realigner-sa-pratique-eft/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Réaligner sa pratique EFT
        </a>
        <a
          className={styles.btnPrimary}
          href="https://www.ecole-eft-france.fr/formations-eft/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Formations EFT
        </a>
        <a
          className={styles.btnSecondary}
          href="https://www.ecole-eft-france.fr/methode-tips/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Méthode TIPS®
        </a>
      </div>

      <p className={styles.supportText}>EFTY te soutient. Voudrais-tu soutenir EFTY ?</p>
      <a
        className={styles.btnGhost}
        href="https://www.helloasso.com/associations/ecole-eft-france/formulaires/5"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Soutenir EFTY (nouvelle fenêtre)"
      >
        <span aria-hidden>❤️</span> Soutenir EFTY
      </a>

      <div className="mt-4 flex justify-end">
        <button
          className={styles.closeDesktop}
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "hidden");
            // on ne modifie pas la barre mobile ici; c'est juste pour masquer côté desktop
            (document.getElementById("promo-desktop-card") as HTMLDivElement | null)?.remove();
          }}
          aria-label="Masquer cette section"
          title="Masquer"
        >
          ×
        </button>
      </div>
    </div>
  );
}
