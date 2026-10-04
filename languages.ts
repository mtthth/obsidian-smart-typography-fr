/*
 * Smart Typography FR : langues prises en charge et détection de la langue.
 * Copyright (c) 2026 Matthieu Thomas (cidrolin)
 *
 * SPDX-License-Identifier: GPL-3.0-only OR MIT
 */

export type Lang = "fr" | "en" | "de" | "ru" | "tr" | "it" | "es";

export const LANG_NAMES: Record<Lang, string> = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  ru: "Русский",
  tr: "Türkçe",
  it: "Italiano",
  es: "Español",
};

export const LANGS = Object.keys(LANG_NAMES) as Lang[];

export function isLang(value: string): value is Lang {
  return Object.prototype.hasOwnProperty.call(LANG_NAMES, value);
}

// Mots-outils propres à chaque langue, qui rapportent un point. Le russe se
// reconnaît à son alphabet.
const WORDS: Record<Exclude<Lang, "ru">, string> = {
  fr:
    "les des du et est une qui dans pour pas sur au aux avec ce cette ces elle " +
    "nous vous je ne sont mais ou où par plus sa ses leur été être avoir fait " +
    "très aussi comme tout tous sans même qu j n l d c",
  en:
    "the and of to is that it was for with as are this be at by not have from " +
    "or but you he she they we my your his her their which an would will " +
    "there what if can been has had were do does about all",
  de:
    "der die das und ist nicht ein eine zu den dem mit sich auf für von auch " +
    "ich sie wir er im wie aber wenn oder noch nach bei nur dass werden wird " +
    "sind hat haben einen einem kann diese dieser uns mir mich schon sehr gibt",
  tr:
    "ve bir bu için ile çok gibi daha olarak olan ama mı mu mü ben sen biz " +
    "siz değil var yok kadar sonra şey ki bana beni onu ona şu çünkü " +
    "nasıl neden evet hayır ise oldu olur",
  it:
    "gli di della che e è per sono anche più questo questa nel nella " +
    "alla dei delle ho hanno sei molto perché quando ci suo sua loro " +
    "stato essere fatto tutto tutti degli sulla dalla dell nell dall sull",
  es:
    "el los las por para como más pero sus su ya este esta muy también " +
    "está hay yo tú eso esto cuando donde porque todo fue ser hace sí " +
    "qué cómo ella ellos nada puede",
};

// Mots-outils que plusieurs langues partagent : leur point est réparti entre
// elles. Ils ne départagent pas ces langues, mais les distinguent des autres.
const SHARED_WORDS =
  "la:fr,it,es le:fr,it il:fr,it que:fr,es de:fr,es,tr un:fr,it,es " +
  "en:fr,es con:it,es al:it,es del:it,es lo:it,es una:it,es si:fr,it,es " +
  "se:fr,it,es ma:fr,it mi:it,es,tr no:en,it,es in:en,de,it y:fr,es " +
  "nos:fr,es son:fr,es es:de,es so:en,de was:en,de da:de,it,tr";

// Points que rapporte chaque mot, par langue.
const WORD_POINTS = new Map<string, [Lang, number][]>();
const addPoints = (word: string, langs: Lang[]) => {
  const points = WORD_POINTS.get(word) || [];
  for (const lang of langs) points.push([lang, 1 / langs.length]);
  WORD_POINTS.set(word, points);
};
for (const lang of Object.keys(WORDS) as Exclude<Lang, "ru">[]) {
  for (const word of WORDS[lang].split(" ")) addPoints(word, [lang]);
}
for (const entry of SHARED_WORDS.split(" ")) {
  const [word, langs] = entry.split(":");
  addPoints(word, langs.split(",") as Lang[]);
}

// Lettres et signes propres à une langue parmi celles prises en charge.
const LETTERS: Partial<Record<Lang, RegExp>> = {
  fr: /[êâîôûœëï]/gi,
  de: /[äß]/gi,
  tr: /[ğışİ]/g,
  it: /[ìò]/gi,
  es: /[ñáíóú¿¡]/gi,
};

const WORD_RE = new RegExp("\\p{L}+", "gu");
const LETTER_RE = new RegExp("\\p{L}", "gu");
const CYRILLIC_RE = /[Ѐ-ӿ]/g;

// Langue du texte, ou null quand il est trop court ou trop mêlé pour trancher.
// Chaque mot-outil et chaque lettre propre rapporte des points ; la langue en
// tête doit en compter au moins deux, et deux fois plus que la suivante.
export function detectLanguage(text: string): Lang | null {
  const letters = (text.match(LETTER_RE) || []).length;
  const cyrillic = (text.match(CYRILLIC_RE) || []).length;
  if (cyrillic >= 2 && cyrillic * 2 >= letters) return "ru";

  const scores = new Map<Lang, number>();
  for (const word of text.toLowerCase().match(WORD_RE) || []) {
    for (const [lang, points] of WORD_POINTS.get(word) || []) {
      scores.set(lang, (scores.get(lang) || 0) + points);
    }
  }
  for (const [lang, re] of Object.entries(LETTERS) as [Lang, RegExp][]) {
    const count = (text.match(re) || []).length;
    if (count > 0) scores.set(lang, (scores.get(lang) || 0) + count);
  }

  const ranked = [...scores].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  const [best, score] = ranked[0];
  const second = ranked.length > 1 ? ranked[1][1] : 0;
  return score >= 2 && score >= second * 2 ? best : null;
}

// Valeur de la propriété `smart-typo` : une langue l'impose, `false` (ou `no`)
// coupe le repérage, toute autre valeur vaut détection automatique. `fr-FR`,
// `en_US`… sont ramenés à leur langue.
export function parseTypoSetting(value: unknown): Lang | false | null {
  if (value === false) return false;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "false" || v === "no") return false;
  const code = v.slice(0, 2);
  return isLang(code) && (v.length === 2 || /^..[-_]/.test(v)) ? code : null;
}

/* ------------------------------------------------------------------ */
/* Réglages par langue                                                 */
/* ------------------------------------------------------------------ */

// Familles de règles que l'on peut couper langue par langue. Toutes ne
// s'appliquent pas à toutes les langues : voir LANG_OPTION_KEYS.
export interface LangOptions {
  // Faux : les lignes de cette langue ne sont ni repérées ni corrigées.
  enabled: boolean;
  // Espaces autour des parenthèses, virgules, points, élisions ; espaces
  // doublées, fin de ligne, lignes vides.
  general: boolean;
  // Avant ; ! ? : insécable en français, aucune espace ailleurs.
  punctuation: boolean;
  // Avant : — mêmes règles que ci-dessus.
  colon: boolean;
  // Dans « » : fines en français, aucune espace en russe, turc, italien, espagnol.
  guillemets: boolean;
  // Entre le nombre et % (ou % avant le nombre en turc).
  percent: boolean;
  // Guillemets droits convertis, guillemets et apostrophes droits signalés.
  quotes: boolean;
  // Trait d'union entre espaces, remplacé par un tiret.
  dash: boolean;
  // Règles propres : z. B. (allemand), È (italien), ¿ ¡ (espagnol).
  special: boolean;
}

export type LangOptionKey = Exclude<keyof LangOptions, "enabled">;

export const DEFAULT_LANG_OPTIONS: LangOptions = {
  enabled: true,
  general: true,
  punctuation: true,
  colon: true,
  guillemets: true,
  percent: true,
  quotes: true,
  dash: true,
  special: true,
};

// Familles de règles qui existent pour chaque langue.
export const LANG_OPTION_KEYS: Record<Lang, LangOptionKey[]> = {
  fr: ["general", "punctuation", "colon", "guillemets", "percent", "quotes", "dash"],
  en: ["general", "punctuation", "colon", "percent", "quotes", "dash"],
  de: ["general", "punctuation", "colon", "percent", "quotes", "dash", "special"],
  ru: ["general", "punctuation", "colon", "guillemets", "quotes", "dash"],
  tr: ["general", "punctuation", "colon", "guillemets", "percent", "quotes", "dash"],
  it: ["general", "punctuation", "colon", "guillemets", "percent", "quotes", "dash", "special"],
  es: ["general", "punctuation", "colon", "guillemets", "percent", "quotes", "dash", "special"],
};

export type LangOptionsMap = Record<Lang, LangOptions>;

export function defaultLangOptions(): LangOptionsMap {
  const map = {} as LangOptionsMap;
  for (const lang of LANGS) map[lang] = { ...DEFAULT_LANG_OPTIONS };
  return map;
}
