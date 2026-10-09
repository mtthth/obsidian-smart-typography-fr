/*
 * Smart Typography FR : réécriture d'une frappe par les règles de saisie,
 * d'après Smart Typography de mgmeyers.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 */

import {
  ChangeSpec,
  EditorSelection,
  Transaction,
} from "@codemirror/state";
import { InputRule } from "inputRules";

// Règle retenue pour un changement, et le texte qu'elle insère.
export interface RuleMatch {
  rule: InputRule;
  insert: string;
}

export interface InputRewrite {
  changes: ChangeSpec[];
  selection: EditorSelection;
  // Rétablit ce qui a été tapé, sur le document que `changes` produisent.
  reverts: ChangeSpec[];
}

// Réécrit une frappe selon les règles qui s'appliquent à ses changements
// (`ruleAt` reçoit leurs positions avant et après la frappe), ou null si
// aucune ne s'applique. Chaque changement est gardé, réécrit ou non : avec
// plusieurs curseurs, une frappe qu'aucune règle ne touche est tapée quand
// même, et du texte sélectionné que la frappe remplace est effacé.
export function rewriteInput(
  tr: Transaction,
  ruleAt: (fromA: number, fromB: number, inserted: string) => RuleMatch | null
): InputRewrite | null {
  const changes: ChangeSpec[] = [];
  const reverts: ChangeSpec[] = [];
  // Où chaque réécriture se trouve dans tr.newDoc, et de combien elle
  // allonge le texte : de quoi placer les curseurs.
  const shifts: { at: number; by: number }[] = [];
  let shift = 0;
  let lastEnd = 0;

  tr.changes.iterChanges((fromA, toA, fromB, _toB, text) => {
    const inserted = text.sliceString(0);
    const match = ruleAt(fromA, fromB, inserted);
    const replaced = match ? match.rule.from.length - match.rule.trigger.length : 0;
    // Une règle qui empiéterait sur le changement précédent est écartée.
    if (!match || fromA - replaced < lastEnd) {
      changes.push({ from: fromA, to: toA, insert: text });
    } else {
      const { rule, insert } = match;
      changes.push({ from: fromA - replaced, to: toA, insert });
      // Le retour arrière rétablit le texte réellement remplacé, et non
      // rule.from : les garde-fous français y écrivent une fine U+202F,
      // alors que l'espace en place suit le réglage (U+00A0, U+2009…).
      const at = fromB - replaced + shift;
      reverts.push({
        from: at,
        to: at + insert.length,
        insert: tr.startState.doc.sliceString(fromA - replaced, fromA) + inserted,
      });
      const by = insert.length - rule.from.length;
      shifts.push({ at: fromB, by });
      shift += by;
    }
    lastEnd = toA;
  }, false);

  if (shifts.length === 0) return null;

  // Un curseur se décale des réécritures qui le précèdent, la sienne comprise.
  const moved = (pos: number) =>
    shifts.reduce((p, { at, by }) => (pos > at ? p + by : p), pos);
  const selection = EditorSelection.create(
    tr.newSelection.ranges.map((r) =>
      EditorSelection.range(moved(r.anchor), moved(r.head))
    ),
    tr.newSelection.mainIndex
  );
  return { changes, selection, reverts };
}
