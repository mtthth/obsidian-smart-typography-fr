import {
  App,
  Editor,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SuggestModal,
  TFile,
} from "obsidian";
import * as obsidianApi from "obsidian";
import {
  ChangeSpec,
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
  TransactionSpec,
} from "@codemirror/state";
import {
  InputRule,
  arrowRules,
  comparisonRules,
  dashRules,
  dashRulesSansEnDash,
  ellipsisRules,
  fractionRules,
  guillemetRules,
  smartQuoteRules,
} from "inputRules";
import {
  FINE,
  NBSP,
  THIN,
  frenchAngleGuillemetRules,
  frenchColonRules,
  frenchGuardRules,
  frenchGuillemetRules,
  frenchPercentRules,
  frenchStopRules,
} from "frenchRules";
import {
  LegacyInputRule,
  legacyArrowRules,
  legacyComparisonRules,
  legacyDashRules,
  legacyEllipsisRules,
  legacyGuillemetRules,
  legacySmartQuoteRules,
} from "legacyInputRules";
import { Extension } from "@codemirror/state";
import { TYPO_KEY, applyTypography, noteTypo } from "fixTypography";
import { createSpacingMarkerPlugin, noteTypoOf } from "spacingMarkers";
import {
  LANGS,
  Lang,
  LANG_OPTION_KEYS,
  defaultLangOptions,
  detectLanguage,
  parseTypoSetting,
} from "languages";
import {
  UI_LANGS,
  UI_LANG_NAMES,
  UiLang,
  UiStrings,
  capitalize,
  isUiLang,
  uiStrings,
} from "i18n";
import { syntaxTree } from "@codemirror/language";
import * as cmLanguage from "@codemirror/language";

import { SmartTypographySettings } from "types";
import { Tree } from "@lezer/common";

const DEFAULT_SETTINGS: SmartTypographySettings = {
  uiLanguage: "en",

  curlyQuotes: true,
  emDash: true,
  ellipsis: true,
  arrows: true,
  comparisons: true,
  fractions: false,
  guillemets: false,
  skipEnDash: false,

  openSingle: "‘",
  closeSingle: "’",

  openDouble: "“",
  closeDouble: "”",

  openGuillemet: "«",
  closeGuillemet: "»",

  leftArrow: "←",
  rightArrow: "→",

  limitToFolders: false,
  includedFolders: [],

  frenchSpacing: false,
  langOptions: defaultLangOptions(),
  flagWrongSpaces: true,
  defaultLanguage: "fr",
  frNarrowSpace: FINE,
  frNbSpace: NBSP,
};

export default class SmartTypography extends Plugin {
  settings: SmartTypographySettings;
  inputRules: InputRule[];
  inputRuleMap: Record<string, InputRule[]>;

  legacyInputRules: LegacyInputRule[];
  legacyLastUpdate: WeakMap<CodeMirror.Editor, LegacyInputRule>;
  scopeFolders: string[] = [];
  // Règles de saisie françaises : elles ne jouent que sur une ligne reconnue
  // comme française.
  frenchInputRules = new Set<InputRule>();
  // Tableau relu par Obsidian pour chaque éditeur : le modifier puis appeler
  // updateOptions() reconfigure les éditeurs ouverts sans recharger le plugin.
  private markerExtensions: Extension[] = [];

  // Interface strings, read on each use so that a language change applies at
  // once (command names excepted: Obsidian reads them only at load).
  get t(): UiStrings {
    return uiStrings(this.settings.uiLanguage);
  }

  buildInputRules() {
    this.legacyInputRules = [];
    this.inputRules = [];
    this.inputRuleMap = {};
    this.frenchInputRules = new Set([
      ...frenchStopRules,
      ...frenchGuillemetRules,
      ...frenchAngleGuillemetRules,
      ...frenchColonRules,
      ...frenchPercentRules,
    ]);

    // --- Typographie francaise -------------------------------------------
    // En tete : les regles << / >> francaises doivent primer sur
    // guillemetRules, qui partagent les memes declencheurs.
    if (this.settings.frenchSpacing) {
      const fr = this.settings.langOptions.fr;
      this.inputRules.push(...frenchGuardRules);
      if (fr.punctuation) this.inputRules.push(...frenchStopRules);

      if (fr.guillemets) {
        this.inputRules.push(...frenchGuillemetRules);
        if (this.settings.guillemets) {
          this.inputRules.push(...frenchAngleGuillemetRules);
        }
      }
      if (fr.colon) {
        this.inputRules.push(...frenchColonRules);
      }
      if (fr.percent) {
        this.inputRules.push(...frenchPercentRules);
      }
    }

    if (this.settings.emDash) {
      if (this.settings.skipEnDash) {
        this.inputRules.push(...dashRulesSansEnDash);
      } else {
        this.inputRules.push(...dashRules);
      }

      this.legacyInputRules.push(...legacyDashRules);
    }

    if (this.settings.ellipsis) {
      this.inputRules.push(...ellipsisRules);
      this.legacyInputRules.push(...legacyEllipsisRules);
    }

    if (this.settings.curlyQuotes) {
      this.inputRules.push(...smartQuoteRules);
      this.legacyInputRules.push(...legacySmartQuoteRules);
    }

    if (this.settings.arrows) {
      this.inputRules.push(...arrowRules);
      this.legacyInputRules.push(...legacyArrowRules);
    }

    if (this.settings.guillemets) {
      this.inputRules.push(...guillemetRules);
      this.legacyInputRules.push(...legacyGuillemetRules);
    }

    if (this.settings.comparisons) {
      this.inputRules.push(...comparisonRules);
      this.legacyInputRules.push(...legacyComparisonRules);
    }

    if (this.settings.fractions) {
      this.inputRules.push(...fractionRules);
    }

    this.scopeFolders = (this.settings.includedFolders || [])
      .map((f) => f.trim().replace(/^\/+|\/+$/g, ""))
      .filter((f) => f.length > 0);

    this.inputRules.forEach((rule) => {
      if (this.inputRuleMap[rule.trigger] === undefined) {
        this.inputRuleMap[rule.trigger] = [];
      }

      this.inputRuleMap[rule.trigger].push(rule);
    });
  }

  // --- Portee par dossier ------------------------------------------------

  isPathInScope(path?: string | null): boolean {
    if (!this.settings.limitToFolders) return true;
    if (!path || this.scopeFolders.length === 0) return false;
    return this.scopeFolders.some(
      (f) => path === f || path.startsWith(f + "/")
    );
  }

  // editorInfoField n'existe que sur les versions recentes d'Obsidian ;
  // on retombe sinon sur le fichier actif.
  currentFilePath(state?: any): string | null {
    const field = (obsidianApi as any).editorInfoField;
    if (field && state) {
      const info = state.field(field, false);
      if (info && info.file) return info.file.path;
    }
    const active = this.app.workspace.getActiveFile();
    return active ? active.path : null;
  }

  // Réglage de la note : langue imposée, false (non vérifiée) ou null.
  noteSetting(file: TFile): Lang | false | null {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    return parseTypoSetting(fm?.[TYPO_KEY]);
  }

  // Pose ou retire la propriété `smart-typo` (le bloc YAML est créé au
  // besoin) ; la note modifiée recalcule d'elle-même ses repères.
  async setNoteSetting(file: TFile, value: Lang | false | null) {
    await (this.app.fileManager as any).processFrontMatter(file, (fm: any) => {
      if (value === null) delete fm[TYPO_KEY];
      else fm[TYPO_KEY] = value;
    });
  }

  chooseNoteSetting(file: TFile) {
    new TypoSettingModal(this.app, this.t, this.noteSetting(file), (value) =>
      this.setNoteSetting(file, value)
    ).open();
  }

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new SmartTypographySettingTab(this.app, this));

    this.registerEditorExtension(this.markerExtensions);
    this.applyMarkers();

    this.addCommand({
      id: "fix-typography-in-selection",
      name: this.t.fixSelection,
      editorCallback: (editor: Editor) => this.fixTypography(editor),
    });

    this.addCommand({
      id: "choose-note-typography",
      name: this.t.noteLanguage,
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) this.chooseNoteSetting(file);
        return true;
      },
    });

    // Clic droit : l'entrée de correction n'apparaît que s'il y a une sélection.
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, info) => {
        const t = this.t;
        if (editor.somethingSelected()) {
          menu.addItem((item) =>
            item
              .setTitle(t.fixSelection)
              .setIcon("text-cursor-input")
              .onClick(() => this.fixTypography(editor))
          );
        }

        const file = (info as any)?.file;
        if (!file || file.extension !== "md") return;
        const current = this.noteSetting(file);
        const label =
          current === false
            ? t.noteNotChecked
            : current
            ? t.langNames[current]
            : t.noteAutomatic;
        menu.addItem((item) =>
          item
            .setTitle(`${t.noteLanguage} (${label})…`)
            .setIcon("languages")
            .onClick(() => this.chooseNoteSetting(file))
        );
      })
    );

    // Codemirror 6
    //
    // When smart typography overrides changes, we want to keep a record
    // so we can undo them when the user presses backspace
    const storeTransaction = StateEffect.define<TransactionSpec>();
    const prevTransactionState = StateField.define<TransactionSpec | null>({
      create() {
        return null;
      },
      update(oldVal, tr) {
        for (let e of tr.effects) {
          if (e.is(storeTransaction)) {
            return e.value;
          }
        }

        if (
          !oldVal ||
          tr.isUserEvent("input") ||
          tr.isUserEvent("delete.forward") ||
          tr.isUserEvent("delete.cut") ||
          tr.isUserEvent("move") ||
          tr.isUserEvent("select") ||
          tr.isUserEvent("undo")
        ) {
          return null;
        }

        return oldVal;
      },
    });

    this.registerEditorExtension([
      prevTransactionState,
      EditorState.transactionFilter.of((tr) => {
        // Hors des dossiers selectionnes : on ne touche a rien
        if (!this.isPathInScope(this.currentFilePath(tr.startState))) {
          return tr;
        }

        // Revert any stored changes on delete
        if (
          tr.isUserEvent("delete.backward") ||
          tr.isUserEvent("delete.selection")
        ) {
          return tr.startState.field(prevTransactionState, false) || tr;
        }

        // If the user hasn't typed, or the doc hasn't changed, return early
        if (!tr.isUserEvent("input.type") || !tr.docChanged) {
          return tr;
        }

        // Cache the syntax tree if we end up accessing it
        let tree: Tree = null;

        // Memoize any positions we check so we can avoid some work
        const seenPositions: Record<number, boolean> = {};

        const canPerformReplacement = (pos: number) => {
          if (seenPositions[pos] !== undefined) {
            return seenPositions[pos];
          }

          if (!tree) tree = syntaxTree(tr.state);

          const nodeProps = tree
            .resolveInner(pos, 1)
            .type.prop((cmLanguage as any).tokenClassNodeProp);

          if (nodeProps && ignoreListRegEx.test(nodeProps as string)) {
            seenPositions[pos] = false;
          } else {
            seenPositions[pos] = true;
          }

          return seenPositions[pos];
        };

        // Store a list of changes and specs to revert these changes
        const changes: ChangeSpec[] = [];
        const reverts: ChangeSpec[] = [];

        const registerChange = (change: ChangeSpec, revert: ChangeSpec) => {
          changes.push(change);
          reverts.push(revert);
        };

        const contextCache: Record<string, string> = {};
        let newSelection = tr.selection;

        // Langue de la ligne où l'on tape, calculée seulement si une règle
        // française est en jeu.
        let note: ReturnType<typeof noteTypoOf> | null = null;
        const languageAt = (pos: number): Lang => {
          if (!note) {
            note = noteTypoOf(tr.startState, this.settings.defaultLanguage);
          }
          if (note.forced) return note.forced;
          const line = tr.startState.doc.lineAt(pos).text;
          return detectLanguage(line) ?? note.fallback;
        };

        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          const insertedText = inserted.sliceString(0, 0 + inserted.length);
          const matchedRules = this.inputRuleMap[insertedText];

          if (!matchedRules) {
            return;
          }

          for (let rule of matchedRules) {
            // If we're in a codeblock, etc, return early, no need to continue checking
            if (!canPerformReplacement(fromA)) return;

            if (
              this.frenchInputRules.has(rule) &&
              (languageAt(fromA) !== "fr" || !this.settings.langOptions.fr.enabled)
            ) {
              continue;
            }

            // Fenetre de contexte en amont du caractere insere.
            // 3 caracteres par defaut, plus si la regle le demande.
            const ctxLen = rule.contextLength ?? 3;
            const ctxKey = fromA + ":" + ctxLen;

            if (contextCache[ctxKey] === undefined) {
              contextCache[ctxKey] = tr.newDoc.sliceString(
                Math.max(0, fromB - ctxLen),
                fromB
              );
            }

            const context = contextCache[ctxKey];

            if (!rule.contextMatch.test(context)) {
              continue;
            }

            if (rule.contextExclude && rule.contextExclude.test(context)) {
              continue;
            }

            const insert =
              typeof rule.to === "string" ? rule.to : rule.to(this.settings);
            const replacementLength = rule.from.length - rule.trigger.length;
            const insertionPoint = fromA - replacementLength;
            const reversionPoint = fromB - replacementLength;
            // Le retour arrière rétablit le texte réellement remplacé, et non
            // rule.from : les garde-fous français y écrivent une fine U+202F,
            // alors que l'espace en place suit le réglage (U+00A0, U+2009…).
            const original =
              tr.startState.doc.sliceString(insertionPoint, fromA) + insertedText;

            registerChange(
              {
                from: insertionPoint,
                to: insertionPoint + replacementLength,
                insert,
              },
              {
                from: reversionPoint,
                to: reversionPoint + insert.length,
                insert: original,
              }
            );

            const selectionAdjustment = rule.from.length - insert.length;

            newSelection = EditorSelection.create(
              newSelection.ranges.map((r) =>
                EditorSelection.range(
                  r.anchor - selectionAdjustment,
                  r.head - selectionAdjustment
                )
              )
            );

            return;
          }
        }, false);

        // If we have any changes, construct a transaction spec
        if (changes.length) {
          return [
            {
              effects: storeTransaction.of({
                effects: storeTransaction.of(null),
                selection: tr.selection,
                scrollIntoView: tr.scrollIntoView,
                changes: reverts,
              }),
              selection: newSelection,
              scrollIntoView: tr.scrollIntoView,
              changes,
            },
          ];
        }

        return tr;
      }),
    ]);

    // Codemirror 5
    this.legacyLastUpdate = new WeakMap();
    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      cm.on("beforeChange", this.beforeChangeHandler);
    });
  }

  onunload() {
    this.legacyLastUpdate = null;
    this.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("beforeChange", this.beforeChangeHandler);
    });
  }

  beforeChangeHandler = (
    instance: CodeMirror.Editor,
    delta: CodeMirror.EditorChangeCancellable
  ) => {
    if (!this.isPathInScope(this.currentFilePath())) return;

    if (this.legacyLastUpdate.has(instance) && delta.origin === "+delete") {
      const revert = this.legacyLastUpdate.get(instance).performRevert;

      if (revert) {
        revert(instance, delta, this.settings);
        this.legacyLastUpdate.delete(instance);
      }
      return;
    }

    if (delta.origin === undefined && delta.text.length === 1) {
      const input = delta.text[0];

      for (let rule of this.legacyInputRules) {
        if (!(rule.matchTrigger instanceof RegExp)) {
          continue;
        }

        if (rule.matchTrigger.test(input)) {
          rule.performUpdate(instance, delta, this.settings);
          return;
        }
      }

      return;
    }

    if (delta.origin === "+input" && delta.text.length === 1) {
      const input = delta.text[0];
      const rules = this.legacyInputRules.filter((r) => {
        return typeof r.matchTrigger === "string" && r.matchTrigger === input;
      });

      if (rules.length === 0) {
        if (this.legacyLastUpdate.has(instance)) {
          this.legacyLastUpdate.delete(instance);
        }
        return;
      }

      let str = input;

      if (delta.to.ch > 0) {
        str = `${instance.getRange(
          { line: delta.to.line, ch: 0 },
          delta.to
        )}${str}`;
      }

      for (let rule of rules) {
        if (rule.matchRegExp && rule.matchRegExp.test(str)) {
          if (
            shouldCheckTextAtPos(instance, delta.from) &&
            shouldCheckTextAtPos(instance, delta.to)
          ) {
            this.legacyLastUpdate.set(instance, rule);
            rule.performUpdate(instance, delta, this.settings);
          }
          return;
        }
      }
    }

    if (this.legacyLastUpdate.has(instance)) {
      this.legacyLastUpdate.delete(instance);
    }
  };

  async loadSettings() {
    const data = (await this.loadData()) ?? {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

    // Réglages par langue : complétés langue par langue, pour qu'une famille de
    // règles ajoutée plus tard prenne sa valeur par défaut.
    const saved = data.langOptions ?? {};
    this.settings.langOptions = defaultLangOptions();
    for (const lang of LANGS) {
      Object.assign(this.settings.langOptions[lang], saved[lang]);
    }
    // Anciens interrupteurs français, devenus des réglages de la langue fr.
    const fr = this.settings.langOptions.fr;
    if (saved.fr === undefined) {
      if (typeof data.frenchColon === "boolean") fr.colon = data.frenchColon;
      if (typeof data.frenchPercent === "boolean") fr.percent = data.frenchPercent;
      if (typeof data.frenchGuillemets === "boolean") {
        fr.guillemets = fr.quotes = data.frenchGuillemets;
      }
    }
    if (!isUiLang(this.settings.uiLanguage)) this.settings.uiLanguage = "en";
    const legacy = this.settings as unknown as Record<string, unknown>;
    delete legacy.frenchColon;
    delete legacy.frenchPercent;
    delete legacy.frenchGuillemets;
    this.buildInputRules();
  }

  // Correction d'un texte déjà écrit, selon les réglages du plugin. Commande
  // explicite : elle ne dépend pas de la portée par dossier.
  fixTypography(editor: Editor) {
    if (!editor.somethingSelected()) {
      new Notice(this.t.selectFirst);
      return;
    }

    const selection = editor.getSelection();
    const from = editor.getCursor("from");
    const note = noteTypo(editor.getValue(), this.settings.defaultLanguage);
    // Les métadonnées ne peuvent ouvrir la sélection que si elle part du tout
    // début de la note : ailleurs, « --- » est un séparateur.
    const atDocStart = from.line === 0 && from.ch === 0;
    const corrected = applyTypography(selection, this.settings, note, atDocStart);
    if (corrected === selection) {
      new Notice(this.t.nothingToFix);
      return;
    }

    // Un seul replaceSelection : la correction s'annule d'un seul Ctrl+Z. La
    // sélection est rétablie ensuite, la plupart des corrections étant des
    // espaces invisibles.
    editor.replaceSelection(corrected);
    editor.setSelection(from, editor.getCursor());
    new Notice(this.t.fixed);
  }

  // Le repère n'a de sens que si les règles françaises sont actives.
  applyMarkers() {
    this.markerExtensions.length = 0;
    if (this.settings.flagWrongSpaces) {
      this.markerExtensions.push(
        createSpacingMarkerPlugin(
          () => this.settings,
          (state) => this.isPathInScope(this.currentFilePath(state))
        )
      );
    }
    this.app.workspace.updateOptions();
  }

  async saveSettings() {
    this.buildInputRules();
    await this.saveData(this.settings);
    // Un plugin neuf à chaque changement de réglage : c'est ce qui force
    // CodeMirror à reconstruire les décorations des éditeurs ouverts.
    this.applyMarkers();
  }
}

class SmartTypographySettingTab extends PluginSettingTab {
  plugin: SmartTypography;

  constructor(app: App, plugin: SmartTypography) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // Langue dont les réglages sont affichés.
  shownLang: Lang = "fr";

  displayLanguage(containerEl: HTMLElement, lang: Lang) {
    const t = this.plugin.t;
    const options = this.plugin.settings.langOptions[lang];
    const check = t.checkLanguage(lang);

    new Setting(containerEl)
      .setName(check.name)
      .setDesc(check.desc)
      .addToggle((toggle) => {
        toggle.setValue(options.enabled).onChange(async (value) => {
          options.enabled = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (!options.enabled) return;

    if (lang === "fr") {
      new Setting(containerEl)
        .setName(t.frenchSpacing.name)
        .setDesc(t.frenchSpacing.desc)
        .addToggle((toggle) => {
          toggle
            .setValue(this.plugin.settings.frenchSpacing)
            .onChange(async (value) => {
              this.plugin.settings.frenchSpacing = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName(t.narrowSpace.name)
        .setDesc(t.narrowSpace.desc)
        .addDropdown((dd) => {
          dd.addOption(FINE, t.narrowSpaceFine)
            .addOption(NBSP, t.narrowSpaceNbsp)
            .addOption(THIN, t.narrowSpaceThin)
            .setValue(this.plugin.settings.frNarrowSpace)
            .onChange(async (value) => {
              this.plugin.settings.frNarrowSpace = value;
              await this.plugin.saveSettings();
            });
        });
    }

    for (const key of LANG_OPTION_KEYS[lang]) {
      const { name, desc } = t.option(lang, key);
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addToggle((toggle) => {
          toggle.setValue(options[key]).onChange(async (value) => {
            options[key] = value;
            await this.plugin.saveSettings();
          });
        });
    }
  }

  display(): void {
    let { containerEl } = this;
    const t = this.plugin.t;

    containerEl.empty();

    new Setting(containerEl)
      .setName(t.uiLanguage.name)
      .setDesc(t.uiLanguage.desc)
      .addDropdown((dd) => {
        for (const lang of UI_LANGS) dd.addOption(lang, UI_LANG_NAMES[lang]);
        dd.setValue(this.plugin.settings.uiLanguage).onChange(async (value) => {
          this.plugin.settings.uiLanguage = value as UiLang;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl).setName(t.scopeHeading).setHeading();

    new Setting(containerEl)
      .setName(t.limitToFolders.name)
      .setDesc(t.limitToFolders.desc)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.limitToFolders)
          .onChange(async (value) => {
            this.plugin.settings.limitToFolders = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (this.plugin.settings.limitToFolders) {
      new Setting(containerEl)
        .setName(t.includedFolders.name)
        .setDesc(t.includedFolders.desc)
        .addTextArea((ta) => {
          ta.setPlaceholder(t.includedFoldersPlaceholder)
            .setValue(this.plugin.settings.includedFolders.join("\n"))
            .onChange(async (value) => {
              this.plugin.settings.includedFolders = value
                .split("\n")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              await this.plugin.saveSettings();
            });
          ta.inputEl.rows = 6;
          ta.inputEl.style.width = "100%";
        });
    }

    new Setting(containerEl).setName(t.languagesHeading).setHeading();

    new Setting(containerEl)
      .setName(t.defaultLanguage.name)
      .setDesc(t.defaultLanguage.desc)
      .addDropdown((dd) => {
        for (const lang of LANGS) dd.addOption(lang, capitalize(t.langNames[lang]));
        dd.setValue(this.plugin.settings.defaultLanguage).onChange(
          async (value) => {
            this.plugin.settings.defaultLanguage = value as Lang;
            await this.plugin.saveSettings();
          }
        );
      });

    new Setting(containerEl)
      .setName(t.flagWrongSpaces.name)
      .setDesc(t.flagWrongSpaces.desc)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.flagWrongSpaces)
          .onChange(async (value) => {
            this.plugin.settings.flagWrongSpaces = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.perLanguageHeading)
      .setHeading();

    new Setting(containerEl)
      .setName(t.shownLanguage.name)
      .setDesc(t.shownLanguage.desc)
      .addDropdown((dd) => {
        for (const lang of LANGS) dd.addOption(lang, capitalize(t.langNames[lang]));
        dd.setValue(this.shownLang).onChange((value) => {
          this.shownLang = value as Lang;
          this.display();
        });
      });

    this.displayLanguage(containerEl, this.shownLang);

    new Setting(containerEl)
      .setName(t.curlyQuotes.name)
      .setDesc(t.curlyQuotes.desc)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.curlyQuotes)
          .onChange(async (value) => {
            this.plugin.settings.curlyQuotes = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.openDouble)
      .addText((text) => {
        text
          .setValue(this.plugin.settings.openDouble)
          .onChange(async (value) => {
            if (!value) return;
            if (value.length > 1) {
              text.setValue(value[0]);
              return;
            }

            this.plugin.settings.openDouble = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.closeDouble)
      .addText((text) => {
        text
          .setValue(this.plugin.settings.closeDouble)
          .onChange(async (value) => {
            if (!value) return;
            if (value.length > 1) {
              text.setValue(value[0]);
              return;
            }
            this.plugin.settings.closeDouble = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.openSingle)
      .addText((text) => {
        text
          .setValue(this.plugin.settings.openSingle)
          .onChange(async (value) => {
            if (!value) return;
            if (value.length > 1) {
              text.setValue(value[0]);
              return;
            }
            this.plugin.settings.openSingle = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.closeSingle)
      .addText((text) => {
        text
          .setValue(this.plugin.settings.closeSingle)
          .onChange(async (value) => {
            if (!value) return;
            if (value.length > 1) {
              text.setValue(value[0]);
              return;
            }
            this.plugin.settings.closeSingle = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.dashes.name)
      .setDesc(t.dashes.desc)
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.emDash).onChange(async (value) => {
          this.plugin.settings.emDash = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t.skipEnDash.name)
      .setDesc(t.skipEnDash.desc)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.skipEnDash)
          .onChange(async (value) => {
            this.plugin.settings.skipEnDash = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.ellipsis.name)
      .setDesc(t.ellipsis.desc)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.ellipsis)
          .onChange(async (value) => {
            this.plugin.settings.ellipsis = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.guillemets.name)
      .setDesc(t.guillemets.desc)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.guillemets)
          .onChange(async (value) => {
            this.plugin.settings.guillemets = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName(t.openGuillemet).addText((text) => {
      text
        .setValue(this.plugin.settings.openGuillemet)
        .onChange(async (value) => {
          if (!value) return;

          this.plugin.settings.openGuillemet = value;
          await this.plugin.saveSettings();
        });
    });

    new Setting(containerEl).setName(t.closeGuillemet).addText((text) => {
      text
        .setValue(this.plugin.settings.closeGuillemet)
        .onChange(async (value) => {
          if (!value) return;

          this.plugin.settings.closeGuillemet = value;
          await this.plugin.saveSettings();
        });
    });

    new Setting(containerEl)
      .setName(t.arrows.name)
      .setDesc(t.arrows.desc)
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.arrows).onChange(async (value) => {
          this.plugin.settings.arrows = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName(t.leftArrow).addText((text) => {
      text.setValue(this.plugin.settings.leftArrow).onChange(async (value) => {
        if (!value) return;
        if (value.length > 1) {
          text.setValue(value[0]);
          return;
        }
        this.plugin.settings.leftArrow = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName(t.rightArrow)
      .addText((text) => {
        text
          .setValue(this.plugin.settings.rightArrow)
          .onChange(async (value) => {
            if (!value) return;
            if (value.length > 1) {
              text.setValue(value[0]);
              return;
            }
            this.plugin.settings.rightArrow = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.comparisons.name)
      .setDesc(t.comparisons.desc)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.comparisons)
          .onChange(async (value) => {
            this.plugin.settings.comparisons = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t.fractions.name)
      .setDesc(t.fractions.desc)
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.fractions)
          .onChange(async (value) => {
            this.plugin.settings.fractions = value;
            await this.plugin.saveSettings();
          });
      });
  }
}

const ignoreListRegEx = /frontmatter|code|math|templater|hashtag/;

function shouldCheckTextAtPos(
  instance: CodeMirror.Editor,
  pos: CodeMirror.Position
) {
  // Empty line
  if (!instance.getLine(pos.line)) {
    return true;
  }

  const tokens = instance.getTokenTypeAt(pos);

  // Plain text line
  if (!tokens) {
    return true;
  }

  // Not codeblock or frontmatter
  if (!ignoreListRegEx.test(tokens)) {
    return true;
  }

  return false;
}

type TypoChoice = { value: Lang | false | null; label: string };

// Choices are built when the modal opens, in the current interface language.
function typoChoices(t: UiStrings): TypoChoice[] {
  return [
    { value: null, label: t.autoDetection },
    ...LANGS.map((lang) => ({ value: lang, label: capitalize(t.langNames[lang]) })),
    { value: false, label: t.doNotCheck },
  ];
}

// Choix de la propriété smart-typo d'une note ; le choix en vigueur est coché.
class TypoSettingModal extends SuggestModal<TypoChoice> {
  private choices: TypoChoice[];

  constructor(
    app: App,
    t: UiStrings,
    private current: Lang | false | null,
    private onChoose: (value: Lang | false | null) => void
  ) {
    super(app);
    this.choices = typoChoices(t);
    this.setPlaceholder(t.noteLanguage);
  }

  getSuggestions(query: string): TypoChoice[] {
    const q = query.toLowerCase();
    return this.choices.filter((c) => c.label.toLowerCase().includes(q));
  }

  renderSuggestion(choice: TypoChoice, el: HTMLElement) {
    el.textContent = (choice.value === this.current ? "✓ " : "") + choice.label;
  }

  onChooseSuggestion(choice: TypoChoice) {
    this.onChoose(choice.value);
  }
}
