// Tests des fonctions pures (fixTypography.ts, frenchRules.ts, languages.ts), sans Obsidian :
// TypeScript, déjà présent, transpile les modules, dont les imports « nus »
// (baseUrl) sont réécrits en chemins relatifs.
import ts from "typescript";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "tests", ".tmp");
mkdirSync(out, { recursive: true });

for (const name of ["fixTypography", "frenchRules", "languages"]) {
	const source = readFileSync(path.join(root, `${name}.ts`), "utf8");
	const js = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
	}).outputText.replace(/from "(frenchRules|fixTypography|languages)"/g, 'from "./$1.mjs"');
	writeFileSync(path.join(out, `${name}.mjs`), js);
}

const { applyTypography, findFaultySigns, noteTypo, touchesCaret } = await import(pathToFileURL(path.join(out, "fixTypography.mjs")).href);
const { detectLanguage, defaultLangOptions } = await import(pathToFileURL(path.join(out, "languages.mjs")).href);
const { FINE, NBSP, THIN } = await import(pathToFileURL(path.join(out, "frenchRules.mjs")).href);

// Anciens interrupteurs français, traduits en réglages par langue.
const settings = (over = {}) => {
	const { frenchColon, frenchGuillemets, frenchPercent, langOptions, ending = false, ...rest } = over;
	const options = langOptions ?? defaultLangOptions();
	// Most cases are fragments without final punctuation: that rule is only on where tested.
	for (const lang of Object.keys(options)) options[lang].ending = ending;
	if (frenchColon !== undefined) options.fr.colon = frenchColon;
	if (frenchGuillemets !== undefined) options.fr.guillemets = options.fr.quotes = frenchGuillemets;
	if (frenchPercent !== undefined) options.fr.percent = frenchPercent;
	return {
		curlyQuotes: true,
		ellipsis: true,
		closeSingle: "’",
		frenchSpacing: true,
		langOptions: options,
		frNarrowSpace: FINE,
		frNbSpace: NBSP,
		...rest,
	};
};

const failures = [];
const show = (v) =>
	String(typeof v === "string" ? v : JSON.stringify(v)).replace(/\u202F/g, "⟦fine⟧").replace(/\u00A0/g, "⟦insec⟧").replace(/\u2009/g, "⟦thin⟧").replace(/\n/g, "⏎");
const check = (name, actual, expected) => {
	if (JSON.stringify(actual) === JSON.stringify(expected)) return console.log(`ok    ${name}`);
	failures.push(name);
	console.log(`FAIL  ${name}\n        attendu : ${show(expected)}\n        obtenu  : ${show(actual)}`);
};
const section = (t) => console.log(`\n--- ${t} ---`);

const lang = (code) => ({ forced: code, fallback: code });
const FR = lang("fr");
const typo = (input, expected, name, s = settings()) => check(name, applyTypography(input, s, FR), expected);
const unchanged = (input, name, s = settings()) => check(name, applyTypography(input, s, FR), input);

section("Correction");
typo("Bonjour ; ça va ?", `Bonjour${FINE}; ça va${FINE}?`, "fine insécable avant ; et ?");
typo("Sans espace;ici", `Sans espace${FINE}; ici`, "fine insérée même sans espace préalable, espace après");
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
unchanged("~~~\nif (a ; b) { x = \"y\" ; }\n~~~", "bloc de code à tildes");
unchanged("> ~~~\n> f(a , b) ; 'x'\n> ~~~", "bloc à tildes dans une citation");
typo("Avant ;\n~~~js\na ; b\n~~~\nAprès ;", `Avant${FINE};\n~~~js\na ; b\n~~~\nAprès${FINE};`, "texte autour d'un bloc à tildes corrigé");
typo("Voici :\n\n    f(a , b) ; x = 'y'\n\n\treturn 'z'\n\nFin ;", `Voici${NBSP}:\n\n    f(a , b) ; x = 'y'\n\n\treturn 'z'\n\nFin${FINE};`, "code indenté après une ligne vide, lignes vides comprises");
unchanged("    f(a , b) ; 'x'\nTexte", "code indenté en tête de note");
typo("- point\n\t- sous-point ; suite\n\n\tsuite du point , ici\n- item\n\n    suite de l'item ;",
	`- point\n\t- sous-point${FINE}; suite\n\n\tsuite du point, ici\n- item\n\n    suite de l’item${FINE};`, "indentation d'une liste : pas du code");
typo("Texte ;\n    suite ;", `Texte${FINE};\n    suite${FINE};`, "ligne indentée sans ligne vide avant : pas du code");
unchanged("[lien](https://x.fr/a?b=1)", "lien markdown");
unchanged("![[image.png]]", "image intégrée");
unchanged("voir ![[img.png]]", "pas de fine avant une intégration");
unchanged("[[Note#Section]]", "lien interne");
unchanged("$f(x) : y$", "formule en ligne");
unchanged("---\ntitre: Ma note\ntags: a\n---\n", "métadonnées en tête de sélection");
check("« --- » hors du début de la note : un séparateur, pas des métadonnées",
	applyTypography("---\nQuoi ?\n---\nEt ?", settings(), FR, false), `---\nQuoi${FINE}?\n---\nEt${FINE}?`);
check("repérage d'une tranche qui s'ouvre sur un séparateur « --- »",
	findFaultySigns("---\nQuoi ?\n---\nEt ?", settings(), FR, false).map(({ pos, reason }) => [pos, reason]), [[9, "nbsp"], [18, "nbsp"]]);
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
const once = applyTypography(sample, settings(), FR);
check("relancer la correction ne change plus rien", applyTypography(once, settings(), FR), once);
check("aucune ligne perdue", once.split("\n").length, sample.split("\n").length);

section("Repérage des espacements fautifs");
const signs = (text, expected, name, s = settings()) =>
	check(name, findFaultySigns(text, s, FR).map(({ pos, side }) => [pos, side]), expected);
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

section("Propriété smart-typo");
const note = (doc, expected, name, def = "fr") => {
	const { disabled, forced, fallback } = noteTypo(doc, def);
	check(name, { disabled, forced, fallback }, expected);
};
note("---\nsmart-typo: false\n---\nTexte", { disabled: true, forced: null, fallback: "fr" }, "smart-typo: false");
note("---\ntitre: x\nsmart-typo: False # non\n---\n", { disabled: true, forced: null, fallback: "fr" }, "casse et commentaire");
note("---\nsmart-typo: en\n---\nTexte", { disabled: false, forced: "en", fallback: "en" }, "langue imposée");
note('---\nsmart-typo: "de-DE"\n---\n', { disabled: false, forced: "de", fallback: "de" }, "code régional ramené à sa langue");
note("---\nautre-smart-typo: false\n---\n", { disabled: false, forced: null, fallback: "fr" }, "clé voisine ignorée");
note("---\ntitre: x\n---\nI don't know what to do with this, but it is fine.", { disabled: false, forced: null, fallback: "en" }, "langue détectée sur le corps");
note("Bonjour", { disabled: false, forced: null, fallback: "it" }, "texte trop court : langue par défaut", "it");

section("Détection de la langue");
const detect = (text, expected) => check(`${expected} : ${text}`, detectLanguage(text), expected);
detect("Il a dit qu'il viendrait demain, mais il n'est pas venu.", "fr");
detect("I don't know what to do with this.", "en");
detect("Ich weiß nicht, was ich tun soll.", "de");
detect("Я не знаю, что делать.", "ru");
detect("Bugün hava çok güzel ve ben mutluyum.", "tr");
detect("Non so cosa fare, ma è molto bello.", "it");
detect("¿Qué vas a hacer cuando llegue el verano?", "es");
detect("Bonjour", null);

section("Couche universelle");
const universal = (input, expected, name) => typo(input, expected, name);
universal("bla ( attire .", "bla (attire.", "espace après ( et avant .");
universal("un mot ) fin", "un mot) fin", "espace avant )");
universal("Salut , ça va", "Salut, ça va", "espace avant la virgule");
universal("mot,suite", "mot, suite", "virgule collée");
universal("3,5 et 12.5 et a.md", "3,5 et 12.5 et a.md", "décimales et extensions épargnées");
universal("Ah ... fin", "Ah … fin", "points de suspension épargnés");
universal("mot - mot", "mot – mot", "trait d'union entre espaces → tiret");
universal("- item\n| a | - |", "- item\n| a | - |", "puce et cellule de tableau épargnées");
universal("> - un\n> [!note] Titre\n> - [ ] tâche\n> > - imbriqué", "> - un\n> [!note] Titre\n> - [ ] tâche\n> > - imbriqué", "puces d'une citation ou d'un callout épargnées");
universal("> mot - mot", "> mot – mot", "trait d'union entre espaces dans une citation");
const uni = (text, expected, name, ctx = FR, s = settings()) =>
	check(name, findFaultySigns(text, s, ctx).map(({ pos, side, reason }) => [pos, side, reason]), expected);
uni("bla bla ( attire .", [[8, "after", "space"], [17, "before", "space"]], "repères sur ( et .");
uni("un mot ) fin", [[7, "before", "space"]], "repère sur )");
uni("mot,suite", [[3, "after", "space"]], "repère sur la virgule collée");
uni("voir.C’est", [[4, "after", "space"]], "repère sur le point collé");
universal("voir.C’est", "voir. C’est", "espace après un point collé");
universal("a.md et Node.JS et ASP.NET", "a.md et Node.JS et ASP.NET", "extensions et sigles épargnés");
uni("(bien) fait, ok.", [], "texte correct : rien");
uni("Il a dit \"non\" et l'a fait", [[9, "on", "quote"], [13, "on", "quote"], [19, "on", "quote"]], "guillemets et apostrophes droits");
uni("voir `a ( b` et https://x.fr/?q='1'", [], "code et URL protégés");
uni("`code` .", [], "espace collée à une portion protégée");
uni("mot - mot", [[4, "on", "dash"]], "repère sur le trait d'union");
uni("- item\n| a | - |", [], "puce et tableau sans repère");
uni("> - un\n> [!note] Titre\n> - [ ] tâche", [], "puces d'une citation ou d'un callout sans repère");
uni("> mot - mot", [[6, "on", "dash"]], "repère sur le trait d'union dans une citation");
uni("~~~\nprint('a' , b)\n~~~", [], "bloc à tildes sans repère");
uni("Texte.\n\n    print('a' , b)  \n", [], "code indenté sans repère");

section("Espaces doublées");
universal("Deux  espaces,   trois", "Deux espaces, trois", "espaces doublées réduites");
universal("Fin.  Début", "Fin. Début", "double espace après un point");
universal("| a  | b   |\n|----|-----|\n| c  | d   |", "| a  | b   |\n|----|-----|\n| c  | d   |", "tableau épargné");
universal("a  | b\n---|---\nc  | d", "a  | b\n---|---\nc  | d", "tableau sans bordure épargné");
universal("x  | y", "x | y", "barre isolée : pas un tableau");
universal("1.  item\n-  item\n- [ ]  tâche\n>  citation", "1.  item\n-  item\n- [ ]  tâche\n>  citation", "puces et citations alignées épargnées");
universal("    indenté\nfin de ligne  \nsuite", "    indenté\nfin de ligne  \nsuite", "indentation et saut de ligne Markdown épargnés");
universal("voir `a  b`  et", "voir `a  b`  et", "code et espace collée au code épargnés");
uni("Deux  espaces", [[5, "on", "double-space"]], "repère sur l'espace en trop");
uni("| a  | b |\n|---|---|", [], "tableau sans repère");
uni("mot  ;", [[5, "before", "nbsp"]], "devant la ponctuation, seule sa règle signale");

section("Cas de bord : parenthèse, apostrophe isolée, espaces de bord");
typo("enfin(frf) certaine ;l ’ obscurité. \n", `enfin (frf) certaine${FINE}; l’obscurité.\n`, "exemple complet corrigé");
unchanged("chat(s) et allié(es)", "marque du pluriel ou du féminin épargnée");
typo("a\n   \nb", "a\n\nb", "espaces seules sur une ligne vide");
typo("a\n \nb", "a\n\nb", "une seule espace sur une ligne vide");
typo("certaine ; l’ obscurité et l ’obscurité, dit 'oui' à", `certaine${FINE}; l’obscurité et l’obscurité, dit ’oui’ à`, "espace d'un seul côté de l'élision");
check("repérage de l'élision d'un seul côté", findFaultySigns("l’ o et l ’o", settings(), FR).map(({ pos, side }) => [pos, side]), [[1, "after"], [10, "before"]]);
unchanged("fin  \nsuite", "saut de ligne Markdown laissé");
typo("Fin.  \nsuite", "Fin.\nsuite", "plusieurs espaces après une fin de phrase");
unchanged("1. \n- \nx", "puces vides épargnées");
unchanged("```\n   \n```", "ligne d'espaces dans un bloc de code");
check("repérage de l'exemple complet",
	findFaultySigns("enfin(frf) certaine ;l ’ obscurité. \n", settings(), FR).map(({ pos, side, reason }) => [pos, side, reason]),
	[[5, "before", "space"], [20, "before", "nbsp"], [20, "after", "space"], [23, "before", "space"], [23, "after", "space"], [35, "on", "line-end"]]);
check("repérage d'une ligne d'espaces", findFaultySigns("a\n   \nb", settings(), FR).map(({ pos, reason }) => [pos, reason]), [[2, "blank-line"]]);

section("Faults against the caret, held back while typing");
const againstCaret = (text, caret) => findFaultySigns(text, settings(), FR, false).map(({ pos }) => touchesCaret(text, pos, caret));
check("space typed before an existing full stop", againstCaret("et tu .", 6), [true]);
check("comma and space typed before an existing full stop", againstCaret("et tu va, .", 10), [true]);
check("space typed before a closing guillemet, end of paragraph", againstCaret("« Et tu va, »\n\nSuite.", 12), [false, true]);
check("same fault further from the caret", againstCaret("et tu . Puis", 12), [false]);
check("sign before the caret, spaces between", [touchesCaret("va, ", 2, 4), touchesCaret("va,", 2, 3)], [true, true]);
check("a word between sign and caret", [touchesCaret("va, et", 2, 6), touchesCaret("tu .", 3, 0)], [false, false]);
check("not across a line break", touchesCaret("va,\n", 2, 4), false);

section("Final punctuation and trailing spaces");
const withEnding = settings({ ending: true });
const endings = (text, s = withEnding) => findFaultySigns(text, s, FR, false).map(({ pos, side, reason }) => [pos, side, reason]);
check("four unfinished paragraphs", endings("A\n\nA,\n\nA, \n\nA. \n"), [
	[0, "after", "no-ending"], [4, "on", "no-ending"], [8, "on", "no-ending"], [9, "on", "line-end"], [14, "on", "line-end"],
]);
check("accepted endings",
	endings(`Fin.\nOui${FINE}!\nEt…\nIl dit${NBSP}:\nJe voulais —\nPuis –\n«${FINE}Oui${FINE}»\n“Yes”\n*Fin.*\nFin.[^1]\n(Fin.)\n`), []);
check("semicolon on its sign, word after it", endings(`Il part${FINE};\nIl part`), [[8, "on", "no-ending"], [16, "after", "no-ending"]]);
check("not prose: left alone",
	endings("# Titre\n- item\n1. item\n> citation\n| a | b |\n|---|---|\n***\n#tag #autre\nclé:: valeur\n[[Lien]]\n![[image.png]]\n    code\n```\ncode\n```\n[^1]: note\n"), []);
check("line ending with a link or code: left alone", endings("Voir [[Note]]\nTaper `ls`\n"), []);
check("option off", endings("A\nB,\n", settings()), []);
check("Markdown line break kept, after a comma", endings("A,  \nB.\n").map(([, , reason]) => reason), ["no-ending"]);
typo("A, \nB.", "A,\nB.", "trailing space after a comma removed");
unchanged("A,  \nB.", "Markdown line break kept");
check("selection ending mid-line keeps its last space", applyTypography("Il dit ", settings(), FR, true, false), "Il dit ");
check("selection ending a line loses it", applyTypography("Il dit ", settings(), FR), "Il dit");

section("Règles par langue : correction");
const typoIn = (code, input, expected, name) => check(`${code} : ${name}`, applyTypography(input, settings(), lang(code)), expected);
typoIn("en", "Hello ! How are you ?", "Hello! How are you?", "pas d'espace avant ! ?");
typoIn("en", "Note : see ; here", "Note: see; here", "pas d'espace avant : ;");
typoIn("en", "Hi :) and | :--- |", "Hi :) and | :--- |", "émoticône et alignement de tableau épargnés");
typoIn("en", 'Say "hi", it\'s 50 %', "Say “hi”, it’s 50%", "guillemets anglais, apostrophe, 50%");
typoIn("de", 'Er sagte "Hallo".', "Er sagte „Hallo“.", "guillemets allemands");
typoIn("de", "Er sagte “Hallo”.", "Er sagte „Hallo“.", "guillemets anglais → allemands");
typoIn("de", "z.B. 50%", `z.${FINE}B. 50${NBSP}%`, "abréviation et pourcentage");
typoIn("ru", "« Привет » - сказал он ?", "«Привет» — сказал он?", "ёлочки serrées, tiret cadratin");
typoIn("ru", '"Привет"', "«Привет»", "guillemets droits → ёлочки");
typoIn("tr", "yüzde 50 % ve 12%", "yüzde %50 ve %12", "% avant le nombre");
typoIn("it", "E' vero, « ciao », 50 %", "È vero, «ciao», 50%", "È, caporali serrés, 50%");
typoIn("es", "¿ Qué ? 50%", `¿Qué? 50${NBSP}%`, "¿ serré, 50 %");
typoIn("es", '"hola"', "«hola»", "comillas latinas");
check("ligne à ligne : français puis anglais",
	applyTypography("Il a dit qu'il viendrait, mais il n'est pas venu ?\nI don't know what to do with this ?", settings(), { forced: null, fallback: "fr" }),
	`Il a dit qu’il viendrait, mais il n’est pas venu${FINE}?\nI don’t know what to do with this?`);

section("Réglages par langue");
const optionsWith = (code, over) => {
	const o = defaultLangOptions();
	Object.assign(o[code], over);
	return o;
};
check("langue coupée : rien n'est corrigé",
	applyTypography("Quoi ?", settings({ langOptions: optionsWith("fr", { enabled: false }) }), FR), "Quoi ?");
check("langue coupée : rien n'est signalé",
	findFaultySigns("Quoi ?", settings({ langOptions: optionsWith("fr", { enabled: false }) }), FR).length, 0);
check("une langue coupée n'affecte pas les autres",
	applyTypography("Hello !", settings({ langOptions: optionsWith("fr", { enabled: false }) }), lang("en")), "Hello!");
check("anglais : ponctuation coupée, deux-points gardé",
	applyTypography("Hi ! Note :", settings({ langOptions: optionsWith("en", { punctuation: false }) }), lang("en")), "Hi ! Note:");
check("anglais : deux-points coupé",
	findFaultySigns("Note :", settings({ langOptions: optionsWith("en", { colon: false }) }), lang("en")).length, 0);
check("général coupé : espaces doublées gardées",
	applyTypography("a  b ( c )", settings({ langOptions: optionsWith("fr", { general: false }) }), FR), "a  b ( c )");
check("guillemets français : espacement coupé, conversion gardée",
	applyTypography('« a » "b"', settings({ langOptions: optionsWith("fr", { guillemets: false }) }), FR), `« a » «${FINE}b${FINE}»`);
check("allemand : règles propres coupées",
	applyTypography("z.B.", settings({ langOptions: optionsWith("de", { special: false }) }), lang("de")), "z.B.");
check("tiret coupé",
	applyTypography("mot - mot", settings({ langOptions: optionsWith("fr", { dash: false }) }), FR), "mot - mot");
check("guillemets droits : conversion et repère coupés",
	findFaultySigns('dit "oui"', settings({ langOptions: optionsWith("fr", { quotes: false }) }), FR).length, 0);

section("Règles par langue : repérage");
const signsIn = (code, text, expected, name) => uni(text, expected, `${code} : ${name}`, lang(code));
signsIn("en", "Hello !", [[6, "before", "no-space"]], "espace avant !");
signsIn("en", "50 %", [[3, "before", "percent-none"]], "espace avant %");
signsIn("en", "Hi :) | :--- |", [], "émoticône et tableau épargnés");
signsIn("de", "Er sagte “Hallo”.", [[15, "on", "de-quote"]], "guillemet fermant anglais");
signsIn("de", "z.B. hier", [[1, "after", "de-abbr"]], "abréviation serrée");
signsIn("de", "50%", [[2, "before", "nbsp"]], "pourcentage collé");
signsIn("ru", "« Привет »", [[0, "after", "no-space"], [9, "before", "no-space"]], "espaces dans les ёлочки");
signsIn("tr", "yüzde 50%", [[8, "on", "percent-tr"]], "% après le nombre");
signsIn("it", "E' vero", [[0, "on", "it-e"], [1, "on", "quote"]], "E' pour È");
signsIn("es", "Qué pasa?", [[8, "on", "es-inverted"]], "¿ manquant");
signsIn("es", "¡Hola! ¿Qué tal? Sí.", [], "ouvrants présents");
check("repérage ligne à ligne",
	findFaultySigns("Il a dit qu’il viendrait, mais il n’est pas venu ?\nI don’t know what to do with this ?", settings(), { forced: null, fallback: "fr" }).map(({ reason, lang }) => [reason, lang]),
	[["nbsp", "fr"], ["no-space", "en"]]);

if (failures.length === 0) {
	console.log("\nTous les tests passent.");
} else {
	console.log(`\n${failures.length} échec(s) :\n  ${failures.join("\n  ")}`);
	process.exit(1);
}
