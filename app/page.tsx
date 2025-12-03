"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  FormEvent,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import EFTPointsReference from "@/components/EFTPointsReference";

/* ---------- Constantes globales pour la promo mobile ---------- */
const PAYPAL_URL = "https://paypal.me/efty25";
const DISMISS_KEY = "efty_promo_dismissed_at_v1";

/* ---------- Utilitaire id léger (évite dépendances) ---------- */
function makeId(prefix = "") {
  return prefix + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

/* ---------- Bouton AYNI ---------- */
function AyniButton({ className = "" }: { className?: string }) {
  return (
    <div className={"flex justify-center " + className}>
      <a
        href={PAYPAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={
          "inline-flex items-center gap-3 rounded-xl border px-4 py-2 shadow-sm bg-white hover:bg-gray-50 active:scale-[0.99] transition"
        }
        aria-label="Soutenir EFTY sur PayPal"
      >
        <span aria-hidden className="text-2xl leading-none">❤️</span>
        <span className="font-medium text-[#0f3d69]">Soutenir EFTY</span>
      </a>
    </div>
  );
}

/* ---------- Types ---------- */
type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string };
type CrisisFlag = "none" | "ask" | "lock";
type ToastState = { msg: string; key: number } | null;

/* ---------- Carte Promo (desktop) ---------- */
function PromoCard() {
  return (
    <aside
      className="rounded-xl border bg-[#F3EEE6] text-[#0f3d69] p-4 shadow-sm"
      role="complementary"
      aria-label="Promotion EFTY"
    >
      <div>
        <h2 className="text-xl font-semibold mb-1">Pour aller plus loin avec l&apos;EFT</h2>
        <p className="text-sm mb-3 leading-relaxed">
          Des formations fidèles à l&apos;EFT d&apos;origine et la méthode <strong>TIPS&reg;</strong>.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <a
          href="https://ecole-eft-france.fr/pages/formations-eft.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center rounded-lg bg-[#0f3d69] text-white px-4 py-3 hover:bg-[#018df9]  transition"
        >
          Se former à l&apos;EFT pour un usage professionnel
        </a>

        <a
          href="https://www.action-bien-etre.com/formation-eft-des-particuliers/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center rounded-lg bg-[#0f3d69] text-white px-4 py-3 hover:bg-[#018df9] transition"
        >
          Se former à l&apos;EFT pour un usage personnel
        </a>

        <a
          href="https://technique-eft.com/livres-eft.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center rounded-lg bg-[#0f3d69] text-white px-4 py-3 hover:bg-[#018df9] transition"
        >
          Les livres EFT de Geneviève Gagos
        </a>

        <div className="pt-2">
          <p className="text-sm opacity-80 text-center">EFTY te soutient. Voudrais-tu soutenir EFTY ?</p>
          <AyniButton className="mt-2" />
        </div>
      </div>
    </aside>
  );
}

/* ---------- Mobile Promo Modal (barre réduite INAMOVIBLE on mobile) ---------- */
function MobilePromoModal() {
  type MqlWithLegacy = MediaQueryList & {
    addListener?: (listener: (e: MediaQueryListEvent) => void) => void;
    removeListener?: (listener: (e: MediaQueryListEvent) => void) => void;
  };

  const [mounted, setMounted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [minimizedVisible, setMinimizedVisible] = useState(false);
  const [justOpened, setJustOpened] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const readInfo = (): { minimizedPreferred?: boolean } => {
      try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return {};
        if (/^\d+$/.test(raw)) return { minimizedPreferred: true };
        return JSON.parse(raw) || {};
      } catch {
        return {};
      }
    };

    const mql = window.matchMedia("(max-width: 767px)") as MqlWithLegacy;
    const info = readInfo();

    // Sur mobile : la barre réduite est toujours visible ; le modal s'ouvre seulement si l'utilisateur
    // n'a pas déjà exprimé la préférence "minimizedPreferred".
    const isMobile = mql.matches;
    setMinimizedVisible(isMobile);
    setModalVisible(isMobile && !info.minimizedPreferred);

    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = "matches" in e ? e.matches : false;
      const cur = readInfo();
      setMinimizedVisible(matches);
      setModalVisible(matches && !cur.minimizedPreferred);
    };

    if (typeof mql.addEventListener === "function") {
      const wrapped = (ev: Event) => onChange(ev as MediaQueryListEvent);
      mql.addEventListener("change", wrapped);
      return () => mql.removeEventListener?.("change", wrapped);
    } else if (typeof mql.addListener === "function") {
      mql.addListener(onChange as (e: MediaQueryListEvent) => void);
      return () => mql.removeListener?.(onChange as (e: MediaQueryListEvent) => void);
    }
    return;
  }, []);

  if (!mounted) return null;
  if (!modalVisible && !minimizedVisible) return null;

  function persistMinimizedPreferred() {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const info = raw ? JSON.parse(raw) : {};
      info.minimizedPreferred = true;
      localStorage.setItem(DISMISS_KEY, JSON.stringify(info));
    } catch {
      /* ignore */
    }
  }

  function minimizeFromModal() {
    setModalVisible(false);
    setMinimizedVisible(true);
    persistMinimizedPreferred();
  }

  function reopenFromMinimized() {
    setModalVisible(true);
    setMinimizedVisible(false);
    setJustOpened(true);
    setTimeout(() => setJustOpened(false), 600);
  }

  if (modalVisible) {
    return createPortal(
      <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 py-6 sm:items-start">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => minimizeFromModal()}
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-lg rounded-t-xl bg-[#F3EEE6] p-4 shadow-xl"
          style={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold leading-tight mb-1">Pour aller plus loin avec l&apos;EFT</h3>
              <p className="text-sm text-[#0f3d69] opacity-90 mb-2">
                Des formations fidèles à l&apos;EFT d&apos;origine et la méthode <strong>TIPS®</strong>.
              </p>
            </div>

            <div className="flex-shrink-0">
              <button
                onClick={() => minimizeFromModal()}
                aria-label="Réduire la fenêtre promotion"
                className="rounded-full bg-white border px-3 py-1 text-lg shadow-sm"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <a
              href="https://ecole-eft-france.fr/pages/formations-eft.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center rounded-lg bg-[#0f3d69] text-white px-4 py-3 hover:bg-[#036FAC] transition"
            >
              Se former à l&apos;EFT pour un usage professionnel
            </a>

            <a
              href="https://technique-eft.com/livres-eft.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center rounded-lg bg-[#0f3d69] text-white px-4 py-3 hover:bg-[#036FAC] transition"
            >
              Les livres EFT
            </a>

            <a
              href="https://www.action-bien-etre.com/formation-eft-des-particuliers/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center rounded-lg bg-[#0f3d69] text-white px-4 py-3 hover:bg-[#036FAC] transition"
            >
              Se former à l&apos;EFT pour un usage personnel
            </a>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex-shrink-0">
                <AyniButton />
              </div>
            </div>

          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (minimizedVisible) {
    return createPortal(
      <div
        role="button"
        aria-label="Ouvrir la fenêtre promotion EFTY"
        onClick={() => {
          if (justOpened) return;
          reopenFromMinimized();
        }}
        className="fixed left-4 right-4 bottom-4 z-[60] mx-auto max-w-md cursor-pointer"
      >
        <div className="flex items-center justify-between rounded-full border bg-[#F3EEE6] p-2 shadow-md">
          <div className="flex items-center gap-3 px-2">
            <div className="flex-shrink-0 rounded-full bg-white p-2 border">
              <span role="img" aria-hidden>❤️</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#0f3d69]">Soutenir EFTY</div>
              <div className="text-xs text-[#0f3d69] opacity-80">Revoir la fenêtre</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-2">
            {/* intentionally no close button — the minimized bar cannot be hidden by the user */}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return null;
}

/* ---------- Alerte flottante (utilisée dans Page) ---------- */
function CrisisFloating({
  mode,
  reason,
  lastAssistant = "",
}: {
  mode: "ask" | "lock" | "none";
  reason: "none" | "medical" | "suicide" | "clarify";
  lastAssistant?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // on considère suicide si reason === "suicide" OU si le dernier assistant contient la question suicide
  const lastAssistantText = (lastAssistant || "").toLowerCase();
  const assistantSuggestsSuicide = /idées?\s+suicidaires|suicid|me\s+tuer|je\s+veux\s+me\s+tuer|je\s+vais\s+me\s+tuer|en\s+finir/i.test(
    lastAssistantText
  );

  const isSuicide = reason === "suicide" || assistantSuggestsSuicide;
  const isMedical = reason === "medical";

  const wrapper = (
    <div
      role="region"
      aria-live="assertive"
      aria-atomic="true"
      className={[
        "fixed z-50",
        "left-4 right-4 bottom-24",
        "md:left-auto md:right-6 md:top-6 md:bottom-auto md:w-[420px]",
      ].join(" ")}
    >
      <div className="rounded-xl border border-rose-300 bg-rose-50 text-rose-900 shadow-xl">
        <div className="flex items-start gap-3 px-3 py-2">
          <div className="flex-1">
            <div className="text-sm font-semibold">Message important</div>
            {!collapsed && (
              <p className="mt-0.5 text-sm opacity-80">
                Priorité à ta sécurité. En cas de danger immédiat, contacte les urgences.
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-md border border-rose-300 bg-white px-2 py-1 text-sm"
              aria-label={collapsed ? "Développer le message" : "Réduire le message"}
              title={collapsed ? "Développer" : "Réduire"}
            >
              {collapsed ? "▾" : "▴"}
            </button>
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-md border border-rose-300 bg-white px-2 py-1 text-sm"
              aria-label="Réduire"
              title="Réduire"
            >
              ×
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="px-3 pb-3">
            {/* message général */}
            <p className="text-sm">
              Il semble que tu traverses un moment difficile. Je te prends au sérieux.
              Je ne peux pas t&apos;accompagner avec l&apos;EFT dans une situation d&apos;urgence : ta sécurité est prioritaire.
            </p>

            {/* bloc numéros — adapté */}
            <div className="mt-2 rounded-lg border border-rose-200 bg-white p-2">
              <div className="text-xs font-semibold">📞 En France</div>
              <ul className="mt-1 text-sm leading-6">
                {isSuicide && <li><strong>3114</strong> — Prévention du suicide (gratuit et anonyme, 24/7)</li>}
                <li><strong>15</strong> — SAMU</li>
                <li><strong>112</strong> — Urgences (si danger immédiat)</li>
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                {isSuicide && <a href="tel:3114" className="rounded-md border border-rose-300 bg-rose-100 px-3 py-1 text-sm">Appeler 3114</a>}
                <a href="tel:112" className="rounded-md border border-rose-300 bg-rose-100 px-3 py-1 text-sm">Appeler 112</a>
                <a href="tel:15"  className="rounded-md border border-rose-300 bg-rose-100 px-3 py-1 text-sm">Appeler le 15</a>
              </div>
            </div>

            {/* question / message selon le mode (ask vs lock) */}
            {mode === "ask" && isSuicide && (
              <p className="mt-2 text-sm">
                As-tu des idées suicidaires en ce moment&nbsp;? Réponds uniquement par <strong>&quot;oui&quot;</strong> ou par <strong>&quot;non</strong>.
              </p>
            )}
            {mode === "ask" && isMedical && !isSuicide && (
              <p className="mt-2 text-sm">
                Peux-tu dire si le symptôme est une douleur apparue spontanément (sans choc) ? Réponds par <strong>oui</strong> ou <strong>non</strong>.
              </p>
            )}
            {mode === "lock" && (
              <p className="mt-2 text-sm font-semibold">
                Séance verrouillée. Si tu es en danger, appelle immédiatement l&apos;un des numéros ci-dessus.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(wrapper, document.body);
}

/* ---------- Page principale (export default) ---------- */
export default function Page() {
  // initial assistant message with generated id
  const initialAssistantMessage: Message = {
    id: makeId("msg-"),
    role: "assistant",
    content:
      "Bonjour 😊 je m'appelle EFTY.\nJe propose de t'accompagner pas à pas dans ton auto-séance d'EFT, à ton rythme et en toute bienveillance.\nBien sûr, il ne s'agit pas ici de travailler sur ton plus gros problème.\nTu auras besoin d'un professionnel pour cela.\nEn revanche on peut s'intéresser à des situations du quotidien qui peuvent être abordées en self-help.\nSur quoi souhaites-tu travailler aujourd'hui ?",
  };

  const [messages, setMessages] = useState<Message[]>([initialAssistantMessage]);

  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [crisisMode, setCrisisMode] = useState<CrisisFlag>("none");
  // nouveau : raison précise de la crise (none | medical | suicide | clarify)
  const [crisisReason, setCrisisReason] = useState<"none" | "medical" | "suicide" | "clarify">("none");

  const [toast, setToast] = useState<ToastState>(null);
  const [lastAskedSud, setLastAskedSud] = useState(false);

  const [lastFlaggedClientMessageId, setLastFlaggedClientMessageId] = useState<string | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // session stable par onglet (persistée dans localStorage)
  const sessionIdRef = useRef<string>(makeId("sess-"));

  useEffect(() => {
    try { 
      // read existing session id if present
      if (typeof window !== "undefined") {
        const existing = localStorage.getItem("efty_session_id");
        if (existing) {
          sessionIdRef.current = existing;
        } else {
          localStorage.setItem("efty_session_id", sessionIdRef.current);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  /* ---------- Utils ---------- */
  const showToast = useCallback((message: string) => {
    setToast({ msg: message, key: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }, []);

  function extractSud(v: string): number | null {
    const m = v.trim().match(/\b([0-9]|10)\b/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n >= 0 && n <= 10 ? n : null;
  }
  function inferAskFromReply(text: string) {
    const t = text.toLowerCase();
    return (
      t.includes("as-tu des idées suicidaires") ||
      t.includes("as tu des idees suicidaires") ||
      t.includes("réponds par oui ou non") ||
      t.includes("reponds par oui ou non") ||
      t.includes("réponds par oui/non") ||
      t.includes("reponds par oui/non")
    );
  }

  /* ---------- Effets ---------- */
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (crisisMode === "ask") showToast("Sécurité : réponds simplement par oui ou non.");
    if (crisisMode === "lock") showToast("Séance EFT verrouillée : appelle le 3114 / 112 si besoin.");
  }, [crisisMode, showToast]);

  useEffect(() => {
    if (!loading && crisisMode !== "lock") {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [messages, loading, crisisMode]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      const t = last.content.toLowerCase();
      if (/sud\s*\(?0[–-]10\)?|indique\s+(ton|un)\s+sud/.test(t)) setLastAskedSud(true);
    }
  }, [messages]);

  // use this to avoid eslint "assigned but never used"
  useEffect(() => {
    if (lastFlaggedClientMessageId) {
      // debug only; keeps variable 'used' for lint
      console.debug("[flaggedMessageId]", lastFlaggedClientMessageId);
    }
  }, [lastFlaggedClientMessageId]);

 /* ---------- Server response type (strict) ---------- */
type ServerResponse = {
  answer?: string;
  error?: string;
  crisis?: CrisisFlag | "block" | "ask" | "soft";
  reason?: "none" | "medical" | "suicide" | "clarify";
  clientAction?: {
    removeFlaggedMessage?: boolean;
    flaggedClientMessageId?: string | null;
    blockInput?: boolean;
    focusInput?: boolean;
  };
};

async function onSubmit(e: FormEvent) {
  e.preventDefault();
  const value = input.trim();
  if (!value || loading) return;

  // Regexs yes/no
  const YES_REGEX = /^\s*(oui|ouais|si|yes|yep)\b/i;
  const NO_REGEX = /^\s*(non|nan|nope|pas du tout)\b/i;

  // Si on attend une réponse de sécurité (oui/non), n'accepter que oui/non
  if (crisisMode === "ask") {
    if (!YES_REGEX.test(value) && !NO_REGEX.test(value)) {
      showToast("Réponds uniquement par « oui » ou « non », s'il te plaît.");
      return;
    }
    // Si l'utilisateur répond "oui", lock local immédiatement (optimistic lock)
    // *cela empêche tout envoi additionnel côté UI pendant qu'on notifie le serveur*
    if (YES_REGEX.test(value)) {
      setCrisisMode("lock");
      setCrisisReason("suicide");
      showToast("Séance verrouillée — si tu es en danger, appelle le 3114 / 15 / 112.");
      // continue quand même l'envoi pour que le serveur enregistre et déclenche ses logs/actions
    }
  }

  setError(null);
  if (lastAskedSud) {
    const sud = extractSud(value);
    if (sud !== null) setLastAskedSud(false);
  }

  // generate client message id
  const clientMessageId = makeId("msg-");
  const userMsg: Message = { id: clientMessageId, role: "user", content: value };

  // add to UI (user message)
  setMessages((prev) => [...prev, userMsg]);
  setInput("");
  setLoading(true);

  try {
    const historyToSend: Message[] = [...messages, userMsg];
    const payload = {
      sessionId: sessionIdRef.current,
      clientMessageId,
      messages: historyToSend.map((m) => ({ role: m.role, content: m.content })),
    };

    const res = await fetch("/api/efty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Réponse serveur non valide");

    const data = (await res.json()) as ServerResponse;
    const reply = (data.answer || data.error || "").trim();

    // --- traiter PRIORITAIREMENT les flags de sécurité retournés par le serveur ---
    const serverCrisisRaw = data.crisis ?? "none";
    const serverCrisis = serverCrisisRaw === "block" ? "lock" : (serverCrisisRaw as CrisisFlag | "soft");

    const rawReason = data.reason ?? "none";
    const rawReasonStr = String(rawReason);
    const VALID_REASONS = ["none", "medical", "suicide", "clarify"] as const;
    const serverReason = (VALID_REASONS as readonly string[]).includes(rawReasonStr)
      ? (rawReasonStr as "none" | "medical" | "suicide" | "clarify")
      : "none";

    const clientAction = data.clientAction ?? {};

    // si serveur demande de supprimer le message flaggé (fausse alerte), et fournit flaggedClientMessageId
    if (clientAction.removeFlaggedMessage && clientAction.flaggedClientMessageId) {
      const fid: string = clientAction.flaggedClientMessageId;
      setMessages((prev) => prev.filter((m) => m.id !== fid));
      setLastFlaggedClientMessageId(null);
      showToast("Message supprimé pour éviter la confusion.");
    }

    if (clientAction.flaggedClientMessageId) {
      setLastFlaggedClientMessageId(clientAction.flaggedClientMessageId);
    }

    // Si serveur exige un blocage -> l'appliquer immédiatement (priorité haute)
    if (clientAction.blockInput || serverCrisis === "lock") {
      setCrisisMode("lock");
      setCrisisReason(serverReason);
    } else {
      // ask / soft / none
      if (serverCrisis === "ask") {
        setCrisisMode("ask");
        setCrisisReason(serverReason);
      } else if (serverCrisis === "soft") {
        setCrisisMode("ask"); // soft uses ask UI (clarify)
        setCrisisReason(serverReason);
      } else {
        setCrisisMode("none");
        setCrisisReason("none");
      }
    }

    // append assistant message (on l'affiche après avoir appliqué le flag de sécurité)
    setMessages((prev) => [
      ...prev,
      { id: makeId("msg-"), role: "assistant", content: reply || "Je n'ai pas pu générer de réponse." },
    ]);

    // focus input si demandé (si pas lock)
    if (clientAction.focusInput && inputRef.current && crisisMode !== "lock") inputRef.current.focus();

    // fallback : si le serveur n'a rien envoyé mais la réponse contient la question de triage,
    // on active 'ask' côté client pour inviter la réponse (raison = suicide par défaut)
    if (!data.crisis && inferAskFromReply(reply)) {
      setCrisisMode("ask");
      setCrisisReason("suicide");
    }
  } catch (error) {
    console.error(error);
    setError("Le service est momentanément indisponible. Réessaie dans un instant.");
    setMessages((prev) => [
      ...prev,
      { id: makeId("msg-"), role: "assistant", content: "Désolé, je n'ai pas pu répondre. Réessaie dans un instant." },
    ]);
  } finally {
    setLoading(false);
  }
}



  /* ---------- Render ---------- */

  // petit helper : dernier texte assistant (utilisé pour forcer l'affichage 3114 si nécessaire)
  const lastAssistantText = messages.slice().reverse().find((m) => m.role === "assistant")?.content ?? "";
  const assistantSuggestsSuicide = /idées?\s+suicidaires|suicid|me\s+tuer|je\s+veux\s+me\s+tuer|je\s+vais\s+me\s+tuer|en\s+finir/i.test(
    (lastAssistantText || "").toLowerCase()
  );

  return (
    <main className="mx-auto max-w-6xl p-6">
      {/* Bandeau haut */}
      <div className="rounded-2xl border bg-[#F3EEE6] text-[#0f3d69] p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-wide uppercase opacity-80">Édition spéciale</p>
            <h1 className="text-xl sm:text-2xl font-semibold">30 ans d&apos;EFT — 1995 → 2025</h1>
            <p className="text-sm mt-1 opacity-90">
              Une pratique de libération émotionnelle transmise avec rigueur et bienveillance.
            </p>
          </div>
          <Image
            src="https://ecole-eft-france.fr/assets/front/logo-a8701fa15e57e02bbd8f53cf7a5de54b.png"
            alt="Logo École EFT France"
            width={160}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </div>
      </div>

      {/* === FLEX : Chat (gauche) + Promo (droite) === */}
      <div className="flex flex-col md:flex-row md:gap-6 items-start">
        <div className="w-full md:w-2/3 space-y-6">
          <div className="mb-4">
            <EFTPointsReference className="mx-auto w-full max-w-md" />
          </div>

          <div
            ref={chatRef}
            className="h-[60vh] overflow-y-auto rounded-2xl border bg-white p-4 shadow-sm"
          >
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={m.role === "assistant" ? "flex" : "flex justify-end"}>
                  <div
                    className={
                      (m.role === "assistant"
                        ? "bg-gray-50 text-gray-900 border-gray-200"
                        : "bg-blue-50 text-blue-900 border-blue-200") +
                      " max-w-[80%] whitespace-pre-wrap rounded-2xl border px-4 py-3 shadow-sm"
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex">
                  <div className="bg-gray-50 text-gray-900 border-gray-200 rounded-2xl border px-4 py-3 shadow-sm">
                    … je réfléchis
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alerte flottante */}
          {crisisMode !== "none" && (
            <CrisisFloating mode={crisisMode} reason={crisisReason} lastAssistant={lastAssistantText} />
          )}

          {/* Formulaire */}
          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 rounded-xl border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
                placeholder="Écris ici… (ex. « J&apos;ai mal au genou », « Je me sens anxieuse », …)"
                aria-label="Saisis ton message"
                disabled={loading || crisisMode === "lock"}
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || crisisMode === "lock"}
                className="rounded-xl border px-4 py-2 shadow-sm bg-white text-[#0f3d69] hover:bg-gray-50 active:scale-[0.99]"
              >
                {loading ? "Envoi..." : "Envoyer"}
              </button>
            </div>
            {crisisMode === "ask" && (
              <p className="text-sm text-[#0f3d69] opacity-80">
                Réponds simplement par <strong>oui</strong> ou <strong>non</strong>, s&apos;il te plaît.
              </p>
            )}
          </form>

          {/* Erreur / Note / Toast / Boutons urgence */}
          {error && <div className="text-red-600">{error}</div>}

          <div className="rounded-xl border bg-[#F3EEE6] text-[#0f3d69] p-4 shadow-sm mb-2">
            <strong className="block mb-1">Note de prudence</strong>
            <p className="text-sm leading-relaxed">
              Ce guide est proposé à titre informatif et éducatif. Il ne remplace en aucun cas un avis médical,
              psychologique ou professionnel.<br />
              L&apos;École EFT France et ses représentants déclinent toute responsabilité quant à l&apos;interprétation,
              l&apos;usage ou les conséquences liés à l&apos;application des informations ou protocoles présentés.<br />
              Chaque utilisateur reste responsable de sa pratique et de ses choix.
              <br /><br />
              <strong>Important :</strong> L&apos;École EFT France ou Geneviève Gagos ne voit pas et n&apos;enregistre pas
              vos échanges réalisés dans ce chat. Mais comme pour tout ce qui transite par Internet, nous vous invitons
              à rester prudents et à ne pas divulguer d&apos;éléments très personnels.
            </p>
            <p className="text-xs mt-3 opacity-80">
              — Édition spéciale 30 ans d&apos;EFT — © 2025 École EFT France — Direction Geneviève Gagos
            </p>
          </div>

          <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
          >
            <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
              {toast && (
                <div
                  key={toast.key}
                  role="status"
                  className="pointer-events-auto w-full sm:w-auto max-w-sm overflow-hidden rounded-xl border bg-white/95 backdrop-blur shadow-lg ring-1 ring-black/5"
                >
                  <div className="p-4">
                    <p className="text-sm text-gray-900">{toast.msg}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick emergency buttons — adaptés selon reason */}
          {crisisMode !== "none" && (
            <div
              aria-label="Accès rapide urgence"
              className="fixed bottom-20 right-4 z-50 flex flex-col gap-2"
            >
              {(crisisReason === "suicide" || assistantSuggestsSuicide) && (
                <a
                  href="tel:3114"
                  className="rounded-full bg-[#7a1f1f] text-white px-5 py-3 text-sm shadow-lg hover:opacity-90 transition"
                >
                  📞 3114 — Prévention du suicide (gratuit, 24/7)
                </a>
              )}
              <a
                href="tel:112"
                className="rounded-full bg-[#7a1f1f] text-white px-5 py-3 text-sm shadow-lg hover:opacity-90 transition"
              >
                🚨 112 — Urgences
              </a>
              <a
                href="tel:15"
                className="rounded-full bg-[#7a1f1f] text-white px-5 py-3 text-sm shadow-lg hover:opacity-90 transition"
              >
                🏥 15 — SAMU
              </a>
            </div>
          )}
        </div>

        {/* droite : prend 1/3 en desktop, sticky */}
        <aside className="hidden md:block md:w-1/3 md:self-start md:sticky md:top-6">
          <PromoCard />
        </aside>
      </div>

      {/* Mobile promo modal - s'affichera uniquement sur mobile */}
      <MobilePromoModal />
    </main>
  );
}
