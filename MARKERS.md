# What the red triangle flags

[Version française](REPERES.md)

The plugin draws a small red triangle under a sign in the editor when it spots a typography fault there. Hovering shows the nature of the fault and the language recognised for the line.

The triangle sits against the sign at fault:

- **on its left**: the space that is expected (or surplus) is in front of the sign;
- **on its right**: it is behind the sign;
- **underneath**: the sign itself is wrong.

The command "Corriger la typographie de la sélection" (fix the typography of the selection) applies the same rules as the markers.

## Which language?

Each line is recognised on its own, so a quotation in another language is tolerated. A line too short to be recognised takes the dominant language of the note, then the default language from the settings. The `smart-typo` note property overrides everything:

| Property | Effect |
|---|---|
| `smart-typo: en` (or `fr`, `de`, `ru`, `tr`, `it`, `es`) | forces the language of the whole note |
| `smart-typo: false` | the note is not checked |

## Switching markers off, language by language

In the plugin settings, "Réglages par langue" (per-language settings) lets you pick a language and switch off families of rules. A family that is off is neither flagged nor corrected by the fix command; unticking "Vérifier le …" (check this language) switches everything off for that language (for French it also stops typing assistance).

| Family | Cases covered | Languages |
|---|---|---|
| Espaces courantes (general spacing) | parentheses, comma, full stop, elision, `;` `!` `?` stuck to the next word, doubled spaces, end of sentence, lines of spaces | all |
| Avant `; ! ?` (before `; ! ?`) | space before the sign (non-breaking in French, none elsewhere) | all |
| Deux-points (colon) | space before `:` | all |
| Guillemets « » | spaces inside the guillemets | fr, ru, tr, it, es |
| Pourcentages (percent) | space or position of `%` | fr, en, de, tr, it, es |
| Guillemets droits (straight quotes) | straight `"` `'`, German `”` | all |
| Trait d'union entre espaces (hyphen between spaces) | `word - word` | all |
| Règles propres (language-specific) | `z. B.` (de), `È` (it), `¿` `¡` (es) | de, it, es |

## What is never flagged

Protected portions: front matter, code (inline and fenced), `$…$` formulas, `[[…]]` and `[…](…)` links, URLs, HTML tags, entities (`&nbsp;`), callout markers (`[!NOTE]`), `%% … %%` comments, note and reference labels (`[^1]:`). A space stuck to a protected portion is left alone, for lack of context.

## All languages

| Case | Faulty example | Marker |
|---|---|---|
| Space after `(` | `( word)` | right of the `(` |
| Space before `)` | `(word )` | left of the `)` |
| Space before a `.` or `,` ending a sentence | `word .` `word ,` | left of the sign |
| Comma stuck to the next word | `word,next` | right of the comma |
| `;` `!` `?` stuck to the following letter | `end;next` | right of the sign |
| `(` stuck to the preceding word | `enfin(frf)` | left of the `(` |
| Elision with a space | `l’ obscurité`, `l ’obscurité`, `l ’ obscurité` | either side of the apostrophe, as the case may be |
| Hyphen between spaces | `word - word` | under the hyphen (a dash is expected: `–`, or `—` in Russian and Spanish) |
| Straight quote or apostrophe | `"word"`, `l'été` | under the sign |
| Doubled space between two signs | `two  spaces` | under the first surplus space |
| Spaces alone on an empty line | a line made of one or more spaces | under the first space |
| One or more spaces after the end of a sentence, at the end of a line | `End. ` + line break | under the space |

Details:

- `chat(s)`, `allié(e)`, `(es)`, `(x)`, `(ée)`, `(ées)`, `(ne)`, `(nes)` are not flagged: the optional ending stays stuck to the word.
- Elision is only recognised after `c d j l m n s t`, `qu`, `jusqu`, `lorsqu`, `puisqu` or `quoiqu`, so as not to mistake it for a single quotation mark (`said ‘yes’ to`).
- Doubled spaces are not flagged in a table, after a bullet, a number, a checkbox or a `>` quote marker (alignment is intentional), nor before punctuation: that punctuation's own rule applies then. Two trailing spaces (a Markdown line break) are left alone, except after the end of a sentence.
- An empty bullet (`1. `, `- `) does not end a sentence.
- The end-of-sentence marker only shows on the line being typed 5 seconds after the last keystroke, so that it does not flicker at each full stop followed by a space.

## French

The expected space is a **non-breaking** one (narrow non-breaking before `; ! ?` and inside guillemets, ordinary non-breaking before `:` and `%`, depending on the ticked families). Two faults are flagged: an ordinary space, which allows a line break, and a missing space. An existing non-breaking space is never flagged, but it does not redeem an ordinary space next to it.

| Case | Faulty example | Marker | Setting |
|---|---|---|---|
| Before `;` `?` `!` | `Quoi ?` `Quoi?` | left of the sign | "Avant ; ! ?" |
| Before `%` | `50 %` `50%` | left of the `%` | "Pourcentages" |
| Before `:` | `Note :` `Note:` | left of the `:` | "Deux-points" |
| After `«` | `« mot` `«mot` | right of the `«` | "Guillemets « »" |
| Before `»` | `mot »` `mot»` | left of the `»` | "Guillemets « »" |

Details:

- In a run such as `?!`, only the first sign is flagged.
- The `:` is only examined when it ends a word and precedes a space, a line end or an emphasis mark (`**Note** :`). `12:30`, `key:: value`, `C:\folder` and URLs are spared.
- `!` followed by `[` (an `![[image]]` embed) is not punctuation.
- `%%`, the Obsidian comment delimiter, is not a percent sign.

## English

| Case | Faulty example | Marker |
|---|---|---|
| Space before `!` `?` | `Hello !` | left of the sign |
| Space before `;` `:` | `Note :` | left of the sign |
| Space between the number and `%` | `50 %` | left of the `%` |

Emoticons (`:)`, `;)`) and table alignment (`:---`) are spared.

## German

| Case | Faulty example | Marker |
|---|---|---|
| Space before `!` `?` `;` `:` | `Hallo !` | left of the sign |
| `%`: a non-breaking space is expected between number and sign | `50%`, `50 %` | left of the `%` |
| English closing quote `”` instead of `“` | `„Hallo”` | under the sign |
| Tight abbreviation: a narrow space is expected | `z.B.` (for `z. B.`) | right of the first full stop |

## Russian

| Case | Faulty example | Marker |
|---|---|---|
| Space before `!` `?` `;` `:` | `Привет !` | left of the sign |
| Space inside « » | `« Привет »` | right of the `«`, left of the `»` |

## Turkish

| Case | Faulty example | Marker |
|---|---|---|
| Space before `!` `?` `;` `:` | `Merhaba !` | left of the sign |
| Space inside « » | `« merhaba »` | right of the `«`, left of the `»` |
| `%` after the number instead of before it | `50%`, `50 %` | under the `%` (`%50` is expected) |

## Italian

| Case | Faulty example | Marker |
|---|---|---|
| Space before `!` `?` `;` `:` | `Ciao !` | left of the sign |
| Space inside « » | `« ciao »` | right of the `«`, left of the `»` |
| Space between the number and `%` | `50 %` | left of the `%` |
| `E'` instead of `È` | `E' vero` | under the `E` (and under the straight apostrophe) |

## Spanish

| Case | Faulty example | Marker |
|---|---|---|
| Space before `!` `?` `;` `:` | `Hola !` | left of the sign |
| Space inside « » | `« hola »` | right of the `«`, left of the `»` |
| Space after `¿` or `¡` | `¿ Qué` | right of the opening sign |
| `%`: a non-breaking space is expected between number and sign | `50%`, `50 %` | left of the `%` |
| `?` or `!` without its opening `¿` or `¡` earlier on the line | `Qué pasa?` | under the closing sign |
