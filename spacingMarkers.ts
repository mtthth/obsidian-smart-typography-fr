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
  SignSide,
  findFaultySigns,
  noteTypo,
  touchesCaret,
} from "fixTypography";
import { uiStrings } from "i18n";
import { Lang } from "languages";
import { SmartTypographySettings } from "types";

const MARKER_CLASSES: Record<SignSide, string> = {
  before: "smart-typography-fr-marker-before",
  after: "smart-typography-fr-marker-after",
  on: "smart-typography-fr-marker-on",
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
// d'une phrase. Un bloc qui ne se ferme pas dans le début de la note n'en est
// pas un, comme pour noteTypoOf : inutile de parcourir toute la note.
export function frontmatterEnd(state: EditorState): number {
  const doc = state.doc;
  if (doc.line(1).text.trimEnd() !== "---") return 0;
  for (let n = 2; n <= doc.lines && doc.line(n).from < NOTE_HEAD; n++) {
    if (doc.line(n).text.trimEnd() === "---") return doc.line(n).to;
  }
  return 0;
}

// Réglage de la note pour un éditeur. Relire la langue dominante sur des
// milliers de caractères à chaque touche coûte, et une frappe ne la change
// guère : pendant la frappe (`fresh` faux), le dernier calcul sert tant que les
// métadonnées, où se lit la propriété smart-typo, restent les mêmes.
export function noteCache(defaultLang: () => Lang) {
  let note: NoteTypo | null = null;
  let head = "";
  return (state: EditorState, fmEnd: number, fresh: boolean): NoteTypo => {
    const current = state.doc.sliceString(0, fmEnd);
    if (fresh || !note || current !== head) {
      note = noteTypoOf(state, defaultLang());
      head = current;
    }
    return note;
  };
}

export function createSpacingMarkerPlugin(
  getSettings: () => SmartTypographySettings,
  isInScope: (state: EditorState) => boolean,
  // Obsidian's "Strict line breaks" setting, read on each build.
  strictLineBreaks: () => boolean
) {
  // Une espace tapée après un point est le plus souvent suivie d'un mot : le
  // repère de fin de ligne n'apparaît donc que 5 s après la dernière frappe.
  // So does a missing final punctuation: the line is still being written.
  // Likewise for any fault against the caret (`tu |.`, `va, |`): the next
  // keystroke often fixes it.
  const LINE_END_DELAY = 5000;

  const build = (
    view: EditorView,
    justEdited: boolean,
    noteOf: ReturnType<typeof noteCache>
  ): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    if (!isInScope(view.state)) return builder.finish();

    const settings = getSettings();
    const t = uiStrings(settings.uiLanguage);
    const fmEnd = frontmatterEnd(view.state);
    const note = noteOf(view.state, fmEnd, !justEdited);
    if (note.disabled) return builder.finish();
    const caret = view.state.selection.main.head;
    const caretLine = justEdited ? view.state.doc.lineAt(caret) : null;

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
        false,
        strictLineBreaks()
      )) {
        if (
          (reason === "line-end" || reason === "no-ending") &&
          caretLine &&
          base + pos >= caretLine.from &&
          base + pos <= caretLine.to
        ) {
          continue;
        }
        if (
          caretLine &&
          base + pos >= caretLine.from &&
          base + pos <= caretLine.to &&
          touchesCaret(text, pos, caret - base)
        ) {
          continue;
        }
        builder.add(
          base + pos,
          base + pos + 1,
          Decoration.mark({
            class: MARKER_CLASSES[side],
            // The tooltip sits on the sign itself, so it shows when hovering
            // the sign as well as the caret drawn against it. It names the
            // language recognised for the line.
            attributes: {
              title: `${t.markerTitles[reason]} (${t.langNames[lang]})`,
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
      noteOf = noteCache(() => getSettings().defaultLanguage);

      constructor(view: EditorView) {
        this.decorations = build(view, false, this.noteOf);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          if (this.timer !== null) window.clearTimeout(this.timer);
          this.timer = window.setTimeout(() => {
            this.timer = null;
            this.decorations = build(update.view, false, this.noteOf);
            update.view.dispatch({});
          }, LINE_END_DELAY);
          this.decorations = build(update.view, true, this.noteOf);
        } else if (update.viewportChanged || (update.selectionSet && this.timer !== null)) {
          // A caret moved away no longer holds back the faults it touched.
          this.decorations = build(update.view, this.timer !== null, this.noteOf);
        }
      }

      destroy() {
        if (this.timer !== null) window.clearTimeout(this.timer);
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );
}
