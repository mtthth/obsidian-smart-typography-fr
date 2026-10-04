/*
 * Smart Typography FR : repère rouge des fautes de typographie dans l'éditeur.
 * Copyright (c) 2026 Matthieu Thomas (cidrolin)
 *
 * SPDX-License-Identifier: GPL-3.0-only OR MIT
 */

import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import {
  NoteTypo,
  SignReason,
  SignSide,
  findFaultySigns,
  noteTypo,
} from "fixTypography";
import { LANG_NAMES, Lang } from "languages";
import { SmartTypographySettings } from "types";

const MARKER_CLASSES: Record<SignSide, string> = {
  before: "smart-typography-fr-marker-before",
  after: "smart-typography-fr-marker-after",
  on: "smart-typography-fr-marker-on",
};

// Info-bulle portée par le signe lui-même : elle s'affiche au survol du signe
// comme du caret dessiné contre lui.
// La langue reconnue pour la ligne y est ajoutée.
const MARKER_TITLES: Record<SignReason, string> = {
  nbsp: "Espace insécable attendue ici.",
  space: "Espace en trop ou manquante ici.",
  quote: "Guillemet ou apostrophe droit : préférer la forme typographique.",
  dash: "Trait d'union entre espaces : un tiret est attendu (– ou —).",
  "double-space": "Espace doublée.",
  "blank-line": "Espaces seules sur une ligne vide.",
  "line-end": "Espace inutile en fin de ligne.",
  "no-space": "Pas d'espace ici dans cette langue.",
  "percent-none": "Pas d'espace entre le nombre et %.",
  "percent-tr": "Le signe % précède le nombre : %50.",
  "es-inverted": "Il manque le ¿ ou le ¡ d'ouverture.",
  "de-quote": "Guillemet fermant allemand : “ et non ”.",
  "de-abbr": "Abréviation : espace attendue (z. B.).",
  "it-e": "« E' » s'écrit « È ».",
};

// Début de la note, métadonnées comprises, d'où sont tirées la propriété
// smart-typo et la langue dominante.
const NOTE_HEAD = 40000;

export function noteTypoOf(state: EditorState, defaultLang: Lang): NoteTypo {
  return noteTypo(state.doc.sliceString(0, NOTE_HEAD), defaultLang);
}

type TextRange = { from: number; to: number };

// Fusionne les plages triées qui se touchent ou se chevauchent : CodeMirror
// escamote des portions des lignes très longues, et scanner deux fois la même
// ligne produirait des positions décroissantes, que la construction des
// décorations rejette par une exception.
function mergeRanges(ranges: TextRange[]): TextRange[] {
  const merged: TextRange[] = [];
  for (const { from, to } of ranges) {
    const last = merged[merged.length - 1];
    if (last && from <= last.to) {
      last.to = Math.max(last.to, to);
    } else {
      merged.push({ from, to });
    }
  }
  return merged;
}

// Plages visibles élargies aux lignes entières — un motif coupé par la limite
// de la zone visible ne serait pas reconnu — puis fusionnées.
export function visibleLineRanges(view: EditorView): TextRange[] {
  const doc = view.state.doc;
  return mergeRanges(
    view.visibleRanges.map((r) => ({
      from: doc.lineAt(r.from).from,
      to: doc.lineAt(r.to).to,
    }))
  );
}

// Fin du bloc de métadonnées, lue sur le document entier : le motif de
// protection est ancré sur le début du texte reçu, si bien qu'une fois le
// « --- » ouvrant défilé hors de l'écran, plus rien ne distingue « clé: valeur »
// d'une phrase.
export function frontmatterEnd(state: EditorState): number {
  const doc = state.doc;
  if (doc.line(1).text.trimEnd() !== "---") return 0;
  for (let n = 2; n <= doc.lines; n++) {
    if (doc.line(n).text.trimEnd() === "---") return doc.line(n).to;
  }
  return 0;
}

export function createSpacingMarkerPlugin(
  getSettings: () => SmartTypographySettings,
  isInScope: (state: EditorState) => boolean
) {
  // Une espace tapée après un point est le plus souvent suivie d'un mot : le
  // repère de fin de ligne n'apparaît donc que 5 s après la dernière frappe.
  const LINE_END_DELAY = 5000;

  const build = (view: EditorView, justEdited: boolean): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    if (!isInScope(view.state)) return builder.finish();

    const settings = getSettings();
    const note = noteTypoOf(view.state, settings.defaultLanguage);
    if (note.disabled) return builder.finish();
    const fmEnd = frontmatterEnd(view.state);
    const caretLine = justEdited
      ? view.state.doc.lineAt(view.state.selection.main.head)
      : null;

    for (const { from, to } of visibleLineRanges(view)) {
      if (to <= fmEnd) continue;
      // fmEnd tombe en fin de ligne : la tranche reste alignée sur des lignes
      // entières, ce dont dépendent les motifs ancrés sur ^ et $.
      const base = Math.max(from, fmEnd);
      const text = view.state.doc.sliceString(base, to);
      // Les métadonnées sont déjà écartées par fmEnd : un « --- » en tête de
      // tranche est un séparateur, qui ne doit rien protéger.
      for (const { pos, side, reason, lang } of findFaultySigns(
        text,
        settings,
        note,
        false
      )) {
        if (
          reason === "line-end" &&
          caretLine &&
          base + pos >= caretLine.from &&
          base + pos <= caretLine.to
        ) {
          continue;
        }
        builder.add(
          base + pos,
          base + pos + 1,
          Decoration.mark({
            class: MARKER_CLASSES[side],
            attributes: {
              title: `${MARKER_TITLES[reason]} (${LANG_NAMES[lang]})`,
            },
          })
        );
      }
    }
    return builder.finish();
  };

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      timer: number | null = null;

      constructor(view: EditorView) {
        this.decorations = build(view, false);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          if (this.timer !== null) window.clearTimeout(this.timer);
          this.timer = window.setTimeout(() => {
            this.timer = null;
            this.decorations = build(update.view, false);
            update.view.dispatch({});
          }, LINE_END_DELAY);
          this.decorations = build(update.view, true);
        } else if (update.viewportChanged) {
          this.decorations = build(update.view, this.timer !== null);
        }
      }

      destroy() {
        if (this.timer !== null) window.clearTimeout(this.timer);
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );
}
