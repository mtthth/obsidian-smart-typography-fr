// Tests des fonctions pures (fixTypography.ts, frenchRules.ts), sans Obsidian :
// TypeScript, déjà présent, transpile les modules, dont les imports « nus »
// (baseUrl) sont réécrits en chemins relatifs.
import ts from "typescript";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "tests", ".tmp");
mkdirSync(out, { recursive: true });

for (const name of ["fixTypography", "frenchRules"]) {
	const source = readFileSync(path.join(root, `${name}.ts`), "utf8");
	const js = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
	}).outputText.replace(/from "(frenchRules|fixTypography)"/g, 'from "./$1.mjs"');
	writeFileSync(path.join(out, `${name}.mjs`), js);
}

const { applyFrenchTypography, findFaultySigns, frontmatterDisablesCheck } = await import(pathToFileURL(path.join(out, "fixTypography.mjs")).href);
const { FINE, NBSP, THIN } = await import(pathToFileURL(path.join(out, "frenchRules.mjs")).href);

const settings = (over = {}) => ({
	curlyQuotes: true,
	ellipsis: true,
	closeSingle: "’",
	frenchColon: true,
	frenchGuillemets: true,
	frenchPercent: true,
	frNarrowSpace: FINE,
	frNbSpace: NBSP,
	...over,
});

const failures = [];
const show = (v) =>
	String(typeof v === "string" ? v : JSON.stringify(v)).replace(/\u202F/g, "⟦fine⟧").replace(/\u00A0/g, "⟦insec⟧").replace(/\u2009/g, "⟦thin⟧").replace(/\n/g, "⏎");
const check = (name, actual, expected) => {
	if (JSON.stringify(actual) === JSON.stringify(expected)) return console.log(`ok    ${name}`);
	failures.push(name);
	console.log(`FAIL  ${name}\n        attendu : ${show(expected)}\n        obtenu  : ${show(actual)}`);
};
const section = (t) => console.log(`\n--- ${t} ---`);

const typo = (input, expected, name, s = settings()) => check(name, applyFrenchTypography(input, s), expected);
const unchanged = (input, name, s = settings()) => check(name, applyFrenchTypography(input, s), input);

section("Correction");
typo("Bonjour ; ça va ?", `Bonjour${FINE}; ça va${FINE}?`, "fine insécable avant ; et ?");
typo("Sans espace;ici", `Sans espace${FINE};ici`, "fine insérée même sans espace préalable");
typo("Quoi ?!", `Quoi${FINE}?!`, "une suite ?! ne reçoit qu'une fine");
typo("Attention : ici", `Attention${NBSP}: ici`, "insécable avant le deux-points");
typo("**Note :**", `**Note${NBSP}:**`, "deux-points suivi d'un marqueur d'emphase");
typo('Il a dit "bonjour"', `Il a dit «${FINE}bonjour${FINE}»`, "guillemets droits appariés → français");
typo("« citation »", `«${FINE}citation${FINE}»`, "espaces fines dans les guillemets français");
typo("l'été", "l’été", "apostrophe typographique");
typo("Ah...", "Ah…", "points de suspension");
typo("mot , suite", "mot, suite", "espace parasite avant la virgule");
typo("50 %", `50${NBSP}%`, "insécable avant le pourcentage");
typo("50 % %% note %%", `50${NBSP}% %% note %%`, "un pourcentage voisin d'un commentaire est corrigé");
typo(`texte ${NBSP}: suite`, `texte${NBSP}: suite`, "espace ordinaire doublant une insécable");
typo(`Quoi ${FINE}?`, `Quoi${FINE}?`, "espace ordinaire doublant une fine");
typo(`« ${FINE}texte${FINE} »`, `«${FINE}texte${FINE}»`, "espaces ordinaires doublant les fines des guillemets");
typo("Quoi ?", `Quoi${THIN}?`, "fine sécable choisie dans les réglages", settings({ frNarrowSpace: THIN }));
typo("Attention : 50 %", `Attention : 50 %`, "colonne et pourcentage désactivés", settings({ frenchColon: false, frenchPercent: false }));
typo('"a"', '"a"', "guillemets droits laissés si l'option guillemets est coupée", settings({ frenchGuillemets: false }));
typo("l'été...", "l'été...", "apostrophe et points de suspension coupés", settings({ curlyQuotes: false, ellipsis: false }));

section("Correction : ce qui doit rester intact");
unchanged("Rendez-vous à 12:30", "heure");
unchanged("clé:: valeur", "champ Dataview");
unchanged("C:\\Users\\moi", "chemin Windows");
unchanged("Bonjour :)", "émoticône");
unchanged("Voir https://exemple.fr/?a=1&b=2;c=3", "URL avec ? ; et =");
unchanged("www.exemple.fr/?x=1", "URL sans schéma");
unchanged("Du `code ; ici` et voilà", "code en ligne");
unchanged("```\nlet x = 1; // ok ?\n```", "bloc de code");
unchanged("[lien](https://x.fr/a?b=1)", "lien markdown");
unchanged("![[image.png]]", "image intégrée");
unchanged("voir ![[img.png]]", "pas de fine avant une intégration");
unchanged("[[Note#Section]]", "lien interne");
unchanged("$f(x) : y$", "formule en ligne");
unchanged("---\ntitre: Ma note\ntags: a\n---\n", "métadonnées en tête de sélection");
unchanged('Il mesure 5" de haut', "guillemet droit non apparié");
unchanged("mot\n? question", "aucune fusion de lignes");
unchanged('<span title="a ; b">x</span>', "balise HTML");
unchanged("> [!NOTE] Attention", "marqueur de callout");
unchanged("> [!WARNING]- Repliable", "callout repliable");
unchanged("Un&nbsp;espace, une&#39;apostrophe", "entités HTML");
unchanged("[ref]: https://exemple.fr", "définition de référence");
unchanged("[^1]: Une note", "définition de note de bas de page");
unchanged("Total 50 %% à revoir %%", "espace avant l'ouvrant d'un commentaire");
unchanged("%% relire p. 12 %%", "espace avant le fermant d'un commentaire");
unchanged("Texte %% Attention: ici %%suite", "commentaire Obsidian");
unchanged("Avant %%\ncommentaire ; sur plusieurs lignes\n%% après", "commentaire sur plusieurs lignes");
typo("[^1]: Une note ; suite", `[^1]: Une note${FINE}; suite`, "le texte d'une note reste corrigé");
typo("Voir [ceci]: cela", `Voir [ceci]${NBSP}: cela`, "hors début de ligne, ce n'est pas une définition");

section("Correction : idempotence et intégrité");
const sample = "Il a dit \"bonjour\" ; puis : \"quoi ?\"... l'ami, à 12:30 sur https://x.fr/?a=1\nEt `du code ;` fin !";
const once = applyFrenchTypography(sample, settings());
check("relancer la correction ne change plus rien", applyFrenchTypography(once, settings()), once);
check("aucune ligne perdue", once.split("\n").length, sample.split("\n").length);

section("Repérage des espacements fautifs");
const signs = (text, expected, name, s = settings()) => check(name, findFaultySigns(text, s), expected);
signs("Bonjour !", [[8, "before"]], "espace ordinaire devant !");
signs("Bonjour!", [[7, "before"]], "espace absente devant !");
signs(`Bonjour${FINE}!`, [], "fine présente : rien");
signs(`Bonjour ${FINE}!`, [[9, "before"]], "espace ordinaire doublant une fine");
signs("Attention : ici", [[10, "before"]], "espace ordinaire devant :");
signs("Rendez-vous à 12:30", [], "12:30 épargné");
signs("clé:: valeur", [], "champ Dataview épargné");
signs("50 %", [[3, "before"]], "espace ordinaire devant %");
signs("50 %% x %%", [], "%% n'est pas un pourcentage");
signs("« mot »", [[0, "after"], [6, "before"]], "un côté par guillemet");
signs("«mot»", [[0, "after"], [4, "before"]], "guillemets nus");
signs("Quoi ?!", [[5, "before"]], "une suite ?! ne signale que le premier signe");
signs("Du `code;ici` et voilà", [], "code protégé");
signs("voir ![[a.png]]", [], "intégration épargnée");
signs("Attention : 50 %", [], "deux-points et pourcentage coupés : plus rien à signaler", settings({ frenchColon: false, frenchPercent: false, frenchGuillemets: false }));
signs("Attention : « x »", [[10, "before"]], "seul le deux-points reste signalé quand les guillemets sont coupés", settings({ frenchGuillemets: false, frenchPercent: false }));

section("Propriété typo-fr");
const off = (fm, expected, name) => check(name, frontmatterDisablesCheck(fm), expected);
off("---\ntypo-fr: false\n---", true, "typo-fr: false");
off("---\ntitre: x\ntypo-fr: False # non\n---", true, "casse et commentaire");
off("---\ntypo-fr: true\n---", false, "typo-fr: true");
off("---\ntitre: x\n---", false, "propriété absente");
off("---\nautre-typo-fr: false\n---", false, "clé voisine ignorée");

if (failures.length === 0) {
	console.log("\nTous les tests passent.");
} else {
	console.log(`\n${failures.length} échec(s) :\n  ${failures.join("\n  ")}`);
	process.exit(1);
}
