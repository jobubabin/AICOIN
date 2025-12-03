// lib/sudLogic.ts
// Outil de gestion du SUD côté backend (TypeScript)

export type SudCase =
  | "INITIAL"
  | "ZERO"
  | "PETIT_RESTE"
  | "DELTA_FAIBLE"
  | "DELTA_FORT"
  | "AUGMENTATION";

export interface SudEvaluation {
  previousSud: number | null;
  currentSud: number;
  delta: number | null;
  case: SudCase;
}

/**
 * Force le SUD dans l’intervalle [0,10].
 */
export function normalizeSud(value: number): number {
  if (Number.isNaN(value)) {
    throw new Error("SUD must be a valid number");
  }
  if (value < 0) return 0;
  if (value > 10) return 10;
  return value;
}

/**
 * Calcule Δ et détermine le cas logique pour le SUD.
 */
export function evaluateSud(
  previousSud: number | null,
  rawCurrentSud: number
): SudEvaluation {
  const currentSud = normalizeSud(rawCurrentSud);

  // 1) Premier SUD sur cet aspect
  if (previousSud === null) {
    return {
      previousSud: null,
      currentSud,
      delta: null,
      case: "INITIAL",
    };
  }

  const delta = previousSud - currentSud;

  // 2) SUD = 0 → fermeture d’aspect
  if (currentSud === 0) {
    return {
      previousSud,
      currentSud,
      delta,
      case: "ZERO",
    };
  }

  // 3) Petit reste : SUD = 1 ou <1
  if (currentSud <= 1) {
    return {
      previousSud,
      currentSud,
      delta,
      case: "PETIT_RESTE",
    };
  }

  // 4) Augmentation du SUD
  if (currentSud > previousSud) {
    return {
      previousSud,
      currentSud,
      delta,
      case: "AUGMENTATION",
    };
  }

  // 5) Ici currentSud > 1 et currentSud <= previousSud → Δ >= 0
  if (delta >= 2) {
    return {
      previousSud,
      currentSud,
      delta,
      case: "DELTA_FORT",
    };
  }

  // 6) Δ = 0 ou 1 → Δ faible
  return {
    previousSud,
    currentSud,
    delta,
    case: "DELTA_FAIBLE",
  };
}

/**
 * Construit le bloc texte à injecter dans le prompt système.
 */
export function buildSudStateBlock(
  aspectLabel: string,
  sudEval: SudEvaluation
): string {
  return `
[ÉTAT_SUD]
ASPECT_COURANT = "${aspectLabel}"
ANCIEN_SUD = ${sudEval.previousSud ?? "non_defini"}
NOUVEAU_SUD = ${sudEval.currentSud}
DELTA = ${sudEval.delta ?? "non_defini"}
CAS_SUD = "${sudEval.case}"
[/ÉTAT_SUD]
`.trim();
}
