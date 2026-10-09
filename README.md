# Smart Typography FR

[Version française](README.fr.md) · [What the red triangle flags](MARKERS.md)

By Matthieu Thomas (cidrolin), from an idea by mgmeyers: this plugin is a fork of his [Smart Typography](https://github.com/mgmeyers/obsidian-smart-typography) **1.0.18**, whose code it reuses. The upstream history is kept: the fork starts from tag `1.0.18`, and the original repository is declared as the `upstream` remote.

The plugin's interface (settings, commands, notices) is in French.

## Installation

```powershell
npm install
.\deploy.ps1
```

`deploy.ps1` builds, then copies `main.js`, `manifest.json` and `styles.css` to `G:\Mon Drive\txt\journal\.obsidian\plugins\obsidian-smart-typography\` (other destination: `.\deploy.ps1 -VaultPluginPath <folder>`). It never touches `data.json`, which holds the settings. Then reload Obsidian.

The manifest `id` (`smart-typography-fr`) differs from the original: Obsidian's update checker will never tie this copy to the upstream repository. The vault folder keeps the original name: Obsidian has already stored the plugin and its settings there, and a second folder with the same `id` would load two competing copies. If you already had the original plugin, disable it so that both rule sets do not clash.

## Added settings

**Interface language**: English (default) or French, for the settings, menus, notices and marker tooltips. Command names follow the next time Obsidian is reloaded.

**Scope**: a "Limit to some folders" switch plus a list, one path per line, relative to the vault root, subfolders included, case-sensitive. Empty list = plugin inactive everywhere.

**Per-language settings**: a menu picks the language (French, English, German, Russian, Turkish, Italian, Spanish), then each family of rules can be switched on or off for it: common spacing, before `; ! ?`, colon, guillemets « », percentages, straight quotes, hyphen between spaces, language-specific rules. "Check …" switches the whole language off. These settings drive the selection fix command and the red markers; for French they also drive typing. See [MARKERS.md](MARKERS.md) for the detail of each family. The former French switches (colon, guillemets, percent) are carried over as they were into the French language.

**French typing assistance**: off by default ("Spaces before double punctuation", in the French settings). Once on:

| You type            | Result        | Space  |
|---------------------|---------------|--------|
| `mot;` or `mot ;`   | `mot ;`       | U+202F |
| `mot!` or `mot !`   | `mot !`       | U+202F |
| `mot?` or `mot ?`   | `mot ?`       | U+202F |
| `mot:` or `mot :`   | `mot :`       | U+00A0 |
| `<<` or `«`         | `« `          | U+202F |
| `>>` or `»`         | ` »`          | U+202F |
| `50%` or `50 %`     | `50 %`        | U+00A0 |

The colon takes a full non-breaking space, not a narrow one: an Imprimerie nationale rule, a narrow space would be too tight there. A menu lets you fall back from the narrow space to U+00A0 or U+2009 if your font does not render U+202F. Colon, guillemets and percent each have their own switch, in the French settings.

Only one space in front of a group: `Oh !!` gives `Oh !!`, not `Oh ! !`.

Punctuation following a closing mark also gets its space, placed after the mark: `*mot*?` gives `*mot* ?`, likewise after `**`, `` ` ``, `~~`, `==` or `</u>`. `”` and `›` count as the end of a word.

## Fixing text that is already written

The command **"Fix typography in selection"** (command palette, and right-click when text is selected) applies in one go to the selected text the rules of each line's language (see [Languages](#languages)), with the same settings as typing: narrow space character, and the families of rules ticked for each language. It has no default shortcut; assign one in Settings → Hotkeys. Everything undoes with a single `Ctrl + Z`, and the selection stays active afterwards.

It is an explicit command: it does not depend on the folder scope, nor on the "Spaces before double punctuation" switch.

| Example | Fix applied |
|---------|-------------|
| `Bonjour ; ça va ?` | narrow non-breaking space before `;` `!` `?` |
| `Attention : ici` | non-breaking space before `:` |
| `50 %` | non-breaking space before `%` (never before `%%`, which delimits a comment) |
| `« citation »` | narrow spaces inside the guillemets |
| `Il a dit "bonjour"` | paired straight quotes → `« bonjour »` |
| `l'été` | typographic apostrophe (if "Curly Quotes" is on) |
| `Ah...` | ellipsis `Ah…` (if "Ellipsis" is on) |
| `mot , suite` | stray space before the comma removed |
| `enfin(frf)` | space added before the parenthesis (except `chat(s)`, `allié(e)`) |
| `fin;suite` | space added after a `;` `!` `?` stuck to a letter |
| `l ’ obscurité`, `l’ obscurité` | elision tightened: `l’obscurité` |
| `Fin. ` or `A, ` at the end of a line | trailing spaces removed (two spaces after a word, a Markdown line break, are kept) |
| a line made of spaces | spaces removed |

The command is idempotent: running it again on text that is already fixed changes nothing. It never touches code blocks and spans, formulas, links and embeds, URLs, HTML tags, reference and footnote definitions (`[ref]: url`, `[^1]: text`), comments (`%% ... %%`), nor the front matter when the selection starts with it. Ambiguous cases are left as they are: `12:30`, `key:: value` (Dataview), `C:\folder`, `:)` and unpaired straight quotes (`5"`).

A `!` or `?` placed right after a protected portion (`` `code` ! ``) does not get its space, for lack of context. And selecting the inside of a front matter block *without* its opening `---` makes the command lose the one clue that tells it so: the `key: value` lines then get a non-breaking space.

Outside French, straight quotes are only converted if "Curly Quotes" is on; hyphens between spaces become dashes.

## Languages

Each line is checked according to its language: French, English, German, Russian, Turkish, Italian or Spanish. The folder scope says where the plugin acts, the language says which rules it applies.

**Detection**: a line's language is recognised from its function words (le, the, der, ve, che, el…), its own letters (ß, ñ, ğ, ê…) and, for Russian, its alphabet. A line too short or too mixed takes the dominant language of the note; a note too short, the **default language** from the settings.

**`smart-typo` property**: right-click in the note → "Note typography language…" (or the command of the same name) sets or removes the property; you can also write it by hand:

| Value | Effect |
|-------|--------|
| absent | automatic detection |
| `fr` `en` `de` `ru` `tr` `it` `es` | language forced for the whole note |
| `false` | no red markers; typing and fixing stay active |

**Typing**: the French typing rules (non-breaking spaces before `;` `!` `?` `:` `%` `»`) only apply on a line recognised as French.

## Flagging typography faults

Setting **"Flag typography mistakes"** (on by default). In the scoped folders, a small red caret-shaped marker, slipped under the line against the faulty sign, flags the faults below. Its tooltip says which one, and the language retained for the line. The full list, language by language, is in [MARKERS.md](MARKERS.md).

**All languages**

| Fault | Example | Fix |
|-------|---------|-----|
| space after `(`, before `)` | `( attire )` | `(attire)` |
| space before `.` or `,` | `attire .` | `attire.` |
| comma stuck to the next word | `mot,suite` | `mot, suite` |
| straight quote or apostrophe | `"non"`, `l'été` | depends on the language |
| hyphen between spaces | `mot - mot` | `mot – mot` (`—` in Russian and Spanish) |
| doubled space | `deux  espaces` | `deux espaces` |
| `(` stuck to the preceding word | `enfin(frf)` | `enfin (frf)` (except `chat(s)`, `allié(e)`) |
| `;` `!` `?` stuck to the next letter | `fin;suite` | `fin; suite` |
| elision with a space | `l’ obscurité`, `l ’obscurité` | `l’obscurité` |
| useless space at the end of a line: one or more after the end of a sentence, one after any other sign | `Fin. `, `A, ` | `Fin.`, `A,` (the marker waits 5 s on the line being typed) |
| line of prose without final punctuation (`. ! ? … : — –` or a closing quote) | `Il part`, `Il part,` | flagged only, never fixed (the marker waits 5 s on the line being typed) |
| spaces alone on an empty line | `   ` | empty line |

**By language**

| Language | Rules |
|----------|-------|
| French | non-breaking space before `;` `!` `?` `:` `%` `»` and after `«` (narrow, or full before `:` and `%`); `"…"` → `« … »` |
| English | no space before `;` `:` `!` `?`; `50%` stuck; `"…"` → `“…”` |
| German | no space before `;` `:` `!` `?`; `50 %` (non-breaking); `„…“`, never `”`; `z. B.`, `d. h.` spaced |
| Russian | no space before `;` `:` `!` `?` nor inside `«…»`; `—` dash |
| Turkish | no space before `;` `:` `!` `?` nor inside `«…»`; `%50`, the sign before the number; `"…"` → `“…”` |
| Italian | no space before `;` `:` `!` `?` nor inside `«…»`; `50%` stuck; `È`, never `E'` |
| Spanish | no space before `;` `:` `!` `?` nor inside `«…»`; paired `¿…?` and `¡…!`, no space after `¿` `¡`; `50 %` (non-breaking); `—` dash |

Decimals (`3,5`), extensions (`a.md`), ellipses, emoticons (`:)`), table alignments (`:---`), bullets, URLs, code and other protected zones are not flagged. Doubled spaces are allowed in tables (lines starting with `|`, or a borderless block that contains a `---|---` line), in indentation, after a bullet, a number or a `>`, and at the end of a line, where two spaces force a line break (after the end of a sentence, though, trailing spaces are flagged; a single trailing space always is). In French, an existing non-breaking space is never flagged; an ordinary space next to it is. Each family of rules can be switched off language by language in the settings (see [Added settings](#added-settings)).

It is purely visual, the text is never modified, and the fix command sorts out what can be sorted out, not the missing `¿`, whose opening it cannot place. The command's protected zones are protected here too; the front matter is recognised on the whole note. Known limit: in a code block or a multi-line `%% … %%` comment whose opening (```, `~~~` or `%%`) is above the visible part, or in indented code whose preceding paragraph is, spaces may be flagged wrongly. The marker is provided by `styles.css`, which `deploy.ps1` copies along with `main.js`.

## Built-in safeguards

- No narrow space inside a URL (`http://a.fr/b?c=1` stays intact), detected on a 96-character window upstream.
- No non-breaking space after a URI scheme (`https:`, `mailto:`, `obsidian:`…).
- `12:30` spared: digits are outside the triggering class.
- No non-breaking space before the colon of a footnote or link definition at the start of a line (`[^1]:`, `[ref]:`).
- `![[image]]` in mid-line: the narrow space set by the `!` is removed as soon as `[` is typed, including with bracket auto-pairing.
- Code blocks, front matter, maths and tags stay excluded, as upstream.
- Backspace undoes each substitution, as for curly quotes.

## Limits

- **Typing rules do not apply to text already written**: for that, use the selection fix command.
- Dataview: `field:: value` gets a non-breaking space on the first `:` and breaks the field. Turn the colon option off if you use them.
- URLs without a scheme (`www.exemple.fr/x?y=1`): the `?` gets a narrow space.
- Scope is read through `editorInfoField` when Obsidian exposes it, otherwise through the active file: an unfocused hover editor may then be judged on the path of the note beneath it.
- A search for `mot ;` with an ordinary space will no longer find anything.
- Detection can be wrong on a short line that mixes two languages; the `smart-typo` property then decides for the whole note.

## Tests

`npm test` checks fixing, flagging and language detection (`fixTypography.ts`, `languages.ts`), without Obsidian and without any extra dependency.

## Building

`npm run build` produces `main.js`, which git ignores. TypeScript was raised to 5.4 because the `.d.ts` files of `@lezer/common` use the `export { type X }` syntax, which the TS 4.2 pinned upstream does not understand; it compiled anyway, but without checking much.

`@codemirror/language` comes from the npm registry and no longer from the upstream git fork, which npm 12 refuses to install. The module remains external to the bundle: Obsidian provides it. `tokenClassNodeProp` only exists in Obsidian's CodeMirror: it is read through an `as any`, hence a build without warnings.

## Comparing with upstream

Tag `1.0.18` comes from the upstream repository. On a fresh clone, fetch it first, then compare:

```bash
git remote add upstream https://github.com/mgmeyers/obsidian-smart-typography
git fetch upstream --tags
git diff 1.0.18 HEAD
```

## Licence

GPL-3.0 (see [LICENSE.md](LICENSE.md)), like the original plugin whose code this fork reuses.

- Smart Typography: © 2021-2022 mgmeyers.
- Modifications: © 2026 Matthieu Thomas (cidrolin). Folder scope and French typography, added from 24 August 2026 in `main.ts`, `types.ts`, `inputRules.ts` and `manifest.json`.
- `frenchRules.ts`, written for this fork, is also available under the MIT licence (text at the top of the file): you may reuse it elsewhere under either licence.
