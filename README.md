# Smart Typography FR

Fork de `mgmeyers/obsidian-smart-typography` **1.0.18**, compilé avec les
sources amont d'origine (rollup + TypeScript 5.4).

## Installation

Créez `VOTRE_COFFRE/.obsidian/plugins/smart-typography-fr/` et copiez-y :

- `main.js`
- `manifest.json`

Puis Réglages → Plugins communautaires → Recharger les plugins → activer
« Smart Typography FR ».

Le dossier et l'`id` du manifest diffèrent de l'original : le vérificateur
de mise à jour d'Obsidian ne rattachera jamais cette copie au dépôt amont.
Si vous aviez déjà le plugin d'origine, désactivez-le pour éviter que les
deux jeux de règles se marchent dessus.

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

## Garde-fous intégrés

- Aucune fine à l'intérieur d'une URL (`http://a.fr/b?c=1` reste intact),
  détecté sur une fenêtre de 96 caractères en amont.
- Aucune insécable après un schéma d'URI (`https:`, `mailto:`, `obsidian:`…).
- `12:30` épargné : les chiffres sont hors de la classe déclenchante.
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

## Reconstruire

```bash
git clone --depth 1 https://github.com/mgmeyers/obsidian-smart-typography
cd obsidian-smart-typography
npm install && npm install -D typescript@5.4.5
git apply ../smart-typography-fr.patch
npm run build
```

`smart-typography-fr.patch` contient les quatre fichiers touchés
(`main.ts`, `types.ts`, `inputRules.ts`, `manifest.json`) plus le nouveau
`frenchRules.ts`. TypeScript est remonté en 5.4 parce que les `.d.ts` de
`@lezer/common` utilisent la syntaxe `export { type X }`, que le TS 4.2
épinglé en amont ne comprend pas — il compilait quand même, mais sans
vérifier grand-chose.
