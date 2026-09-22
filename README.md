# Smart Typography FR

Par Matthieu Thomas (cidrolin), sur une idée de mgmeyers : ce plugin est un
fork de son [Smart Typography](https://github.com/mgmeyers/obsidian-smart-typography)
**1.0.18**, dont il reprend le code. L'historique amont est conservé : le
fork part du tag `1.0.18`, et le dépôt d'origine est déclaré comme remote
`upstream`.

## Installation

```powershell
npm install
.\deploy.ps1
```

`deploy.ps1` compile puis copie `main.js` et `manifest.json` dans
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

**Portée** — un interrupteur « Limiter à certains dossiers » + une liste,
un chemin par ligne, relatif à la racine du coffre, sous-dossiers compris,
casse respectée. Liste vide = plugin inactif partout.

**Typographie française** — désactivée par défaut. Une fois activée :

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
Deux-points, guillemets et pourcentages ont chacun leur interrupteur.

Une seule espace devant un groupe : `Oh !!` donne `Oh !!`, pas `Oh ! !`.

La ponctuation qui suit une balise fermante reçoit aussi son espace, placée
après la balise : `*mot*?` donne `*mot* ?`, de même après `**`, `` ` ``,
`~~`, `==` ou `</u>`. `”` et `›` comptent comme fin de mot.

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

- **Rien n'est appliqué au texte déjà écrit.** Ce sont des règles de saisie.
- Dataview : `champ:: valeur` reçoit une insécable sur le premier `:` et
  casse le champ. Désactivez l'option deux-points si vous en posez.
- URL sans schéma (`www.exemple.fr/x?y=1`) : le `?` reçoit une fine.
- La portée est lue via `editorInfoField` quand Obsidian l'expose, sinon
  via le fichier actif — un éditeur en survol non focalisé peut alors être
  jugé sur le chemin de la note de dessous.
- Une recherche sur `mot ;` avec une espace ordinaire ne trouvera plus rien.

## Compiler

`npm run build` produit `main.js`, que git ignore. TypeScript est remonté en
5.4 parce que les `.d.ts` de `@lezer/common` utilisent la syntaxe
`export { type X }`, que le TS 4.2 épinglé en amont ne comprend pas — il
compilait quand même, mais sans vérifier grand-chose.

`@codemirror/language` vient du registre npm et non plus du fork git de
l'amont, que npm 12 refuse d'installer. Le module reste externe au bundle :
c'est Obsidian qui le fournit. Deux avertissements de types subsistent
(`tokenClassNodeProp` n'existe que dans le CodeMirror d'Obsidian), sans
effet sur `main.js`.

## Le patch

`smart-typography-fr.patch` rassemble tout ce que le fork change dans le
code amont : les quatre fichiers touchés (`main.ts`, `types.ts`,
`inputRules.ts`, `manifest.json`) plus le nouveau `frenchRules.ts`. Il
s'applique sur un clone du tag `1.0.18` avec `git apply`, mais ne suffit
pas à compiler : il laisse de côté `package.json`, et un clone amont bute
sur npm 12 et TS 4.2. Pour compiler, partez de ce dépôt. Pour régénérer
le patch une fois les modifications commitées :

```bash
git diff 1.0.18 HEAD --output=smart-typography-fr.patch -- main.ts types.ts inputRules.ts manifest.json frenchRules.ts
```

Passez par `--output` plutôt que par une redirection `>` : PowerShell
réécrirait les fins de ligne, et les morceaux de `main.ts` et `manifest.json`
(en CRLF dans le dépôt amont) ne s'appliqueraient plus.

Le tag `1.0.18` vient du dépôt amont. Sur un nouveau clone, récupérez-le
d'abord :

```bash
git remote add upstream https://github.com/mgmeyers/obsidian-smart-typography
git fetch upstream --tags
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
