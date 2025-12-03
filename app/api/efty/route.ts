// app/api/efty/route.ts — version améliorée : gestion crises + suppression message si fausse alerte
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { EFT_SYSTEM_PROMPT } from "./eft-prompt";
import "server-only";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Types (minimal)
type Role = "user" | "assistant";
interface ChatMessage { role: Role; content: string; }
interface MotsClient {
  emotion?: string;
  sensation?: string;
  localisation?: string;
  pensee?: string;
  souvenir?: string;
}
type Payload = {
  sessionId?: string;
  clientMessageId?: string;
  messages?: ChatMessage[];
  message?: string;
  mots_client?: MotsClient;
  injectRappels?: boolean;
  rappelsVoulus?: number;
};

// --- Micro-grammaire rappels (very small, non-invasive)
function generateRappelsBruts(m?: MotsClient): string[] {
  if (!m) return [];
  const out = new Set<string>();
  const push = (s?: string) => {
    if (!s) return;
    const t = s.trim().replace(/\s+/g, " ");
    if (t && t.length <= 40) out.add(t);
  };
  if (m.emotion) push(`cette ${m.emotion}`);
  if (m.sensation && m.localisation) push(`cette ${m.sensation} dans ${m.localisation}`);
  if (m.sensation && !m.localisation) push(`cette ${m.sensation}`);
  if (m.pensee) push(`cette pensée : « ${m.pensee} »`);
  return Array.from(out).slice(0, 6);
}

/* ---------- Gestion crise : patterns 3 niveaux + whitelist ---------- */
// EXPLICIT = formulation claire (mais on demandera d'abord la question binaire
// sauf si elle contient un indicateur d'urgence immédiate)
const CRISIS_EXPLICIT: RegExp[] = [
  /\bje\s+(vais|veux)\s+me\s+(tuer|suicider|pendre)\b/i,
  /\bje\s+vais\s+me\s+faire\s+du\s+mal\b/i,
  /\bje\s+vais\s+mourir\b/i,
  /\b(kill\s+myself|i\s+want\s+to\s+die|i'm going to kill myself)\b/i,
];

// Indicateurs d'urgence immédiate — si présents avec EXPLICIT => bloc immédiat
const CRISIS_IMMEDIATE_INDICATORS: RegExp[] = [
  /\b(maintenant|tout de suite|à l'instant|immédiat|tout de suite|right now)\b/i,
  /\b(desormais|tout de suite|dans\s+un\s+instant)\b/i
];

// PROBABLE = poser question binaire (ask yes/no)
const CRISIS_PROBABLE: RegExp[] = [
  /\b(j[’']?ai\s+envie\s+de\s+mourir)\b/i,
  /\b(j[’']?en\s+ai\s+marre\s+de\s+la\s+vie)\b/i,
  /\b(plus\s+d[’']?envie\s+de\s+vivre)\b/i,
  /\b(je\s+veux\s+dispara[iî]tre)\b/i,
  /\b(id[ée]es?\s+noires?)\b/i,
];

// SOFT = malaise / ras-le-bol isolé -> soft prompt (monitor)
const CRISIS_SOFT: RegExp[] = [
  /\b(j[’']?en\s*peux?\s+plus)\b/i,
  /\b(j[’']?ai\s+marre)\b/i,
  /\b(ras[-\s]?le[-\s]?bol)\b/i,
  /\b(la\s+vie\s+me\s+(saoule|fatigue|d[aé]go[uû]te))\b/i,
];

// whitelist collocations (évite faux positifs, ex: "de rire")
const WHITELIST_COLLISIONS: RegExp[] = [
  /\b(de\s+rire|pour\s+rigoler|c'est\s+pour\s+rigoler|je\s+plaisante)\b/i
];

const ASK_SUICIDE_Q_TU =
  "Avant toute chose, as-tu des idées suicidaires en ce moment ? (réponds par oui ou non)";

function crisisBlockMessage(): string {
  return (
`⚠️ Je ne peux pas continuer cette conversation : il semble que tu sois en danger.
Si tu es en France, appelle immédiatement le 15 (SAMU) ou le 3114 (prévention du suicide, 24/7).
Si tu es à l’étranger, contacte les services d'urgence locaux (112).`
  );
}

function softSecurityPrompt(): string {
  return (
    "J'entends que c’est difficile en ce moment. Avant de poursuivre, veux-tu me dire si tu te sens en danger maintenant ? (réponds par oui ou non)"
  );
}

function matchAny(xs: RegExp[], s: string) {
  return xs.some(rx => rx.test(s));
}

function hasWhitelistCollision(s: string) {
  return WHITELIST_COLLISIONS.some(rx => rx.test(s));
}

/* ---------- interprétation oui/non (robuste) ---------- */
const YES_PATTERNS: RegExp[] = [
  /^(?:oui|ouais|si|yep|yeah|yes|affirmatif)\b/i,
  /\b(?<!pas\s)(?:oui|ouais|yes)\b/i
];
const NO_PATTERNS: RegExp[] = [
  /^(?:non|nan|nope|pas du tout)\b/i,
  /\b(aucune?\s+id[ée]e\s+suicidaire|je\s+ne\s+veux\s+pas)\b/i
];

function interpretYesNo(text: string): "yes" | "no" | "unknown" {
  const t = (text||"").trim().toLowerCase();
  const hasYes = YES_PATTERNS.some(rx => rx.test(t));
  const hasNo = NO_PATTERNS.some(rx => rx.test(t));
  if (hasYes && !hasNo) return "yes";
  if (hasNo && !hasYes) return "no";
  return "unknown";
}

/* ---------- Session store (simple mémoire) ---------- */
/* Attention : en serverless ou scale horizontal, ce store est éphémère.
   Pour production, utiliser Redis / session-store partagé. */
type CrisisSession = {
  state: "normal" | "asked_suicide" | "blocked_crisis" | "monitoring";
  askCount: number;
  lastAskedTs?: number;
  flaggedClientMessageId?: string | null;
};
const CRISIS_SESSIONS = new Map<string, CrisisSession>();

function getSession(key: string): CrisisSession {
  if (!CRISIS_SESSIONS.has(key)) {
    CRISIS_SESSIONS.set(key, { state: "normal", askCount: 0, flaggedClientMessageId: null });
  }
  return CRISIS_SESSIONS.get(key)!;
}
function clearSession(key: string) {
  CRISIS_SESSIONS.delete(key);
}

/* ---------- Handlers ---------- */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new NextResponse("Origine non autorisée (CORS).", { status: 403 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Configuration manquante." }, { status: 500 });
  }

  let body: Payload = {};
  try {
    const raw = (await req.json()) as unknown;
    if (raw && typeof raw === "object") body = raw as Payload;
  } catch {
    return NextResponse.json({ error: "Requête JSON invalide." }, { status: 400 });
  }

  const history: ChatMessage[] = isChatMessageArray(body.messages) ? body.messages : [];
  const single: string = typeof body.message === "string" ? body.message.trim() : "";

  // Build last user text
  const lastUser = history.filter((m) => m.role === "user").slice(-1)[0]?.content?.trim() || single || "";
  const lastUserLower = lastUser.toLowerCase();

  // Session key (préférer sessionId côté client)
  const sessionKey = (body.sessionId?.toString().trim()) || (body.clientMessageId?.toString().trim()) || (origin || "anon");
  const sess = getSession(sessionKey);

  // Headers pour réponse CORS
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin || "",
    Vary: "Origin",
  });

  // ---------- Interception sécurité AVANT modèle ----------
  // If session already blocked, keep it blocked (safe default)
  if (sess.state === "blocked_crisis") {
    console.warn(`[CRISIS] session ${sessionKey}: request received but session already blocked -> returning block.`);
    return new NextResponse(JSON.stringify({
      answer: crisisBlockMessage(),
      crisis: "block",
      clientAction: { blockInput: true, removeFlaggedMessage: false }
    }), { headers });
  }

  // 1) si on est déjà en état 'asked_suicide' : interpréter la réponse utilisateur
  if (sess.state === "asked_suicide") {
    const yn = interpretYesNo(lastUser);

    if (yn === "yes") {
  // confirmation -> bloc immédiat
  sess.state = "blocked_crisis";
  console.warn(`[CRISIS] session ${sessionKey}: user confirmed suicidal ideation.`);
  return new NextResponse(JSON.stringify({
    answer: crisisBlockMessage(),
    crisis: "block",
    clientAction: {
      blockInput: true,
      removeFlaggedMessage: false,
      flaggedClientMessageId: sess.flaggedClientMessageId ?? null
    }
  }), { headers });
}


    if (yn === "no") {
      const flaggedId = sess.flaggedClientMessageId;
      clearSession(sessionKey);
      return new NextResponse(JSON.stringify({
        answer: "Merci pour ta réponse. Si à un moment tu te sens en danger, contacte le 3114 (24/7). Quand tu veux, décris en une phrase ce qui te dérange maintenant.",
        crisis: "none",
        clientAction: {
          removeFlaggedMessage: !!flaggedId,
          flaggedClientMessageId: flaggedId ?? null,
          blockInput: false
        }
      }), { headers });
    }

    // unknown -> relancer jusqu'à 2 fois, puis bloc
    sess.askCount = (sess.askCount || 0) + 1;
    if (sess.askCount >= 2) {
      sess.state = "blocked_crisis";
      console.warn(`[CRISIS] session ${sessionKey}: no clear answer after ${sess.askCount} asks -> block.`);
      return new NextResponse(JSON.stringify({
        answer: crisisBlockMessage(),
        crisis: "block",
        clientAction: {
          blockInput: true,
          removeFlaggedMessage: false
        }
      }), { headers });
    }

    // relancer question binaire
    return new NextResponse(JSON.stringify({
      answer: "Je n’ai pas bien compris. Peux-tu répondre par « oui » ou « non », s’il te plaît ?",
      crisis: "ask",
      clientAction: { focusInput: true }
    }), { headers });
  }

  // 2) EXPLICIT triggers -> normalement illustration claire.
  //     We will *ask first* unless an IMMEDIATE indicator is present.
  if (matchAny(CRISIS_EXPLICIT, lastUserLower) && !hasWhitelistCollision(lastUserLower)) {
    // If message includes an immediate indicator -> block immediately
    if (matchAny(CRISIS_IMMEDIATE_INDICATORS, lastUserLower)) {
      console.warn(`[CRISIS] session ${sessionKey}: explicit immediate indicator matched -> block.`);
      sess.state = "blocked_crisis";
      return new NextResponse(JSON.stringify({
        answer: crisisBlockMessage(),
        crisis: "block",
        clientAction: { blockInput: true, removeFlaggedMessage: false }
      }), { headers });
    }

    // Otherwise, ask first (binary question) before blocking
    sess.state = "asked_suicide";
    sess.askCount = 0;
    sess.lastAskedTs = Date.now();
    sess.flaggedClientMessageId = body.clientMessageId ?? null;
    console.info(`[CRISIS] session ${sessionKey}: explicit pattern matched -> ASK_SUICIDE_Q (flaggedId=${sess.flaggedClientMessageId})`);
    return new NextResponse(JSON.stringify({
      answer: ASK_SUICIDE_Q_TU,
      crisis: "ask",
      clientAction: {
        removeFlaggedMessage: false,
        flaggedClientMessageId: sess.flaggedClientMessageId ?? null,
        focusInput: true
      },
      forceAsk: true
    }), { headers });
  }

  // 3) PROBABLE triggers -> pose la question binaire
  if (matchAny(CRISIS_PROBABLE, lastUserLower) && !hasWhitelistCollision(lastUserLower)) {
    sess.state = "asked_suicide";
    sess.askCount = 0;
    sess.lastAskedTs = Date.now();
    sess.flaggedClientMessageId = body.clientMessageId ?? null;
    console.info(`[CRISIS] session ${sessionKey}: probable pattern matched -> ask suicide question (flaggedId=${sess.flaggedClientMessageId})`);
    return new NextResponse(JSON.stringify({
      answer: ASK_SUICIDE_Q_TU,
      crisis: "ask",
      clientAction: {
        removeFlaggedMessage: false,
        flaggedClientMessageId: sess.flaggedClientMessageId ?? null,
        focusInput: true
      },
      forceAsk: true
    }), { headers });
  }

  // 4) SOFT triggers -> soft prompt (no block, monitor)
  if (matchAny(CRISIS_SOFT, lastUserLower) && !hasWhitelistCollision(lastUserLower)) {
    sess.state = "monitoring";
    sess.lastAskedTs = Date.now();
    sess.flaggedClientMessageId = body.clientMessageId ?? null;
    console.info(`[CRISIS] session ${sessionKey}: soft pattern matched -> soft security prompt.`);
    return new NextResponse(JSON.stringify({
      answer: softSecurityPrompt(),
      crisis: "soft",
      clientAction: {
        flaggedClientMessageId: sess.flaggedClientMessageId ?? null,
        removeFlaggedMessage: false,
        focusInput: true
      },
      forceAsk: true
    }), { headers });
  }

  // otherwise -> proceed to normal EFT flow (call OpenAI)
  // ---------- End Interception ----------

  // Build messages: system prompt first, then history (minimal)
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: EFT_SYSTEM_PROMPT },
  ];

  if (history.length > 0) {
    messages.push(...history.map((m) => ({ role: m.role, content: m.content })));
  } else if (single) {
    messages.push({ role: "user", content: single });
  } else {
    return NextResponse.json({ error: "Aucun message fourni." }, { status: 400 });
  }

  // --- Optional: inject simple rappels JSON (non-invasive)
  const injectRappels = body.injectRappels !== false;
  const rappelsVoulus = typeof body.rappelsVoulus === "number" ? body.rappelsVoulus : 6;
  const candidats = generateRappelsBruts(body.mots_client);
  if (injectRappels && candidats.length > 0) {
    messages.push({
      role: "user",
      content: JSON.stringify({
        meta: "CANDIDATS_RAPPELS",
        candidats_app: candidats,
        voulu: rappelsVoulus,
      }),
    });
  }

  // ---- Minimal STATE push (stateless-friendly, non prescriptif)
  const lastUserForState = lastUser;
  messages.push({
    role: "user",
    content: JSON.stringify({
      meta: "STATE",
      history_len: history.length,
      last_user: lastUserForState,
    }),
  });

  // Gentle reminder : le prompt reste souverain (ΔSUD, pile d’aspects, nuances SUD…)
  messages.push({
    role: "user",
    content:
      "NOTE: Respecte strictement le rythme et le barème décrits dans le SYSTEM PROMPT. " +
      "La pile d’aspects et la logique ΔSUD sont entièrement pilotées par le prompt système. " +
      "N’ajoute aucune logique serveur, applique simplement le flux décrit.",
  });

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.5,
      messages,
    });

    const text =
      completion.choices?.[0]?.message?.content?.trim() ??
      "Je n’ai pas compris. Peux-tu reformuler en une phrase courte ?";

    if (sess.state === "monitoring") {
      sess.state = "normal";
      sess.askCount = 0;
      sess.flaggedClientMessageId = null;
    }

    return new NextResponse(JSON.stringify({ answer: text, crisis: "none", clientAction: { blockInput: false } }), { headers });
  } catch (err) {
    console.error("openai error:", err);
    return NextResponse.json({ error: "Service temporairement indisponible." }, { status: 503 });
  }
}

export function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin! : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  return new NextResponse(null, { status: 204, headers });
}

/* --- helper CORS check (kept at bottom) --- */
function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  const o = origin.toLowerCase();
  const ALLOWED = new Set([
    "https://appli.ecole-eft-france.fr",
    "https://www.ecole-eft-france.fr",
  ]);
  if (process.env.VERCEL_ENV === "production") return ALLOWED.has(o);
  if (o.startsWith("http://localhost")) return true;
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return o === `https://${process.env.VERCEL_URL}` || ALLOWED.has(o);
  }
  return ALLOWED.has(o);
}

/* ---------- Utility to validate incoming shape ---------- */
function isChatMessageArray(x: unknown): x is ChatMessage[] {
  return Array.isArray(x) && x.every((m) => typeof m === "object" && m !== null && "role" in m && "content" in m);
}
