import { InputRule } from "inputRules";
import { SmartTypographySettings } from "types";

/* ------------------------------------------------------------------ */
/* Caractères                                                          */
/* ------------------------------------------------------------------ */

export const FINE = "\u202F"; // espace fine insécable (NARROW NO-BREAK SPACE)
export const NBSP = "\u00A0"; // espace insécable (NO-BREAK SPACE)
export const THIN = "\u2009"; // espace fine sécable (repli éventuel)

/* ------------------------------------------------------------------ */
/* Contextes                                                           */
/* Le contexte testé est la chaîne qui PRÉCÈDE le caractère tapé.      */
/* Par défaut 3 caractères ; `contextLength` permet d'élargir.         */
/* ------------------------------------------------------------------ */

// Fin de mot / de groupe : on insère l'espace.
const AFTER_WORD = /[A-Za-zÀ-ÖØ-öø-ÿ0-9)\]}"'’…»%]$/;

// Une espace ordinaire précède : on la remplace par l'insécable.
// (\s couvre déjà U+00A0 et U+202F en JS, donc les insécables sont exclues.)
const AFTER_SPACE = /[^\s] $/;

// Toujours vrai.
const ALWAYS = /(?:)/;

// Schémas d'URI : on ne veut pas de « http : // ».
const URL_SCHEME =
  /(?:https?|s?ftps?|file|mailto|tel|data|obsidian|zotero|doi|imap|ssh|git|wss?|vscode)$/i;

// On est à l'intérieur d'une URL : ni fine devant « ? », ni insécable ailleurs.
// \S*$ ne franchit pas les espaces ni les retours à la ligne.
const INSIDE_URI =
  /(?:[a-z][a-z0-9+.-]*:\/\/|(?:https?|mailto|obsidian|zotero|file|tel|doi):)\S*$/i;
const URI_LOOKBEHIND = 96;

const fine = (s: SmartTypographySettings) => s.frNarrowSpace;

/* ------------------------------------------------------------------ */
/* Fabrique de règles                                                  */
/* ------------------------------------------------------------------ */

function punctuationRules(
  char: string,
  space: (s: SmartTypographySettings) => string
): InputRule[] {
  return [
    // « mot ; »  →  « mot[fine]; »   (l'espace ordinaire est remplacée)
    {
      trigger: char,
      from: ` ${char}`,
      to: (s) => space(s) + char,
      contextMatch: AFTER_SPACE,
    },
    // « mot; »   →  « mot[fine]; »   (l'espace est ajoutée)
    {
      trigger: char,
      from: char,
      to: (s) => space(s) + char,
      contextMatch: AFTER_WORD,
      // Épargne le « ? » d'une query string et compagnie.
      contextLength: URI_LOOKBEHIND,
      contextExclude: INSIDE_URI,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* ;  !  ?  »   →  espace fine insécable devant                        */
/* ------------------------------------------------------------------ */

export const frenchStopRules: InputRule[] = [
  ...punctuationRules(";", fine),
  ...punctuationRules("!", fine),
  ...punctuationRules("?", fine),
  ...punctuationRules("»", fine),
];

/* ------------------------------------------------------------------ */
/* :  →  espace INSÉCABLE (U+00A0), pas fine (usage Imprimerie natle)  */
/* ------------------------------------------------------------------ */

export const frenchColonRules: InputRule[] = [
  {
    trigger: ":",
    from: " :",
    to: (s) => s.frNbSpace + ":",
    contextMatch: AFTER_SPACE,
    contextLength: 24,
    contextExclude: /[:/\\]\s$/,
  },
  {
    trigger: ":",
    from: ":",
    // Pas de chiffre dans la classe : « 12:30 » et « 1:2 » sont épargnés.
    to: (s) => s.frNbSpace + ":",
    contextMatch: /[A-Za-zÀ-ÖØ-öø-ÿ)\]}"'’…»]$/,
    contextLength: URI_LOOKBEHIND,
    contextExclude: new RegExp(
      URL_SCHEME.source + "|" + INSIDE_URI.source,
      "i"
    ),
  },
];

/* ------------------------------------------------------------------ */
/* %  →  espace insécable devant                                       */
/* ------------------------------------------------------------------ */

export const frenchPercentRules: InputRule[] = [
  {
    trigger: "%",
    from: " %",
    to: (s) => s.frNbSpace + "%",
    contextMatch: /\d $/,
  },
  {
    trigger: "%",
    from: "%",
    to: (s) => s.frNbSpace + "%",
    contextMatch: /\d$/,
  },
];

/* ------------------------------------------------------------------ */
/* Guillemets                                                          */
/* ------------------------------------------------------------------ */

// « tapé directement au clavier (AltGr, clavier fr, macOS…)
export const frenchGuillemetRules: InputRule[] = [
  {
    trigger: "«",
    from: "«",
    to: (s) => "«" + s.frNarrowSpace,
    contextMatch: ALWAYS,
  },
];

// << et >> quand l'option « Guillemets » du plugin est active.
// IMPORTANT : ces règles doivent être poussées AVANT guillemetRules.
export const frenchAngleGuillemetRules: InputRule[] = [
  {
    trigger: "<",
    from: "<<",
    to: (s) => s.openGuillemet + s.frNarrowSpace,
    contextMatch: /<$/,
  },
  {
    trigger: ">",
    from: " >>",
    to: (s) => s.frNarrowSpace + s.closeGuillemet,
    contextMatch: / >$/,
  },
  {
    trigger: ">",
    from: ">>",
    to: (s) => s.frNarrowSpace + s.closeGuillemet,
    contextMatch: />$/,
  },
];

/* ------------------------------------------------------------------ */
/* Garde-fous                                                          */
/* ------------------------------------------------------------------ */

export const frenchGuardRules: InputRule[] = [
  // Une espace ordinaire tapée juste après « [fine] est absorbée,
  // pour éviter « [fine][espace]mot.
  {
    trigger: " ",
    from: `${FINE} `,
    to: (s) => s.frNarrowSpace,
    contextMatch: /«[\u00A0\u202F\u2009]$/,
  },
  // Rattrapage des images / embeds : « texte[fine]![ » redevient « texte ![ ».
  {
    trigger: "[",
    from: `${FINE}![`,
    to: " ![",
    contextMatch: /[\u00A0\u202F\u2009]!$/,
  },
  // Même chose quand l'auto-appariement des crochets insère « [] » d'un bloc.
  {
    trigger: "[]",
    from: `${FINE}![]`,
    to: " ![]",
    contextMatch: /[\u00A0\u202F\u2009]!$/,
  },
];
