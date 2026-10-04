/*
 * Smart Typography FR : correction d'un texte déjà écrit, et repérage des
 * fautes de typographie, selon la langue de chaque ligne.
 * Copyright (c) 2026 Matthieu Thomas (cidrolin)
 *
 * SPDX-License-Identifier: GPL-3.0-only OR MIT
 *
 * Ce fichier suit la licence GPL-3.0 du plugin et peut en outre être
 * réutilisé sous la licence MIT, aux mêmes conditions que frenchRules.ts.
 */

import { Lang, LangOptionKey, detectLanguage, parseTypoSetting } from "languages";
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


/* ------------------------------------------------------------------ */
/* Langue de chaque ligne                                              */
/* ------------------------------------------------------------------ */

// Langue imposée par la note (propriété `smart-typo`), sinon langue de repli
// pour les lignes trop courtes pour être reconnues.
export interface LangContext {
  forced: Lang | null;
  fallback: Lang;
}

export interface NoteTypo extends LangContext {
  // `smart-typo: false` : la note n'est pas vérifiée.
  disabled: boolean;
}

// Propriété de métadonnées qui règle la typographie d'une note.
export const TYPO_KEY = "smart-typo";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/;
const TYPO_PROPERTY_RE = /^smart-typo[ \t]*:[ \t]*["']?([^"'#\r\n]*?)["']?[ \t]*(?:#.*)?$/im;

// Assez de texte pour reconnaître la langue d'une note, sans relire un long
// document à chaque frappe.
const NOTE_SAMPLE = 20000;

// Remplace les portions protégées par des espaces, retours à la ligne
// conservés : le code ou les URL ne faussent pas la détection.
function withoutProtected(text: string, spans: [number, number][]): string {
  let plain = "";
  let last = 0;
  for (const [a, b] of spans) {
    plain += text.slice(last, a) + text.slice(a, b).replace(/[^\n]/g, " ");
    last = b;
  }
  return plain + text.slice(last);
}

// Réglage typographique d'une note d'après le début de son texte : propriété
// `smart-typo`, puis langue dominante du corps, puis langue par défaut.
export function noteTypo(doc: string, defaultLang: Lang): NoteTypo {
  const fm = FRONTMATTER_RE.exec(doc);
  const property = fm ? TYPO_PROPERTY_RE.exec(fm[1]) : null;
  const setting = property ? parseTypoSetting(property[1]) : null;
  const forced = setting || null;
  const start = fm ? fm[0].length : 0;
  const body = doc.slice(start, start + NOTE_SAMPLE);
  return {
    disabled: setting === false,
    forced,
    fallback:
      forced ?? detectLanguage(withoutProtected(body, protectedRanges(body))) ?? defaultLang,
  };
}

// Langue de la ligne qui contient une position : chaque ligne est reconnue à
// part, ce qui tolère une citation dans une autre langue ; une ligne trop
// courte prend la langue de la note.
function languageResolver(
  text: string,
  spans: [number, number][],
  ctx: LangContext
): (pos: number) => Lang {
  if (ctx.forced) {
    const forced = ctx.forced;
    return () => forced;
  }
  const plain = withoutProtected(text, spans);
  const starts = lineStarts(text);
  const cache = new Map<number, Lang>();
  return (pos) => {
    const line = lineIndex(starts, pos);
    let lang = cache.get(line);
    if (!lang) {
      const end = line + 1 < starts.length ? starts[line + 1] - 1 : plain.length;
      lang = detectLanguage(plain.slice(starts[line], end)) ?? ctx.fallback;
      cache.set(line, lang);
    }
    return lang;
  };
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

// Numéro de la ligne qui contient une position.
function lineIndex(starts: number[], pos: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/* ------------------------------------------------------------------ */
/* Espaces doublées                                                    */
/* ------------------------------------------------------------------ */

// Deux espaces ou plus entre deux signes d'une même ligne. Devant une
// ponctuation, c'est la règle de cette ponctuation qui signale et corrige.
const DOUBLE_SPACE_RE = /(?<=\S) {2,}(?=[^\s;:!?.,)»%])/g;
// Ligne de séparation d'un tableau : |---|:---:|, ou ---|--- sans bordure.
const TABLE_SEPARATOR_RE = /^\s*(?:>\s*)*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/;
// Début de ligne fait seulement de balisage : citation, puce, numéro, case à
// cocher. Les espaces qui le suivent alignent souvent le texte, à dessein.
const LINE_PREFIX_RE = /^[ \t]*(?:>[ \t]*)*(?:(?:[-*+]|\d+[.)])(?:[ \t]+\[.\])?)?$/;

// Lignes de tableau, où les espaces alignent les colonnes : celles qui
// commencent par « | », et celles d'un bloc de lignes à « | » qui contient une
// ligne de séparation (tableau sans bordure).
function tableLines(text: string): boolean[] {
  const lines = text.split("\n");
  const tables = lines.map((l) => /^\s*(?:>\s*)*\|/.test(l));
  for (let i = 0; i < lines.length; ) {
    let j = i;
    while (j < lines.length && lines[j].includes("|")) j++;
    if (j > i && lines.slice(i, j).some((l) => TABLE_SEPARATOR_RE.test(l))) {
      for (let k = i; k < j; k++) tables[k] = true;
    }
    i = Math.max(j, i + 1);
  }
  return tables;
}

// Positions des espaces doublées fautives : début de chaque suite d'espaces.
// Une suite collée à une portion protégée est laissée, faute de contexte.
function doubleSpaces(text: string, spans: [number, number][]): [number, number][] {
  const starts = lineStarts(text);
  const tables = tableLines(text);
  const found: [number, number][] = [];
  const re = new RegExp(DOUBLE_SPACE_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (spans.some(([a, b]) => (start < b && end > a) || b === start || a === end)) {
      continue;
    }
    const line = lineIndex(starts, start);
    if (tables[line]) continue;
    if (LINE_PREFIX_RE.test(text.slice(starts[line], start))) continue;
    found.push([start, end]);
  }
  return found;
}

// Espaces de bord de ligne : une suite d'espaces seule sur sa ligne, et une
// ou plusieurs espaces après une fin de phrase en bout de ligne (même un saut
// de ligne Markdown : après une fin de phrase, il est superflu). Dans les deux
// cas, rien à garder : la correction les supprime.
const EDGE_SPACE_SOURCE =
  "^[ \\t]+(?=\\r?$)|(?<=[.!?…»”])[ \\t]+(?=\\r?$)";

type EdgeKind = "blank-line" | "line-end";

function edgeSpaces(
  text: string,
  spans: [number, number][]
): { start: number; end: number; kind: EdgeKind }[] {
  const starts = lineStarts(text);
  const found: { start: number; end: number; kind: EdgeKind }[] = [];
  const re = new RegExp(EDGE_SPACE_SOURCE, "gm");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (spans.some(([a, b]) => start < b && end > a)) continue;
    const lineStart = starts[lineIndex(starts, start)];
    const blank = start === lineStart;
    // « 1. » ou « - » seuls : une puce vide, pas une fin de phrase.
    if (!blank && LINE_PREFIX_RE.test(text.slice(lineStart, start))) continue;
    found.push({ start, end, kind: blank ? "blank-line" : "line-end" });
  }
  return found;
}

/* ------------------------------------------------------------------ */
/* Correction                                                          */
/* ------------------------------------------------------------------ */

// Lettres de toutes les langues prises en charge : latin accentué, turc, œ,
// cyrillique.
const LETTER = "[A-Za-zÀ-ÖØ-öø-ɏЀ-ӿ]";
// Espace horizontale, insécables comprises.
const H = "[^\\S\\r\\n]";
// Ce qui peut suivre un « . » ou une « , » en fin de phrase : une espace, la fin
// du texte, ou une fermeture. Écarte « ... », « .5 », « .md » et « 3,5 ».
const END_OF_SENTENCE = "(?![^\\s)\\]»”’“*_~\"'])";
// Ce qui peut suivre « ! » ou « ? » (et, sans la parenthèse, « ; » ou « : ») :
// écarte « ![[ », « :) », « ;) », « :--- » et « :smile: ».
const STOP_END = "(?=[\\s)\\]»”’“*_~\"']|$)";
const COLON_END = "(?=[\\s\\]»”’“*_~\"']|$)";

// Mot d'élision (l', d', qu', jusqu'…), seul devant l'apostrophe : « dit ‘bonjour’ à »
// n'en est pas un.
const ELISION =
  "(?<!" + LETTER + ")(?:[cdjlmnstCDJLMNST]|[Qq]u|[Jj]usqu|[Ll]orsqu|[Pp]uisqu|[Qq]uoiqu)";

// Marque facultative collée au mot, qui n'appelle pas d'espace : chat(s), allié(e).
const PLURAL_MARK = "(?:e|s|es|x|ée|ées|ne|nes)";

const NBSP_CHAR ="\u00A0";

// Guillemets des langues autres que le français, pour convertir "…".
const QUOTES: Record<Exclude<Lang, "fr">, [string, string]> = {
  en: ["“", "”"],
  de: ["„", "“"],
  ru: ["«", "»"],
  tr: ["“", "”"],
  it: ["«", "»"],
  es: ["«", "»"],
};

// Tiret qui remplace un trait d'union entre espaces.
const DASHES: Record<Lang, string> = {
  fr: "–",
  en: "–",
  de: "–",
  ru: "—",
  tr: "–",
  it: "–",
  es: "—",
};

// Langues qui n'admettent aucune espace dans « ».
const TIGHT_GUILLEMETS: Lang[] = ["ru", "tr", "it", "es"];

interface TypoRule {
  pattern: RegExp;
  replacement: string;
}

// Toutes les règles n'avalent que des espaces horizontales ([^\S\r\n], qui
// couvre aussi les insécables existantes) : aucune ne fusionne deux lignes, et
// relancer la correction sur un texte déjà correct ne change rien.
function rulesFor(s: SmartTypographySettings, lang: Lang): TypoRule[] {
  const fine = s.frNarrowSpace;
  const nb = s.frNbSpace;
  const o = s.langOptions[lang];
  const rules: TypoRule[] = [];
  if (!o.enabled) return rules;
  const rule = (pattern: string, replacement: string, flags = "g") =>
    rules.push({ pattern: new RegExp(pattern, flags), replacement });

  // Guillemets droits appariés sur une même ligne.
  if (o.quotes && (lang === "fr" || s.curlyQuotes)) {
    const [open, close] =
      lang === "fr" ? [`«${fine}`, `${fine}»`] : QUOTES[lang];
    rule('"([^"\\n]*)"', `${open}$1${close}`);
  }
  if (lang === "de" && o.quotes) rule("“([^”\\n]*)”", "„$1“");
  if (lang === "it" && o.special) rule(`(?<!${LETTER})E['’](?=${H})`, "È");
  if (o.quotes && s.curlyQuotes) rule("'", s.closeSingle);
  if (o.general) {
    // Apostrophe d'élision isolée entre deux espaces : « l ’ obscurité ».
    rule(`(${LETTER})${H}+(['’])${H}+(?=${LETTER})`, "$1$2");
    // Une seule espace, après ou avant un mot d'élision : « l’ obscurité », « l ’obscurité ».
    rule(`(${ELISION}['’])${H}+(?=${LETTER})`, "$1");
    rule(`(${ELISION})${H}+(?=['’]${LETTER})`, "$1");
  }
  if (s.ellipsis) rule("\\.\\.\\.", "…");

  // Couche universelle.
  if (o.general) {
    rule(`${H}+,`, ",");
    rule(`\\(${H}+(?=\\S)`, "(");
    rule(`(\\S)${H}+\\)`, "$1)");
    rule(`(\\S)${H}+([.,])${END_OF_SENTENCE}`, "$1$2");
    rule(`(${LETTER},)(?=${LETTER})`, "$1 ");
    rule(`([;!?]+)(?=${LETTER})`, "$1 ");
    rule(`(${LETTER})\\((?!${PLURAL_MARK}\\))`, "$1 (");
  }
  if (o.dash) rule(`([^\\s|-]${H}+)-(?=${H}+[^\\s|-])`, `$1${DASHES[lang]}`);

  if (lang === "fr") {
    // Avant ; ! ? : les suites comme « ?! » n'en reçoivent qu'une seule, et un
    // signe en début de ligne est laissé tel quel.
    if (o.punctuation) rule(`(\\S)${H}*([;!?]+)`, `$1${fine}$2`);
    if (o.percent) {
      // Un « %% », délimiteur de commentaire Obsidian, n'est pas un pourcentage.
      rule(`(\\d)${H}*%(?!%)`, `$1${nb}%`);
    }
    if (o.colon) {
      // Uniquement si le deux-points termine un mot et est suivi d'une espace,
      // d'une fin de ligne ou d'un marqueur d'emphase : 12:30, key::value,
      // C:\dossier et les URL restent intacts.
      rule(`([^\\s:])${H}*:(?=${H}|[*_]|$)`, `$1${nb}:`, "gm");
    }
    if (o.guillemets) {
      rule(`«${H}*(\\S)`, `«${fine}$1`);
      rule(`(\\S)${H}*»`, `$1${fine}»`);
    }
    return rules;
  }

  // Hors du français, aucune espace avant ; : ! ?
  if (o.punctuation) {
    rule(`(\\S)${H}+([!?]+)${STOP_END}`, "$1$2", "gm");
    rule(`(\\S)${H}+(;)${COLON_END}`, "$1$2", "gm");
  }
  if (o.colon) rule(`(\\S)${H}+(:)${COLON_END}`, "$1$2", "gm");

  if (o.guillemets && TIGHT_GUILLEMETS.includes(lang)) {
    rule(`«${H}+(?=\\S)`, "«");
    rule(`(\\S)${H}+»`, "$1»");
  }
  if (o.percent) {
    if (lang === "en" || lang === "it") rule(`(\\d)${H}+%(?!%)`, "$1%");
    if (lang === "de" || lang === "es") rule(`(\\d)${H}*%(?!%)`, `$1${NBSP_CHAR}%`);
    if (lang === "tr") rule(`(\\d+(?:[.,]\\d+)*)${H}*%(?!%)`, "%$1");
  }
  if (lang === "es" && o.special) rule(`([¿¡])${H}+(?=\\S)`, "$1");
  if (lang === "de" && o.special) {
    rule(`(?<![A-Za-zÄÖÜäöüß])([a-zäöü]\\.)(?=[A-Za-zÄÖÜäöü]\\.)`, `$1${fine}`);
  }
  return rules;
}

// Corrige le texte, hors des zones protégées, selon la langue de chaque ligne.
export function applyTypography(
  text: string,
  s: SmartTypographySettings,
  ctx: LangContext
): string {
  const outer = protectedRanges(text);
  const langAt0 = languageResolver(text, outer, ctx);
  const general = (pos: number) => {
    const o = s.langOptions[langAt0(pos)];
    return o.enabled && o.general;
  };
  const edits = [
    ...doubleSpaces(text, outer).map(([start, end]) => ({ start, end, repl: " " })),
    ...edgeSpaces(text, outer).map(({ start, end }) => ({ start, end, repl: "" })),
  ]
    .filter(({ start }) => general(start))
    .sort((a, b) => a.start - b.start);
  let collapsed = "";
  let previous = 0;
  for (const { start, end, repl } of edits) {
    collapsed += text.slice(previous, start) + repl;
    previous = end;
  }
  text = collapsed + text.slice(previous);

  const spans = protectedRanges(text);
  const langAt = languageResolver(text, spans, ctx);
  const rulesByLang = new Map<Lang, TypoRule[]>();
  const fix = (chunk: string, lang: Lang) => {
    let rules = rulesByLang.get(lang);
    if (!rules) {
      rules = rulesFor(s, lang);
      rulesByLang.set(lang, rules);
    }
    return rules.reduce(
      (out, { pattern, replacement }) => out.replace(pattern, replacement),
      chunk
    );
  };
  // Chaque morceau de ligne est corrigé selon la langue de sa ligne.
  const fixRange = (from: number, to: number) => {
    let out = "";
    for (let p = from; p < to; ) {
      const nl = text.indexOf("\n", p);
      const end = nl === -1 || nl >= to ? to : nl + 1;
      out += fix(text.slice(p, end), langAt(p));
      p = end;
    }
    return out;
  };

  let result = "";
  let last = 0;
  for (const [start, end] of spans) {
    result += fixRange(last, start) + text.slice(start, end);
    last = end;
  }
  return result + fixRange(last, text.length);
}

/* ------------------------------------------------------------------ */
/* Repérage                                                            */
/* ------------------------------------------------------------------ */

// Côté du signe où porte la faute : espace attendue ou en trop devant lui
// (before) ou derrière lui (after), ou signe fautif lui-même (on).
export type SignSide = "before" | "after" | "on";

// Nature de la faute, pour l'info-bulle.
export type SignReason =
  | "nbsp" // insécable attendue
  | "space" // espace en trop ou manquante (couche universelle)
  | "quote" // guillemet ou apostrophe droits
  | "dash" // trait d'union entre espaces
  | "double-space" // espace doublée
  | "blank-line" // espaces seules sur une ligne vide
  | "line-end" // espace en fin de phrase, en bout de ligne
  | "no-space" // espace interdite dans cette langue
  | "percent-none" // 50% sans espace
  | "percent-tr" // %50 en turc
  | "es-inverted" // ¿ ou ¡ ouvrant manquant
  | "de-quote" // ” au lieu de “ en allemand
  | "de-abbr" // z.B. au lieu de z. B.
  | "it-e"; // E' au lieu de È

export interface FaultySign {
  pos: number;
  side: SignSide;
  reason: SignReason;
  lang: Lang;
}

// space : le motif saisit l'espace fautive, le groupe 1 éventuel la part de la
// suite d'espaces qui la sépare du signe ; missing : motif de largeur nulle,
// là où l'espace manque ; sign : le motif saisit le signe fautif.
interface Check {
  mode: "space" | "missing" | "sign";
  side: SignSide;
  reason: SignReason;
  pattern: string;
  flags?: string;
  // Absent : toutes les langues.
  langs?: Lang[];
  // Famille de règles du réglage par langue qui commande ce repère.
  opt?: LangOptionKey;
}

const NOT_FRENCH: Lang[] = ["en", "de", "ru", "tr", "it", "es"];

const CHECKS: Check[] = [
  // --- Français : espace ordinaire là où une insécable est attendue, qui
  // autorise un retour à la ligne devant la ponctuation. Une insécable déjà
  // présente n'est jamais signalée, mais ne rachète pas une espace ordinaire
  // qui la côtoie. Avant ; ! ? — un « ! » suivi de « [ » ouvre une intégration.
  { mode: "space", opt: "punctuation", side: "before", reason: "nbsp", langs: ["fr"], pattern: "(?<=\\S[^\\S\\r\\n]*)[ \\t]+(?=([^\\S\\r\\n]*)(?:[;?]|!(?!\\[)))" },
  { mode: "space", opt: "percent", side: "before", reason: "nbsp", langs: ["fr", "de", "es"], pattern: "(?<=\\d[^\\S\\r\\n]*)[ \\t]+(?=([^\\S\\r\\n]*)%(?!%))" },
  { mode: "space", opt: "colon", side: "before", reason: "nbsp", langs: ["fr"], flags: "gm", pattern: "(?<=[^\\s:][^\\S\\r\\n]*)[ \\t]+(?=([^\\S\\r\\n]*):(?:[ \\t]|[*_]|$))" },
  { mode: "space", opt: "guillemets", side: "after", reason: "nbsp", langs: ["fr"], pattern: "(?<=«([^\\S\\r\\n]*))[ \\t]+(?=[^\\S\\r\\n]*\\S)" },
  { mode: "space", opt: "guillemets", side: "before", reason: "nbsp", langs: ["fr"], pattern: "(?<=\\S[^\\S\\r\\n]*)[ \\t]+(?=([^\\S\\r\\n]*)»)" },
  // Français : insécable absente.
  { mode: "missing", opt: "punctuation", side: "before", reason: "nbsp", langs: ["fr"], pattern: "(?<=[^\\s;!?])(?=[;?]|!(?!\\[))" },
  { mode: "missing", opt: "percent", side: "before", reason: "nbsp", langs: ["fr", "de", "es"], pattern: "(?<=\\d)(?=%(?!%))" },
  { mode: "missing", opt: "colon", side: "before", reason: "nbsp", langs: ["fr"], flags: "gm", pattern: "(?<=[^\\s:])(?=:(?:[ \\t]|[*_]|$))" },
  { mode: "missing", opt: "guillemets", side: "after", reason: "nbsp", langs: ["fr"], pattern: "(?<=«)(?=[^\\s])" },
  { mode: "missing", opt: "guillemets", side: "before", reason: "nbsp", langs: ["fr"], pattern: "(?<=[^\\s])(?=»)" },

  // --- Universel.
  { mode: "space", opt: "general", side: "after", reason: "space", pattern: `(?<=\\()${H}+(?=\\S)` },
  { mode: "space", opt: "general", side: "before", reason: "space", pattern: `(?<=\\S)${H}+(?=\\))` },
  { mode: "space", opt: "general", side: "before", reason: "space", pattern: `(?<=\\S)${H}+(?=[.,]${END_OF_SENTENCE})` },
  { mode: "missing", opt: "general", side: "after", reason: "space", pattern: `(?<=${LETTER},)(?=${LETTER})` },
  { mode: "missing", opt: "general", side: "after", reason: "space", pattern: `(?<=[;!?])(?=${LETTER})` },
  { mode: "missing", opt: "general", side: "before", reason: "space", pattern: `(?<=${LETTER})(?=\\((?!${PLURAL_MARK}\\)))` },
  { mode: "space", opt: "general", side: "before", reason: "space", pattern: `(?<=${ELISION})${H}+(?=['’]${LETTER})` },
  { mode: "space", opt: "general", side: "after", reason: "space", pattern: `(?<=${ELISION}['’])${H}+(?=${LETTER})` },
  { mode: "space", opt: "general", side: "before", reason: "space", pattern: `(?<=${LETTER})${H}+(?=['’]${H}+${LETTER})` },
  { mode: "space", opt: "general", side: "after", reason: "space", pattern: `(?<=${LETTER}${H}+['’])${H}+(?=${LETTER})` },
  { mode: "sign", opt: "dash", side: "on", reason: "dash", pattern: `(?<=[^\\s|-]${H}+)-(?=${H}+[^\\s|-])` },
  { mode: "sign", opt: "quotes", side: "on", reason: "quote", pattern: `["']` },

  // --- Hors du français : aucune espace avant ; : ! ?
  { mode: "space", opt: "punctuation", side: "before", reason: "no-space", langs: NOT_FRENCH, flags: "gm", pattern: `(?<=\\S)${H}+(?=[!?]+${STOP_END})` },
  { mode: "space", opt: "punctuation", side: "before", reason: "no-space", langs: NOT_FRENCH, flags: "gm", pattern: `(?<=\\S)${H}+(?=[;]${COLON_END})` },
  { mode: "space", opt: "colon", side: "before", reason: "no-space", langs: NOT_FRENCH, flags: "gm", pattern: `(?<=\\S)${H}+(?=:${COLON_END})` },
  { mode: "space", opt: "guillemets", side: "after", reason: "no-space", langs: TIGHT_GUILLEMETS, pattern: `(?<=«)${H}+(?=\\S)` },
  { mode: "space", opt: "guillemets", side: "before", reason: "no-space", langs: TIGHT_GUILLEMETS, pattern: `(?<=\\S)${H}+(?=»)` },
  { mode: "space", opt: "percent", side: "before", reason: "percent-none", langs: ["en", "it"], pattern: `(?<=\\d)${H}+(?=%(?!%))` },
  { mode: "sign", opt: "percent", side: "on", reason: "percent-tr", langs: ["tr"], pattern: `(?<=\\d${H}*)%(?!%)` },
  { mode: "space", opt: "special", side: "after", reason: "no-space", langs: ["es"], pattern: `(?<=[¿¡])${H}+(?=\\S)` },
  { mode: "sign", opt: "quotes", side: "on", reason: "de-quote", langs: ["de"], pattern: "”" },
  { mode: "missing", opt: "special", side: "after", reason: "de-abbr", langs: ["de"], pattern: "(?<=(?<![A-Za-zÄÖÜäöüß])[a-zäöü]\\.)(?=[A-Za-zÄÖÜäöü]\\.)" },
  { mode: "sign", opt: "special", side: "on", reason: "it-e", langs: ["it"], pattern: `(?<!${LETTER})E(?=['’]${H})` },
];

// Signes fautifs, triés, chacun avec le côté où porte la faute, sa nature et
// la langue de sa ligne. Le repère se pose sur le signe : jamais de la syntaxe
// que l'aperçu en direct masque, contrairement au caractère qui le précède
// parfois (**Note**:).
export function findFaultySigns(
  text: string,
  s: SmartTypographySettings,
  ctx: LangContext
): FaultySign[] {
  const spans = protectedRanges(text);
  const langAt = languageResolver(text, spans, ctx);
  const inSpan = (pos: number) => spans.some(([a, b]) => pos >= a && pos < b);
  // Une clé par position et par côté : une apostrophe entre deux espaces porte
  // un repère de chaque côté.
  const signs = new Map<string, FaultySign>();

  for (const check of CHECKS) {
    const re = new RegExp(check.pattern, check.flags ?? "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (start === end) re.lastIndex++;

      let pos: number;
      if (check.mode === "space") {
        // Espace collée à une portion protégée : la correction n'a pas de
        // contexte pour la réparer, le repérage ne la signale donc pas non plus.
        if (spans.some(([a, b]) => (start < b && end > a) || b === start)) continue;
        const gap = match[1] ? match[1].length : 0;
        pos = check.side === "before" ? end + gap : start - gap - 1;
      } else if (check.mode === "missing") {
        // `start <= b` : un signe juste après une portion protégée (`code`!)
        // n'est jamais signalé, faute de contexte, comme pour la correction.
        if (spans.some(([a, b]) => start > a && start <= b)) continue;
        pos = check.side === "before" ? start : start - 1;
      } else {
        pos = start;
      }
      if (inSpan(pos)) continue;

      const lang = langAt(pos);
      if (check.langs && !check.langs.includes(lang)) continue;
      const o = s.langOptions[lang];
      if (!o.enabled || (check.opt && !o[check.opt])) continue;
      signs.set(`${pos}:${check.side}`, { pos, side: check.side, reason: check.reason, lang });
    }
  }

  const generalAt = (pos: number) => {
    const o = s.langOptions[langAt(pos)];
    return o.enabled && o.general;
  };

  // Espaces doublées : le repère se pose sur la première espace en trop.
  for (const [start] of doubleSpaces(text, spans)) {
    const pos = start + 1;
    if (!generalAt(pos)) continue;
    signs.set(`${pos}:on`, { pos, side: "on", reason: "double-space", lang: langAt(pos) });
  }

  for (const { start, kind } of edgeSpaces(text, spans)) {
    if (!generalAt(start)) continue;
    signs.set(`${start}:on`, { pos: start, side: "on", reason: kind, lang: langAt(start) });
  }

  // Espagnol : « ? » et « ! » exigent leur ouvrant ¿ ¡ plus tôt sur la ligne,
  // après le signe fermant précédent. Une suite « ?! » ne compte qu'une fois.
  const closers = /[?!]/g;
  let m: RegExpExecArray | null;
  while ((m = closers.exec(text)) !== null) {
    const pos = m.index;
    const sign = m[0];
    if (sign === "!" && text[pos + 1] === "[") continue;
    if (pos > 0 && "?!".includes(text[pos - 1])) continue;
    if (inSpan(pos) || langAt(pos) !== "es") continue;
    if (!s.langOptions.es.enabled || !s.langOptions.es.special) continue;
    const before = text.slice(text.lastIndexOf("\n", pos - 1) + 1, pos);
    const opener = sign === "?" ? "¿" : "¡";
    if (before.lastIndexOf(opener) <= before.lastIndexOf(sign)) {
      signs.set(`${pos}:on`, { pos, side: "on", reason: "es-inverted", lang: "es" });
    }
  }

  return [...signs.values()].sort((a, b) => a.pos - b.pos);
}
