# Smart Typography FR

[English version](README.md) · [Cas signalés par le triangle rouge](REPERES.md)

Par Matthieu Thomas (cidrolin), sur une idée de mgmeyers : ce plugin est un
fork de son [Smart Typography](https://github.com/mgmeyers/obsidian-smart-typography)
**1.0.18**, dont il reprend le code. L'historique amont est conservé : le
fork part du tag `1.0.18`, et le dépôt d'origine est déclaré comme remote
`upstream`.

## Installation

Demande Obsidian 1.4.4 ou plus récent (le menu de langue de la note écrit la
propriété `smart-typo` par `processFrontMatter`), et sur iPhone ou iPad iOS 16.4
ou plus récent, dont le moteur est le premier à reconnaître les expressions
régulières dont le plugin se sert.

```powershell
npm install
.\deploy.ps1
```

`deploy.ps1` compile puis copie `main.js`, `manifest.json` et `styles.css` dans
`G:\Mon Drive\txt\journal\.obsidian\plugins\obsidian-smart-typography\`
(autre destination : `.\deploy.ps1 -VaultPluginPath <dossier>`). Il ne
touche jamais à `data.json`, qui contient les réglages. Rechargez ensuite
Obsidian.

L'`id` du manifest (`smart-typography-fr`) diffère de l'original : le
vérificateur de mise à jour d'Obsidian ne rattachera jamais cette copie au
dépôt amont. Le dossier du coffre, lui, garde le nom d'origine : Obsidian y
a déjà enregistré le plugin et ses réglages, et un second dossier portant
le même `id` ferait charger deux copies concurrentes. Si vous aviez déjà le
plugin d'origine, désactivez-le pour éviter que les deux jeux de règles se
marchent dessus.

## Réglages ajoutés

**Langue de l'interface** — anglais par défaut, ou français : réglages,
menus, notifications et info-bulles des repères. Le nom des commandes suit
au prochain rechargement d'Obsidian. Ce document cite les noms de
l'interface française.

**Portée** — un interrupteur « Limiter à certains dossiers » + une liste,
un chemin par ligne, relatif à la racine du coffre, sous-dossiers compris,
casse respectée. Liste vide = plugin inactif partout.

**Réglages par langue** — un menu choisit la langue (français, anglais,
allemand, russe, turc, italien, espagnol), puis chaque famille de règles s'y
coupe ou s'y active : espaces courantes, avant `; ! ?`, deux-points,
guillemets « », pourcentages, guillemets droits, trait d'union entre espaces,
règles propres à la langue. « Vérifier le … » coupe toute la langue. Ces
réglages commandent la correction de la sélection et le repérage rouge ; en
français, ils règlent aussi la saisie. Voir [REPERES.md](REPERES.md) pour le
détail de chaque famille. Les anciens interrupteurs français (deux-points,
guillemets, pourcentages) sont repris tels quels dans la langue française.

**Typographie française à la saisie** — désactivée par défaut
(« Espaces avant la ponctuation double », dans les réglages du français). Une
fois activée :

| Saisie              | Résultat      | Espace |
|---------------------|---------------|--------|
| `mot;` ou `mot ;`   | `mot ;`       | U+202F |
| `mot!` ou `mot !`   | `mot !`       | U+202F |
| `mot?` ou `mot ?`   | `mot ?`       | U+202F |
| `mot:` ou `mot :`   | `mot :`       | U+00A0 |
| `<<` ou `«`         | `« `          | U+202F |
| `>>` ou `»`         | ` »`          | U+202F |
| `50%` ou `50 %`     | `50 %`        | U+00A0 |

Le deux-points prend une insécable pleine, pas une fine : règle de
l'Imprimerie nationale, une fine y serait trop serrée. Un menu permet de
rabattre la fine sur U+00A0 ou U+2009 si votre police ne rend pas U+202F.
Deux-points, guillemets et pourcentages ont chacun leur interrupteur, dans
les réglages du français.

Une seule espace devant un groupe : `Oh !!` donne `Oh !!`, pas `Oh ! !`.

La ponctuation qui suit une balise fermante reçoit aussi son espace, placée
après la balise : `*mot*?` donne `*mot* ?`, de même après `**`, `` ` ``,
`~~`, `==` ou `</u>`. `”` et `›` comptent comme fin de mot.

## Corriger un texte déjà écrit

La commande **« Corriger la typographie de la sélection »** (palette de
commandes, et clic droit quand du texte est sélectionné) applique d'un coup
au texte sélectionné les règles de la langue de chaque ligne (voir
[Langues](#langues)), avec les mêmes réglages que la saisie : caractère
d'espace fine, et familles de règles cochées pour chaque langue. Elle n'a pas de raccourci par défaut ; attribuez-le dans Réglages
→ Raccourcis clavier. Avec plusieurs sélections (plusieurs curseurs), chacune
est corrigée à part. Tout s'annule d'un seul `Ctrl + Z`, et la sélection
reste active après coup.

C'est une commande explicite : elle ne dépend pas de la portée par dossier, ni
de l'interrupteur « Espaces avant la ponctuation double ».

| Exemple | Correction appliquée |
|---------|----------------------|
| `Bonjour ; ça va ?` | espace fine insécable avant `;` `!` `?` |
| `Attention : ici` | espace insécable avant `:` |
| `50 %` | espace insécable avant `%` (jamais avant `%%`, qui délimite un commentaire) |
| `« citation »` | espaces fines à l'intérieur des guillemets |
| `Il a dit "bonjour"` | guillemets droits appariés → `« bonjour »` |
| `l'été` | apostrophe typographique (si « Guillemets courbes » est actif) |
| `dit 'oui'` | guillemets simples `‘oui’` quand l'apostrophe ouvre un mot et qu'une autre la referme (si « Guillemets courbes » est actif) ; sinon apostrophes (`’90s`) |
| `Ah...` | points de suspension `Ah…` (si « Points de suspension » est actif) |
| `mot , suite` | espace parasite avant la virgule supprimée |
| `enfin(frf)` | espace ajoutée avant la parenthèse (sauf `chat(s)`, `allié(e)`) |
| `fin;suite` | espace ajoutée après `;` `!` `?` collé à une lettre |
| `l ’ obscurité`, `l’ obscurité` | élision resserrée : `l’obscurité` |
| `Fin. ` ou `A, ` en bout de ligne | espaces finales supprimées (deux espaces après un mot, saut de ligne Markdown, sont gardées) |
| ligne faite d'espaces | espaces supprimées |

La commande est idempotente : la relancer sur un texte déjà corrigé ne change
rien. Elle ne touche jamais aux blocs et portions de code, aux formules, aux
liens et images intégrées, aux URL, aux balises HTML, aux définitions de
référence et de note (`[ref]: url`, `[^1]: texte`), aux commentaires
(`%% ... %%`), ni au bloc de métadonnées quand la sélection commence par lui.
Les cas ambigus sont laissés tels quels : `12:30`, `clé:: valeur` (Dataview),
`C:\dossier`, `:)` et les guillemets droits non appariés (`5"`), même à côté
d'une paire (`5" et "ceci"`).

Un `!` ou `?` placé juste après une portion protégée (`` `code` ! ``) ne reçoit
pas son espace, faute de contexte. Et sélectionner l'intérieur d'un bloc de
métadonnées *sans* son `---` ouvrant fait perdre à la commande le seul indice
qui le lui signale : les `clé: valeur` reçoivent alors une insécable.

Hors du français, les guillemets droits ne sont convertis que si « Guillemets
courbes » est actif ; les traits d'union entre espaces deviennent des tirets.

## Langues

Chaque ligne est vérifiée selon sa langue : français, anglais, allemand,
russe, turc, italien ou espagnol. La portée par dossier dit où le plugin agit,
la langue dit quelles règles il applique.

**Détection** — la langue d'une ligne est reconnue à ses mots-outils (le, the,
der, ve, che, el…), à ses lettres propres (ß, ñ, ğ, ê…) et, pour le russe, à son
alphabet. Une ligne trop courte ou trop mêlée prend la langue dominante de la
note ; une note trop courte, la **langue par défaut** des réglages.

**Propriété `smart-typo`** — clic droit dans la note → « Langue typographique
de la note… » (ou la commande du même nom) pose ou retire la propriété ; on
peut aussi l'écrire à la main :

| Valeur | Effet |
|--------|-------|
| absente | détection automatique |
| `fr` `en` `de` `ru` `tr` `it` `es` | langue imposée à toute la note |
| `false` | aucun repère rouge ; saisie et correction restent actives |

**Saisie** — les règles de saisie françaises (insécables devant `;` `!` `?`
`:` `%` `»`) ne jouent que sur une ligne reconnue comme française.

## Repérer les fautes de typographie

Réglage **« Signaler les fautes de typographie »** (activé par défaut). Dans les
dossiers concernés, un petit repère rouge en forme de caret, glissé sous la
ligne contre le signe fautif, marque les fautes ci-dessous. Son info-bulle dit
laquelle, et la langue retenue pour la ligne.

**Toutes langues**

| Faute | Exemple | Correction |
|-------|---------|------------|
| espace après `(`, avant `)` | `( attire )` | `(attire)` |
| espace avant `.` ou `,` | `attire .` | `attire.` |
| virgule collée au mot suivant | `mot,suite` | `mot, suite` |
| guillemet ou apostrophe droit | `"non"`, `l'été` | selon la langue |
| trait d'union entre espaces | `mot - mot` | `mot – mot` (`—` en russe et espagnol) |
| espace doublée | `deux  espaces` | `deux espaces` |
| `(` collée au mot qui précède | `enfin(frf)` | `enfin (frf)` (hors `chat(s)`, `allié(e)`) |
| `;` `!` `?` collé à la lettre suivante | `fin;suite` | `fin; suite` |
| élision avec espace | `l’ obscurité`, `l ’obscurité` | `l’obscurité` |
| espace inutile en bout de ligne : une ou plusieurs après une fin de phrase, une seule après tout autre signe | `Fin. `, `A, ` | `Fin.`, `A,` (le repère attend 5 s sur la ligne en cours de frappe) |
| ligne de prose sans ponctuation finale (`. ! ? … : — –` ou guillemet fermant) | `Il part`, `Il part,` | signalée seulement, jamais corrigée (le repère attend 5 s sur la ligne en cours de frappe) |
| espaces seules sur une ligne vide | `   ` | ligne vide |

**Par langue**

| Langue | Règles |
|--------|--------|
| français | insécable devant `;` `!` `?` `:` `%` `»` et derrière `«` (fine, ou pleine devant `:` et `%`) ; `"…"` → `« … »` |
| anglais | aucune espace devant `;` `:` `!` `?` ; `50%` collé ; `"…"` → `“…”` |
| allemand | aucune espace devant `;` `:` `!` `?` ; `50 %` (insécable) ; `„…“`, jamais `”` ; `z. B.`, `d. h.` espacés |
| russe | aucune espace devant `;` `:` `!` `?` ni dans `«…»` ; tiret `—` |
| turc | aucune espace devant `;` `:` `!` `?` ni dans `«…»` ; `%50`, le signe avant le nombre ; `"…"` → `“…”` |
| italien | aucune espace devant `;` `:` `!` `?` ni dans `«…»` ; `50%` collé ; `È`, jamais `E'` |
| espagnol | aucune espace devant `;` `:` `!` `?` ni dans `«…»` ; `¿…?` et `¡…!` appariés, sans espace après `¿` `¡` ; `50 %` (insécable) ; tiret `—` |

Les décimales (`3,5`), extensions (`a.md`), points de suspension, émoticônes
(`:)`), alignements de tableau (`:---`), puces, URL, code et autres zones
protégées ne sont pas signalés. Les espaces doublées sont permises dans les
tableaux (lignes qui commencent par `|`, ou bloc sans bordure qui contient une
ligne `---|---`), dans l'indentation, après une puce, un numéro ou un `>`, et
en fin de ligne (après une fin de phrase, elles sont en revanche signalées, et une espace seule l'est toujours), où deux espaces forcent un retour à la ligne. En français, une
insécable déjà présente n'est jamais signalée ; une espace ordinaire qui la
côtoie l'est. Chaque famille de règles se coupe langue par langue dans les
réglages (voir [Réglages par langue](#réglages-ajoutés)). Le détail de tous les
cas, langue par langue, est dans [REPERES.md](REPERES.md).

C'est purement visuel, le texte n'est jamais modifié, et la commande de
correction règle ce qui peut l'être — pas le `¿` manquant, dont elle ne sait
où placer l'ouverture. Les zones protégées de la commande le sont aussi
ici ; le bloc de métadonnées est reconnu sur la note entière. Limite connue :
dans un bloc de code ou un commentaire `%% … %%` sur plusieurs lignes dont
l'ouverture (```, `~~~` ou `%%`) est au-dessus de la partie visible, ou dans
du code indenté dont le paragraphe précédent l'est, des espaces peuvent être
signalées à tort. Ce repère est fourni par
`styles.css`, que `deploy.ps1` copie avec `main.js`.

## Garde-fous intégrés

- Aucune fine à l'intérieur d'une URL (`http://a.fr/b?c=1` reste intact),
  détecté sur une fenêtre de 96 caractères en amont.
- Aucune insécable après un schéma d'URI (`https:`, `mailto:`, `obsidian:`…).
- `12:30` épargné : les chiffres sont hors de la classe déclenchante.
- Aucune insécable devant le deux-points d'une définition de note ou de
  lien en début de ligne (`[^1]:`, `[ref]:`).
- `![[image]]` en milieu de ligne : la fine posée par le `!` est retirée
  dès la frappe du `[`, y compris avec l'auto-appariement des crochets.
- Blocs de code, frontmatter, maths et tags restent exclus, comme en amont.
- Le retour arrière annule chaque substitution, comme pour les guillemets
  courbes.

## Limites

- **Les règles de saisie ne s'appliquent pas au texte déjà écrit** : pour cela, la commande de correction de la sélection.
- Dataview : `champ:: valeur` reçoit une insécable sur le premier `:` et
  casse le champ. Désactivez l'option deux-points si vous en posez.
- Une URL sans schéma n'est reconnue qu'à partir de `www.` ou d'un domaine
  suivi d'un chemin (`exemple.fr/x?y=1`) : `exemple.fr?y=1` reçoit encore une
  fine.
- En début de ligne, `---` donne un tiret cadratin, pour les dialogues ; un
  quatrième `-` rend `---` (métadonnées, filet, tableau sans bordure). Les
  tirets sont laissés dans un commentaire HTML (`<!-- … -->`) et après le `|`
  d'un tableau.
- La portée est lue via `editorInfoField` quand Obsidian l'expose, sinon
  via le fichier actif — un éditeur en survol non focalisé peut alors être
  jugé sur le chemin de la note de dessous.
- Une recherche sur `mot ;` avec une espace ordinaire ne trouvera plus rien.
- La détection peut se tromper sur une ligne courte qui mêle deux langues ;
  la propriété `smart-typo` tranche alors pour toute la note.

## Tests

`npm test` vérifie la correction, le repérage et la détection de langue
(`fixTypography.ts`, `languages.ts`), sans
Obsidian ni dépendance de plus.

## Compiler

`npm run build` produit `main.js`, que git ignore. TypeScript est remonté en
5.4 parce que les `.d.ts` de `@lezer/common` utilisent la syntaxe
`export { type X }`, que le TS 4.2 épinglé en amont ne comprend pas — il
compilait quand même, mais sans vérifier grand-chose.

`@codemirror/language` vient du registre npm et non plus du fork git de
l'amont, que npm 12 refuse d'installer. Le module reste externe au bundle :
c'est Obsidian qui le fournit. `tokenClassNodeProp` n'existe que dans le
CodeMirror d'Obsidian : il est lu par un `as any`, d'où un build sans
avertissement.

## Comparer à l'amont

Le tag `1.0.18` vient du dépôt amont. Sur un nouveau clone, récupérez-le
d'abord, puis comparez :

```bash
git remote add upstream https://github.com/mgmeyers/obsidian-smart-typography
git fetch upstream --tags
git diff 1.0.18 HEAD
```

## Licence

GPL-3.0 (voir [LICENSE.md](LICENSE.md)), comme le plugin d'origine dont ce
fork reprend le code.

- Smart Typography : © 2021-2022 mgmeyers.
- Modifications : © 2026 Matthieu Thomas (cidrolin). Portée par dossier et
  typographie française, ajoutées à partir du 24 août 2026 dans `main.ts`,
  `types.ts`, `inputRules.ts` et `manifest.json`.
- `frenchRules.ts`, écrit pour ce fork, est en outre disponible sous
  licence MIT (texte en tête du fichier) : vous pouvez le réutiliser
  ailleurs sous l'une ou l'autre licence.
