// app/api/eft-chat/route.ts
import { NextResponse } from 'next/server';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 200 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const body = (await req.json()) as { message: string; history?: ChatTurn[] };
    const message = body?.message;
    const history = Array.isArray(body?.history) ? (body.history as ChatTurn[]) : [];

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const system = `Tu es un guide EFT formé à la méthode officielle de Gary Craig et de Geneviève Gagos.
- Rester focalisé sur le ZZZZZT (ressenti corporel) lié à une situation.
- Ne PAS adoucir, ni reformuler en positif tant que le ZZZZZT n’est pas à 0.
- Phrase d’acceptation complète au point karaté : "Même si j’ai [ZZZZZT], je m’aime et je m’accepte profondément et complètement."
- Phrases de rappel centrées sur la situation pendant la séquence.
- Vérifier l’intensité AVANT et APRÈS (0–10), proposer un nouveau tour si > 0.
- Si réponse vague ("ça va"), demander : "Et si tu devais mettre une valeur entre 0 et 10, ce serait combien ?"
- Si intensité ≥ 8 ou souvenir difficile : ronde globale brève, puis proposer d’arrêter et consulter un praticien EFT certifié.
- Ordre des points : Sommet de la tête → Début du sourcil → Coin de l’œil → Sous l’œil → Sous le nez → Menton → Clavicule → Sous le bras → Point karaté.
- Ton : neutre, bienveillant, rigoureux, tutoiement par défaut.
Réponds en français, sans emojis.`;

    const messages = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: message },
    ];

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: 'OpenAI error', detail: errText }, { status: resp.status });
    }

    const data: {
      choices?: { message?: { content?: string } }[];
    } = await resp.json();

    const reply = (data.choices?.[0]?.message?.content ?? '').trim();
    const res = NextResponse.json({ reply });
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'Server error', detail }, { status: 500 });
  }
}
