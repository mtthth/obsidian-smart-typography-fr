/*
 * Smart Typography FR : repère rouge des espacements fautifs dans l'éditeur.
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
import { SignSide, findFaultySigns } from "fixTypography";
import { SmartTypographySettings } from "types";

const MARKER_CLASSES: Record<SignSide, string> = {
  before: "smart-typography-fr-marker-before",
  after: "smart-typography-fr-marker-after",
};

// Info-bulle portée par le signe lui-même : elle s'affiche au survol du signe
// comme du caret dessiné contre lui.
const MARKER_ATTRIBUTES = {
  title: "Espacement fautif : une espace insécable est attendue ici.",
};

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
  const build = (view: EditorView): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    if (!isInScope(view.state)) return builder.finish();

    const settings = getSettings();
    const fmEnd = frontmatterEnd(view.state);

    for (const { from, to } of visibleLineRanges(view)) {
      if (to <= fmEnd) continue;
      // fmEnd tombe en fin de ligne : la tranche reste alignée sur des lignes
      // entières, ce dont dépendent les motifs ancrés sur ^ et $.
      const base = Math.max(from, fmEnd);
      const text = view.state.doc.sliceString(base, to);
      for (const [sign, side] of findFaultySigns(text, settings)) {
        builder.add(
          base + sign,
          base + sign + 1,
          Decoration.mark({
            class: MARKER_CLASSES[side],
            attributes: MARKER_ATTRIBUTES,
          })
        );
      }
    }
    return builder.finish();
  };

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = build(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );
}
