/*
 * Smart Typography FR : correction d'un texte déjà écrit, et repérage des
 * espacements fautifs.
 * Copyright (c) 2026 Matthieu Thomas (cidrolin)
 *
 * SPDX-License-Identifier: GPL-3.0-only OR MIT
 *
 * Ce fichier suit la licence GPL-3.0 du plugin et peut en outre être
 * réutilisé sous la licence MIT, aux mêmes conditions que frenchRules.ts.
 */

import { SmartTypographySettings } from "types";

// Portions que la correction ne doit jamais toucher : code, maths, liens, URL.
// Le premier motif ne s'applique qu'en début de texte (pas de drapeau `m`) :
// c'est le bloc de métadonnées, qu'une insécable avant « : » casserait.
const PROTECTED_RE = new RegExp(
  [
    "^---\\r?\\n[\\s\\S]*?\\r?\\n---",
    "```[\\s\\S]*?```",
    "`[^`\\n]*`",
    "\\$\\$[\\s\\S]*?\\$\\$",
    "\\$[^\\s$][^$\\n]*\\$",
    "!?\\[\\[[^\\]\\n]*\\]\\]",
    "!?\\[[^\\]\\n]*\\]\\([^)\\n]*\\)",
    // Définition de référence « [ref]: url » ou de note « [^1]: texte » en
    // début de ligne : seul le libellé et son deux-points sont couverts.
    "(?<=^|\\n)[ \\t]{0,3}\\[\\^?[^\\]\\n]*\\]:",
    // Marqueur de callout : [!NOTE], [!WARNING]-…
    "\\[!\\w+\\][+-]?",
    // Entité HTML : &nbsp; &amp; &#39; &#x27;…
    "&(?:[a-zA-Z]+|#\\d+|#x[0-9a-fA-F]+);",
    // Commentaire Obsidian : %% … %%, sur une ou plusieurs lignes.
    "%%[\\s\\S]*?%%",
    "<[^>\\n]+>",
    "[a-z][a-z0-9+.-]*:\\/\\/\\S+",
    "www\\.\\S+",
  ].join("|"),
  "g"
);

export function protectedRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  const re = new RegExp(PROTECTED_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

interface TypoRule {
  pattern: RegExp;
  replacement: string;
}

// Toutes les règles n'avalent que des espaces horizontales ([^\S\r\n], qui
// couvre aussi les insécables existantes) : aucune ne fusionne deux lignes, et
// relancer la correction sur un texte déjà correct ne change rien.
function rulesFor(s: SmartTypographySettings): TypoRule[] {
  const fine = s.frNarrowSpace;
  const nb = s.frNbSpace;
  const rules: TypoRule[] = [];

  if (s.frenchGuillemets) {
    // Guillemets droits appariés sur une même ligne → guillemets français.
    rules.push({ pattern: /"([^"\n]*)"/g, replacement: `«${fine}$1${fine}»` });
  }
  if (s.curlyQuotes) {
    rules.push({ pattern: /'/g, replacement: s.closeSingle });
  }
  if (s.ellipsis) {
    rules.push({ pattern: /\.\.\./g, replacement: "…" });
  }
  // Espace parasite avant une virgule.
  rules.push({ pattern: /[^\S\r\n]+,/g, replacement: "," });
  // Avant ; ! ? : les suites comme « ?! » n'en reçoivent qu'une seule, et un
  // signe en début de ligne est laissé tel quel.
  rules.push({ pattern: /(\S)[^\S\r\n]*([;!?]+)/g, replacement: `$1${fine}$2` });

  if (s.frenchPercent) {
    // Un « %% », délimiteur de commentaire Obsidian, n'est pas un pourcentage.
    rules.push({ pattern: /(\d)[^\S\r\n]*%(?!%)/g, replacement: `$1${nb}%` });
  }
  if (s.frenchColon) {
    // Uniquement si le deux-points termine un mot et est suivi d'une espace,
    // d'une fin de ligne ou d'un marqueur d'emphase : 12:30, key::value,
    // C:\dossier et les URL restent intacts.
    rules.push({
      pattern: /([^\s:])[^\S\r\n]*:(?=[^\S\r\n]|[*_]|$)/gm,
      replacement: `$1${nb}:`,
    });
  }
  if (s.frenchGuillemets) {
    rules.push({ pattern: /«[^\S\r\n]*(\S)/g, replacement: `«${fine}$1` });
    rules.push({ pattern: /(\S)[^\S\r\n]*»/g, replacement: `$1${fine}»` });
  }

  return rules;
}

// Corrige le texte selon les réglages du plugin, hors des zones protégées.
export function applyFrenchTypography(
  text: string,
  s: SmartTypographySettings
): string {
  const rules = rulesFor(s);
  const fix = (chunk: string) =>
    rules.reduce((out, { pattern, replacement }) => out.replace(pattern, replacement), chunk);

  let result = "";
  let last = 0;
  for (const [start, end] of protectedRanges(text)) {
    result += fix(text.slice(last, start)) + text.slice(start, end);
    last = end;
  }
  return result + fix(text.slice(last));
}

/* ------------------------------------------------------------------ */
/* Repérage des espacements fautifs                                    */
/* ------------------------------------------------------------------ */

// Côté du signe où l'insécable est attendue : devant ; ! ? : % », derrière «.
export type SignSide = "before" | "after";

type Kind = "stop" | "percent" | "colon" | "guillemet";

const kindEnabled = (kind: Kind, s: SmartTypographySettings) =>
  kind === "stop" ||
  (kind === "percent" && s.frenchPercent) ||
  (kind === "colon" && s.frenchColon) ||
  (kind === "guillemet" && s.frenchGuillemets);

// Espace ordinaire (ou tabulation) là où le français impose une insécable : c'est
// elle qui autorise un retour à la ligne devant la ponctuation. Une insécable
// déjà présente n'est jamais signalée, mais ne rachète pas une espace ordinaire
// qui la côtoie. Le groupe capturé est la part de la suite d'espaces qui sépare
// l'espace fautive du signe, de quoi situer ce dernier.
const WRONG_SPACE_PATTERNS: { pattern: string; side: SignSide; kind: Kind }[] = [
  // Avant ; ! ? — un « ! » suivi de « [ » ouvre une image ou une intégration.
  { pattern: "(?<=\\S[^\\S\\r\\n]*)[ \\t]+(?=([^\\S\\r\\n]*)(?:[;?]|!(?!\\[)))", side: "before", kind: "stop" },
  { pattern: "(?<=\\d[^\\S\\r\\n]*)[ \\t]+(?=([^\\S\\r\\n]*)%(?!%))", side: "before", kind: "percent" },
  { pattern: "(?<=[^\\s:][^\\S\\r\\n]*)[ \\t]+(?=([^\\S\\r\\n]*):(?:[ \\t]|[*_]|$))", side: "before", kind: "colon" },
  { pattern: "(?<=«([^\\S\\r\\n]*))[ \\t]+(?=[^\\S\\r\\n]*\\S)", side: "after", kind: "guillemet" },
  { pattern: "(?<=\\S[^\\S\\r\\n]*)[ \\t]+(?=([^\\S\\r\\n]*)»)", side: "before", kind: "guillemet" },
];

// Pendant, sans aucune espace : motifs de largeur nulle, positionnés là où
// l'espace manquante devrait être insérée.
const MISSING_SPACE_PATTERNS: { pattern: string; side: SignSide; kind: Kind }[] = [
  { pattern: "(?<=[^\\s;!?])(?=[;?]|!(?!\\[))", side: "before", kind: "stop" },
  { pattern: "(?<=\\d)(?=%(?!%))", side: "before", kind: "percent" },
  { pattern: "(?<=[^\\s:])(?=:(?:[ \\t]|[*_]|$))", side: "before", kind: "colon" },
  { pattern: "(?<=«)(?=[^\\s])", side: "after", kind: "guillemet" },
  { pattern: "(?<=[^\\s])(?=»)", side: "before", kind: "guillemet" },
];

// Signes dont l'espacement est fautif — insécable absente, ou doublée d'une
// espace ordinaire —, triés, chacun avec le côté où l'insécable est attendue.
// Le repère se pose sur le signe : jamais de la syntaxe que l'aperçu en direct
// masque, contrairement au caractère qui le précède parfois (**Note**:).
export function findFaultySigns(
  text: string,
  s: SmartTypographySettings
): [number, SignSide][] {
  const protectedSpans = protectedRanges(text);
  const signs = new Map<number, SignSide>();

  for (const { pattern, side, kind } of WRONG_SPACE_PATTERNS) {
    if (!kindEnabled(kind, s)) continue;
    const re = new RegExp(pattern, kind === "colon" ? "gm" : "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (protectedSpans.some(([a, b]) => start < b && end > a)) continue;
      const gap = match[1].length;
      signs.set(side === "before" ? end + gap : start - gap - 1, side);
    }
  }

  for (const { pattern, side, kind } of MISSING_SPACE_PATTERNS) {
    if (!kindEnabled(kind, s)) continue;
    const re = new RegExp(pattern, kind === "colon" ? "gm" : "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const pos = match.index;
      // `pos <= b` : un signe juste après une portion protégée (`code`!) n'est
      // jamais signalé, faute de contexte, comme pour la correction.
      if (!protectedSpans.some(([a, b]) => pos > a && pos <= b)) {
        signs.set(side === "before" ? pos : pos - 1, side);
      }
      // Motifs de largeur nulle : lastIndex n'avance pas tout seul.
      if (re.lastIndex === pos) re.lastIndex++;
    }
  }

  return [...signs].sort((a, b) => a[0] - b[0]);
}
