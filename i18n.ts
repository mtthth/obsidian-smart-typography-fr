/*
 * Smart Typography FR: interface strings, in English and French.
 * Copyright (c) 2026 Matthieu Thomas (cidrolin)
 *
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * GPL only: the English descriptions of the upstream settings come from
 * Smart Typography by mgmeyers.
 */

import type { SignReason } from "fixTypography";
import { Lang, LangOptionKey } from "languages";

export type UiLang = "en" | "fr";

// Each interface language is named in itself, so that someone stuck in the
// wrong one can still find their own.
export const UI_LANG_NAMES: Record<UiLang, string> = {
  en: "English",
  fr: "Français",
};

export const UI_LANGS = Object.keys(UI_LANG_NAMES) as UiLang[];

export function isUiLang(value: unknown): value is UiLang {
  return typeof value === "string" && UI_LANGS.includes(value as UiLang);
}

export interface Entry {
  name: string;
  desc: string;
}

export interface UiStrings {
  // Language names as they read mid-sentence.
  langNames: Record<Lang, string>;
  markerTitles: Record<SignReason, string>;

  // Commands, menus, notices and the note language picker.
  fixSelection: string;
  noteLanguage: string;
  noteNotChecked: string;
  noteAutomatic: string;
  autoDetection: string;
  doNotCheck: string;
  selectFirst: string;
  nothingToFix: string;
  fixed: string;

  // Settings tab.
  uiLanguage: Entry;
  scopeHeading: string;
  limitToFolders: Entry;
  includedFolders: Entry;
  includedFoldersPlaceholder: string;
  languagesHeading: string;
  defaultLanguage: Entry;
  flagWrongSpaces: Entry;
  perLanguageHeading: string;
  shownLanguage: Entry;
  checkLanguage: (lang: Lang) => Entry;
  frenchSpacing: Entry;
  narrowSpace: Entry;
  narrowSpaceFine: string;
  narrowSpaceNbsp: string;
  narrowSpaceThin: string;
  option: (lang: Lang, key: LangOptionKey) => Entry;
  curlyQuotes: Entry;
  openDouble: string;
  closeDouble: string;
  openSingle: string;
  closeSingle: string;
  dashes: Entry;
  skipEnDash: Entry;
  ellipsis: Entry;
  guillemets: Entry;
  openGuillemet: string;
  closeGuillemet: string;
  arrows: Entry;
  leftArrow: string;
  rightArrow: string;
  comparisons: Entry;
  fractions: Entry;
}

// Quotes that straight quotes become, per language.
const QUOTE_STYLES: Record<Lang, string> = {
  fr: "« »",
  en: "“ ”",
  de: "„ “",
  ru: "« »",
  tr: "“ ”",
  it: "« »",
  es: "« »",
};

const dashOf = (lang: Lang) => (lang === "ru" || lang === "es" ? "—" : "–");

// Languages that put a no-break space between the number and %.
const SPACED_PERCENT: Lang[] = ["fr", "de", "es"];

const FRACTIONS = "½, ⅓, ⅔, ¼, ¾, ⅕, ⅖, ⅗, ⅘, ⅙, ⅚, ⅐, ⅛, ⅜, ⅝, ⅞, ⅑, ⅒";

// Names that other descriptions quote, kept in one place so they cannot drift.
const EN_FIX = "Fix typography in selection";
const EN_FRENCH_SPACING = "Spaces before double punctuation";
const EN_CURLY = "Curly Quotes";

const en: UiStrings = {
  langNames: {
    fr: "French",
    en: "English",
    de: "German",
    ru: "Russian",
    tr: "Turkish",
    it: "Italian",
    es: "Spanish",
  },
  markerTitles: {
    nbsp: "No-break space expected here.",
    space: "Extra or missing space here.",
    quote: "Straight quote or apostrophe: prefer the typographic form.",
    dash: "Hyphen between spaces: a dash is expected (– or —).",
    "double-space": "Doubled space.",
    "blank-line": "Spaces alone on an empty line.",
    "line-end": "Useless space at the end of the line.",
    "no-ending": "Line without final punctuation (. ! ? … : — or a closing quote).",
    "no-space": "No space here in this language.",
    "percent-none": "No space between the number and %.",
    "percent-tr": "The % sign comes before the number: %50.",
    "es-inverted": "The opening ¿ or ¡ is missing.",
    "de-quote": "German closing quote: “ not ”.",
    "de-abbr": "Abbreviation: a space is expected (z. B.).",
    "it-e": "\"E'\" is written \"È\".",
  },

  fixSelection: EN_FIX,
  noteLanguage: "Note typography language",
  noteNotChecked: "not checked",
  noteAutomatic: "automatic",
  autoDetection: "Automatic detection",
  doNotCheck: "Do not check typography",
  selectFirst: "Select the text to fix first.",
  nothingToFix: "Nothing to fix in this selection.",
  fixed: "Typography fixed.",

  uiLanguage: {
    name: "Interface language",
    desc: "Language of the settings, menus, notices and marker tooltips. Command names change the next time Obsidian is reloaded.",
  },
  scopeHeading: "Scope",
  limitToFolders: {
    name: "Limit to some folders",
    desc: "The plugin only acts in the folders listed below, subfolders included.",
  },
  includedFolders: {
    name: "Folders",
    desc: "One path per line, relative to the vault root. Case-sensitive. Empty list = plugin inactive everywhere.",
  },
  includedFoldersPlaceholder: "Writing/Stories\nDrafts",
  languagesHeading: "Languages",
  defaultLanguage: {
    name: "Default language",
    desc: "Language of the lines and notes too short to be recognised. A note's smart-typo property (fr, en, de, ru, tr, it, es) forces its language; smart-typo: false turns flagging off.",
  },
  flagWrongSpaces: {
    name: "Flag typography mistakes",
    desc: `Marks typography mistakes with a small red marker, in the scoped folders, according to each line's language; the marker's tooltip says which one. The "${EN_FIX}" command fixes what can be fixed.`,
  },
  perLanguageHeading: "Per-language settings",
  shownLanguage: {
    name: "Language",
    desc: "Each family of rules can be switched off language by language. It applies while typing (French only), to the selection fix and to the red markers.",
  },
  checkLanguage: (lang) => ({
    name: `Check ${en.langNames[lang]}`,
    desc: "When off, lines recognised in this language are neither flagged, nor fixed, nor completed while typing.",
  }),
  frenchSpacing: {
    name: EN_FRENCH_SPACING,
    desc: "While typing, inserts a narrow no-break space (U+202F) before ; ! ? and », on lines recognised as French. The families below (colon, guillemets, percentages) also apply while typing.",
  },
  narrowSpace: {
    name: "Narrow space character",
    desc: "U+202F is the correct form. Switch to U+00A0 if your writing font does not render it.",
  },
  narrowSpaceFine: "Narrow no-break space (U+202F)",
  narrowSpaceNbsp: "No-break space (U+00A0)",
  narrowSpaceThin: "Thin space (U+2009)",
  option: (lang, key) => {
    const french = lang === "fr";
    switch (key) {
      case "general":
        return {
          name: "Common spacing",
          desc: "Around parentheses, commas and full stops; elision (l’obscurité); doubled spaces, spaces at the end of a line, lines of spaces only.",
        };
      case "ending":
        return {
          name: "Final punctuation",
          desc: "Flags a line of prose that does not end with . ! ? … : — – or a closing quote (» ”). Headings, lists, quotes, tables and code are left alone. Turn it off for verse.",
        };
      case "punctuation":
        return {
          name: "Before ; ! ?",
          desc: french
            ? `Narrow no-break space. Also applies while typing if "${EN_FRENCH_SPACING}" is on.`
            : "No space before these signs.",
        };
      case "colon":
        return {
          name: "Colon",
          desc: french
            ? "Full no-break space (U+00A0) before \":\", as the Imprimerie nationale recommends. Turn it off if you often type URLs, times or Dataview fields."
            : "No space before \":\".",
        };
      case "guillemets":
        return {
          name: "Guillemets « »",
          desc: french ? "Narrow space after « and before »." : "No space inside « ».",
        };
      case "percent":
        return {
          name: "Percentages",
          desc: SPACED_PERCENT.includes(lang)
            ? "No-break space between the number and the % sign (50 %)."
            : lang === "tr"
            ? "The % sign comes before the number (%50)."
            : "No space between the number and the % sign (50%).",
        };
      case "quotes":
        return {
          name: "Straight quotes",
          desc: `Converted to ${QUOTE_STYLES[lang]} (outside French, if "${EN_CURLY}" is on); typographic apostrophes; straight quotes and apostrophes flagged.`,
        };
      case "dash":
        return {
          name: "Hyphen between spaces",
          desc: `Replaced with a dash (${dashOf(lang)}).`,
        };
      case "special":
        return {
          name: "Language-specific rules",
          desc:
            lang === "de"
              ? "Spaced abbreviations (z. B., d. h.)."
              : lang === "it"
              ? "È, not E'."
              : "No space after ¿ or ¡; missing opening ¿ or ¡.",
        };
    }
  },
  curlyQuotes: {
    name: EN_CURLY,
    desc: "Double and single quotes will be converted to curly quotes (“” & ‘’)",
  },
  openDouble: "Open double quote character",
  closeDouble: "Close double quote character",
  openSingle: "Open single quote character",
  closeSingle: "Close single quote character",
  dashes: {
    name: "Dashes",
    desc: "Two dashes (--) will be converted to an en-dash (–). An en-dash followed by a dash will be converted to an em-dash (—). An em-dash followed by a dash will be converted into three dashes (---)",
  },
  skipEnDash: {
    name: "Skip en-dash",
    desc: "When enabled, two dashes will be converted to an em-dash rather than an en-dash.",
  },
  ellipsis: {
    name: "Ellipsis",
    desc: "Three periods (...) will be converted to an ellipsis (…)",
  },
  guillemets: {
    name: "Guillemets",
    desc: "<< | >> will be converted to « | »",
  },
  openGuillemet: "Open guillemet",
  closeGuillemet: "Close guillemet",
  arrows: {
    name: "Arrows",
    desc: "<- | -> will be converted to ← | →",
  },
  leftArrow: "Left arrow character",
  rightArrow: "Right arrow character",
  comparisons: {
    name: "Comparison",
    desc: "<= | >= | /= will be converted to ≤ | ≥ | ≠",
  },
  fractions: {
    name: "Fractions",
    desc: `1/2 will be converted to ½. Supported UTF-8 fractions: ${FRACTIONS}`,
  },
};

const FR_FIX = "Corriger la typographie de la sélection";
const FR_FRENCH_SPACING = "Espaces avant la ponctuation double";
const FR_CURLY = "Guillemets courbes";

// French has no single rule for « le » before a language name: l'anglais,
// but le russe.
const FR_CHECK: Record<Lang, string> = {
  fr: "Vérifier le français",
  en: "Vérifier l'anglais",
  de: "Vérifier l'allemand",
  ru: "Vérifier le russe",
  tr: "Vérifier le turc",
  it: "Vérifier l'italien",
  es: "Vérifier l'espagnol",
};

const fr: UiStrings = {
  langNames: {
    fr: "français",
    en: "anglais",
    de: "allemand",
    ru: "russe",
    tr: "turc",
    it: "italien",
    es: "espagnol",
  },
  markerTitles: {
    nbsp: "Espace insécable attendue ici.",
    space: "Espace en trop ou manquante ici.",
    quote: "Guillemet ou apostrophe droit : préférer la forme typographique.",
    dash: "Trait d'union entre espaces : un tiret est attendu (– ou —).",
    "double-space": "Espace doublée.",
    "blank-line": "Espaces seules sur une ligne vide.",
    "line-end": "Espace inutile en fin de ligne.",
    "no-ending": "Ligne sans ponctuation finale (. ! ? … : — ou guillemet fermant).",
    "no-space": "Pas d'espace ici dans cette langue.",
    "percent-none": "Pas d'espace entre le nombre et %.",
    "percent-tr": "Le signe % précède le nombre : %50.",
    "es-inverted": "Il manque le ¿ ou le ¡ d'ouverture.",
    "de-quote": "Guillemet fermant allemand : “ et non ”.",
    "de-abbr": "Abréviation : espace attendue (z. B.).",
    "it-e": "« E' » s'écrit « È ».",
  },

  fixSelection: FR_FIX,
  noteLanguage: "Langue typographique de la note",
  noteNotChecked: "non vérifiée",
  noteAutomatic: "automatique",
  autoDetection: "Détection automatique",
  doNotCheck: "Ne pas vérifier la typographie",
  selectFirst: "Sélectionnez d'abord le texte à corriger.",
  nothingToFix: "Rien à corriger dans cette sélection.",
  fixed: "Typographie corrigée.",

  uiLanguage: {
    name: "Langue de l'interface",
    desc: "Langue des réglages, des menus, des notifications et des info-bulles des repères. Le nom des commandes change au prochain rechargement d'Obsidian.",
  },
  scopeHeading: "Portée",
  limitToFolders: {
    name: "Limiter à certains dossiers",
    desc: "Le plugin n'intervient que dans les dossiers listés ci-dessous, sous-dossiers compris.",
  },
  includedFolders: {
    name: "Dossiers concernés",
    desc: "Un chemin par ligne, relatif à la racine du coffre. Casse respectée. Liste vide = plugin inactif partout.",
  },
  includedFoldersPlaceholder: "Écrits/Nouvelles\nÉditions Procuste",
  languagesHeading: "Langues",
  defaultLanguage: {
    name: "Langue par défaut",
    desc: "Langue des lignes et des notes trop courtes pour être reconnues. La propriété smart-typo d'une note (fr, en, de, ru, tr, it, es) impose sa langue ; smart-typo: false coupe le repérage.",
  },
  flagWrongSpaces: {
    name: "Signaler les fautes de typographie",
    desc: `Marque d'un petit repère rouge, dans les dossiers concernés, les fautes de typographie selon la langue de chaque ligne ; l'info-bulle du repère dit laquelle. La commande « ${FR_FIX} » corrige ce qui peut l'être.`,
  },
  perLanguageHeading: "Réglages par langue",
  shownLanguage: {
    name: "Langue",
    desc: "Chaque famille de règles se coupe langue par langue. Elle joue à la saisie (français seulement), à la correction de la sélection et au repérage rouge.",
  },
  checkLanguage: (lang) => ({
    name: FR_CHECK[lang],
    desc: "Décoché, les lignes reconnues dans cette langue ne sont ni repérées, ni corrigées, ni complétées à la saisie.",
  }),
  frenchSpacing: {
    name: FR_FRENCH_SPACING,
    desc: "Insère à la frappe une espace fine insécable (U+202F) devant ; ! ? et », sur les lignes reconnues comme françaises. Les familles ci-dessous (deux-points, guillemets, pourcentages) règlent aussi la saisie.",
  },
  narrowSpace: {
    name: "Caractère d'espace fine",
    desc: "U+202F est la forme correcte. Basculez sur U+00A0 si votre police de travail ne la rend pas.",
  },
  narrowSpaceFine: "Fine insécable (U+202F)",
  narrowSpaceNbsp: "Insécable (U+00A0)",
  narrowSpaceThin: "Fine sécable (U+2009)",
  option: (lang, key) => {
    const french = lang === "fr";
    const none = "Aucune espace";
    switch (key) {
      case "general":
        return {
          name: "Espaces courantes",
          desc: "Autour des parenthèses, virgules et points ; élision (l’obscurité) ; espaces doublées, espaces en bout de ligne, lignes d'espaces seules.",
        };
      case "ending":
        return {
          name: "Ponctuation finale",
          desc: "Signale une ligne de prose qui ne finit pas par . ! ? … : — – ou un guillemet fermant (» ”). Titres, listes, citations, tableaux et code sont épargnés. À désactiver pour des vers.",
        };
      case "punctuation":
        return {
          name: "Avant ; ! ?",
          desc: french
            ? `Espace fine insécable. Joue aussi à la saisie si « ${FR_FRENCH_SPACING} » est activé.`
            : `${none} devant ces signes.`,
        };
      case "colon":
        return {
          name: "Deux-points",
          desc: french
            ? "Espace insécable pleine (U+00A0) devant « : », conformément à l'usage de l'Imprimerie nationale. À désactiver si vous saisissez souvent des URL, des heures ou des champs Dataview."
            : `${none} devant « : ».`,
        };
      case "guillemets":
        return {
          name: "Guillemets « »",
          desc: french ? "Espace fine après « et avant »." : `${none} à l'intérieur de « ».`,
        };
      case "percent":
        return {
          name: "Pourcentages",
          desc: SPACED_PERCENT.includes(lang)
            ? "Espace insécable entre le nombre et le signe % (50 %)."
            : lang === "tr"
            ? "Le signe % précède le nombre (%50)."
            : "Pas d'espace entre le nombre et le signe % (50%).",
        };
      case "quotes":
        return {
          name: "Guillemets droits",
          desc: `Convertis en ${QUOTE_STYLES[lang]} (hors français, si « ${FR_CURLY} » est actif) ; apostrophes droites typographiques ; guillemets et apostrophes droits signalés.`,
        };
      case "dash":
        return {
          name: "Trait d'union entre espaces",
          desc: `Remplacé par un tiret (${dashOf(lang)}).`,
        };
      case "special":
        return {
          name: "Règles propres",
          desc:
            lang === "de"
              ? "Abréviations espacées (z. B., d. h.)."
              : lang === "it"
              ? "È et non E'."
              : "Pas d'espace après ¿ ou ¡ ; ¿ ou ¡ d'ouverture manquant.",
        };
    }
  },
  curlyQuotes: {
    name: FR_CURLY,
    desc: "Les guillemets et apostrophes droits sont convertis en guillemets courbes (“” et ‘’).",
  },
  openDouble: "Guillemet double ouvrant",
  closeDouble: "Guillemet double fermant",
  openSingle: "Guillemet simple ouvrant",
  closeSingle: "Guillemet simple fermant",
  dashes: {
    name: "Tirets",
    desc: "Deux traits d'union (--) deviennent un tiret demi-cadratin (–) ; un demi-cadratin suivi d'un trait d'union devient un tiret cadratin (—) ; un cadratin suivi d'un trait d'union redevient trois traits d'union (---).",
  },
  skipEnDash: {
    name: "Sauter le demi-cadratin",
    desc: "Deux traits d'union donnent directement un tiret cadratin (—), sans passer par le demi-cadratin.",
  },
  ellipsis: {
    name: "Points de suspension",
    desc: "Trois points (...) deviennent des points de suspension (…).",
  },
  guillemets: {
    name: "Guillemets",
    desc: "<< et >> deviennent « et ».",
  },
  openGuillemet: "Guillemet ouvrant",
  closeGuillemet: "Guillemet fermant",
  arrows: {
    name: "Flèches",
    desc: "<- et -> deviennent ← et →.",
  },
  leftArrow: "Flèche gauche",
  rightArrow: "Flèche droite",
  comparisons: {
    name: "Comparaisons",
    desc: "<=, >= et /= deviennent ≤, ≥ et ≠.",
  },
  fractions: {
    name: "Fractions",
    desc: `1/2 devient ½. Fractions prises en charge : ${FRACTIONS}`,
  },
};

const STRINGS: Record<UiLang, UiStrings> = { en, fr };

// Strings of an interface language; English for an unknown value.
export function uiStrings(lang: unknown): UiStrings {
  return STRINGS[isUiLang(lang) ? lang : "en"];
}

// Language names start a list item with a capital, in any language.
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
