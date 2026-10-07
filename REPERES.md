# Ce que signale le triangle rouge

[English version](MARKERS.md)

Le plugin pose un petit triangle rouge sous un signe de l'éditeur quand il y repère une faute de typographie. Au survol, l'info-bulle donne la nature de la faute et la langue reconnue pour la ligne.

Le triangle se place contre le signe en cause :

- **à gauche** du signe : l'espace attendue (ou en trop) est devant lui ;
- **à droite** du signe : elle est derrière lui ;
- **sous** le signe : c'est le signe lui-même qui est fautif.

La commande « Corriger la typographie de la sélection » applique les mêmes règles que le repérage.

Les réglages sont cités sous leur nom dans l'interface française, à choisir dans « Langue de l'interface » (l'anglais est la langue par défaut).

## Quelle langue ?

Chaque ligne est reconnue séparément, ce qui tolère une citation dans une autre langue. Une ligne trop courte prend la langue dominante de la note, puis la langue par défaut des réglages. La propriété `smart-typo` des métadonnées l'emporte sur tout :

| Propriété | Effet |
|---|---|
| `smart-typo: en` (ou `fr`, `de`, `ru`, `tr`, `it`, `es`) | impose la langue à toute la note |
| `smart-typo: false` | la note n'est pas vérifiée |

## Couper des repères, langue par langue

Dans les réglages du plugin, « Réglages par langue » permet de choisir une langue puis d'y couper des familles de règles. Une famille coupée n'est plus ni repérée, ni corrigée par la commande de correction ; décocher « Vérifier le … » coupe tout pour cette langue (le français coupe aussi la saisie).

| Famille | Cas concernés | Langues |
|---|---|---|
| Espaces courantes | parenthèses, virgule, point, élision, `;` `!` `?` collés, espaces doublées, fin de phrase, lignes d'espaces | toutes |
| Avant `; ! ?` | espace avant (insécable en français, aucune ailleurs) | toutes |
| Deux-points | espace avant `:` | toutes |
| Guillemets « » | espaces dans les guillemets | fr, ru, tr, it, es |
| Pourcentages | espace ou place du `%` | fr, en, de, tr, it, es |
| Guillemets droits | `"` `'` droits, `”` allemand | toutes |
| Trait d'union entre espaces | `mot - mot` | toutes |
| Règles propres | `z. B.` (de), `È` (it), `¿` `¡` (es) | de, it, es |

## Ce qui n'est jamais signalé

Les portions protégées : métadonnées, code (en ligne et en bloc), formules `$…$`, liens `[[…]]` et `[…](…)`, URL, balises HTML, entités (`&nbsp;`), marqueurs de callout (`[!NOTE]`), commentaires `%% … %%`, libellés de notes et de références (`[^1]:`). Une espace collée à une portion protégée est laissée, faute de contexte.

## Toutes les langues

| Cas | Exemple fautif | Repère |
|---|---|---|
| Espace après `(` | `( mot)` | à droite du `(` |
| Espace avant `)` | `(mot )` | à gauche du `)` |
| Espace avant un `.` ou une `,` en fin de phrase | `mot .` `mot ,` | à gauche du signe |
| Virgule collée au mot suivant | `mot,suite` | à droite de la virgule |
| `;` `!` `?` collé à la lettre qui suit | `fin;suite` | à droite du signe |
| `(` collée au mot qui précède | `enfin(frf)` | à gauche du `(` |
| Élision avec une espace | `l’ obscurité`, `l ’obscurité`, `l ’ obscurité` | de part et d'autre de l'apostrophe, selon le côté |
| Trait d'union entre espaces | `mot - mot` | sous le trait d'union (un tiret est attendu : `–`, ou `—` en russe et en espagnol) |
| Guillemet ou apostrophe droit | `"mot"`, `l'été` | sous le signe |
| Espace doublée entre deux signes | `deux  espaces` | sous la première espace en trop |
| Espaces seules sur une ligne vide | une ligne faite d'une ou plusieurs espaces | sous la première espace |
| Une ou plusieurs espaces après une fin de phrase, en bout de ligne | `Fin. ` + retour à la ligne | sous l'espace |

Précisions :

- `chat(s)`, `allié(e)`, `(es)`, `(x)`, `(ée)`, `(ées)`, `(ne)`, `(nes)` ne sont pas signalés : la marque facultative reste collée au mot.
- L'élision n'est reconnue qu'après `c d j l m n s t`, `qu`, `jusqu`, `lorsqu`, `puisqu` ou `quoiqu`, pour ne pas confondre avec un guillemet simple (`dit ‘oui’ à`).
- L'espace doublée n'est pas signalée dans un tableau, après une puce, un numéro, une case à cocher ou un `>` de citation (l'alignement est voulu), ni devant une ponctuation : c'est alors la règle de cette ponctuation qui s'applique. Les deux espaces en fin de ligne (saut de ligne Markdown) sont laissées, sauf après une fin de phrase.
- Une puce vide (`1. `, `- `) n'est pas une fin de phrase.
- Le repère de fin de phrase n'apparaît sur la ligne en cours de frappe que 5 secondes après la dernière frappe, pour ne pas clignoter à chaque point suivi d'une espace.
- De même, une faute collée au curseur, à des espaces près (`tu |.`, `va, |`), attend 5 secondes après la dernière frappe, car la suivante la corrige souvent. Elle apparaît aussitôt que le curseur s'éloigne.

## Français

L'espace attendue est une **insécable** (fine insécable avant `; ! ?` et dans les guillemets, insécable ordinaire avant `:` et `%`, selon les familles de règles cochées). Deux fautes sont signalées : l'espace ordinaire, qui autorise un retour à la ligne, et l'espace absente. Une insécable déjà présente n'est jamais signalée, mais elle ne rachète pas une espace ordinaire qui la côtoie.

| Cas | Exemple fautif | Repère | Réglage |
|---|---|---|---|
| Avant `;` `?` `!` | `Quoi ?` `Quoi?` | à gauche du signe | « Avant ; ! ? » |
| Avant `%` | `50 %` `50%` | à gauche du `%` | « Pourcentages » |
| Avant `:` | `Note :` `Note:` | à gauche du `:` | « Deux-points » |
| Après `«` | `« mot` `«mot` | à droite du `«` | « Guillemets « » » |
| Avant `»` | `mot »` `mot»` | à gauche du `»` | « Guillemets « » » |

Précisions :

- Dans une suite comme `?!`, seul le premier signe est signalé.
- Le `:` n'est examiné que s'il termine un mot et précède une espace, une fin de ligne ou une emphase (`**Note** :`). `12:30`, `clé:: valeur`, `C:\dossier` et les URL sont épargnés.
- `!` suivi de `[` (intégration `![[image]]`) n'est pas une ponctuation.
- `%%`, délimiteur de commentaire Obsidian, n'est pas un pourcentage.

## Anglais

| Cas | Exemple fautif | Repère |
|---|---|---|
| Espace avant `!` `?` | `Hello !` | à gauche du signe |
| Espace avant `;` `:` | `Note :` | à gauche du signe |
| Espace entre le nombre et `%` | `50 %` | à gauche du `%` |

Les émoticônes (`:)`, `;)`) et l'alignement des tableaux (`:---`) sont épargnés.

## Allemand

| Cas | Exemple fautif | Repère |
|---|---|---|
| Espace avant `!` `?` `;` `:` | `Hallo !` | à gauche du signe |
| `%` : espace insécable attendue entre le nombre et le signe | `50%`, `50 %` | à gauche du `%` |
| Guillemet fermant anglais `”` au lieu de `“` | `„Hallo”` | sous le signe |
| Abréviation serrée : espace fine attendue | `z.B.` (pour `z. B.`) | à droite du premier point |

## Russe

| Cas | Exemple fautif | Repère |
|---|---|---|
| Espace avant `!` `?` `;` `:` | `Привет !` | à gauche du signe |
| Espace dans les guillemets « » | `« Привет »` | à droite du `«`, à gauche du `»` |

## Turc

| Cas | Exemple fautif | Repère |
|---|---|---|
| Espace avant `!` `?` `;` `:` | `Merhaba !` | à gauche du signe |
| Espace dans les guillemets « » | `« merhaba »` | à droite du `«`, à gauche du `»` |
| `%` placé après le nombre au lieu d'avant | `50%`, `50 %` | sous le `%` (on attend `%50`) |

## Italien

| Cas | Exemple fautif | Repère |
|---|---|---|
| Espace avant `!` `?` `;` `:` | `Ciao !` | à gauche du signe |
| Espace dans les guillemets « » | `« ciao »` | à droite du `«`, à gauche du `»` |
| Espace entre le nombre et `%` | `50 %` | à gauche du `%` |
| `E'` au lieu de `È` | `E' vero` | sous le `E` (et sous l'apostrophe droite) |

## Espagnol

| Cas | Exemple fautif | Repère |
|---|---|---|
| Espace avant `!` `?` `;` `:` | `Hola !` | à gauche du signe |
| Espace dans les guillemets « » | `« hola »` | à droite du `«`, à gauche du `»` |
| Espace après `¿` ou `¡` | `¿ Qué` | à droite du signe ouvrant |
| `%` : espace insécable attendue entre le nombre et le signe | `50%`, `50 %` | à gauche du `%` |
| `?` ou `!` sans son ouvrant `¿` ou `¡` plus tôt sur la ligne | `Qué pasa?` | sous le signe fermant |
