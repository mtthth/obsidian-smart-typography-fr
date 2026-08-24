import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
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
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";

import { SmartTypographySettings } from "types";
import { Tree } from "@lezer/common";

const DEFAULT_SETTINGS: SmartTypographySettings = {
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
  frenchColon: true,
  frenchGuillemets: true,
  frenchPercent: true,
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

  buildInputRules() {
    this.legacyInputRules = [];
    this.inputRules = [];
    this.inputRuleMap = {};

    // --- Typographie francaise -------------------------------------------
    // En tete : les regles << / >> francaises doivent primer sur
    // guillemetRules, qui partagent les memes declencheurs.
    if (this.settings.frenchSpacing) {
      this.inputRules.push(...frenchGuardRules, ...frenchStopRules);

      if (this.settings.frenchGuillemets) {
        this.inputRules.push(...frenchGuillemetRules);
        if (this.settings.guillemets) {
          this.inputRules.push(...frenchAngleGuillemetRules);
        }
      }
      if (this.settings.frenchColon) {
        this.inputRules.push(...frenchColonRules);
      }
      if (this.settings.frenchPercent) {
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

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new SmartTypographySettingTab(this.app, this));

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
            .type.prop(tokenClassNodeProp);

          if (nodeProps && ignoreListRegEx.test(nodeProps)) {
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

        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          const insertedText = inserted.sliceString(0, 0 + inserted.length);
          const matchedRules = this.inputRuleMap[insertedText];

          if (!matchedRules) {
            return;
          }

          for (let rule of matchedRules) {
            // If we're in a codeblock, etc, return early, no need to continue checking
            if (!canPerformReplacement(fromA)) return;

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

            registerChange(
              {
                from: insertionPoint,
                to: insertionPoint + replacementLength,
                insert,
              },
              {
                from: reversionPoint,
                to: reversionPoint + insert.length,
                insert: rule.from,
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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.buildInputRules();
  }

  async saveSettings() {
    this.buildInputRules();
    await this.saveData(this.settings);
  }
}

class SmartTypographySettingTab extends PluginSettingTab {
  plugin: SmartTypography;

  constructor(app: App, plugin: SmartTypography) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("Portée").setHeading();

    new Setting(containerEl)
      .setName("Limiter à certains dossiers")
      .setDesc(
        "Le plugin n'intervient que dans les dossiers listés ci-dessous, sous-dossiers compris."
      )
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
        .setName("Dossiers concernés")
        .setDesc(
          "Un chemin par ligne, relatif à la racine du coffre. Casse respectée. Liste vide = plugin inactif partout."
        )
        .addTextArea((ta) => {
          ta.setPlaceholder("Écrits/Nouvelles\nÉditions Procuste")
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

    new Setting(containerEl)
      .setName("Typographie française")
      .setHeading();

    new Setting(containerEl)
      .setName("Espaces avant la ponctuation double")
      .setDesc(
        "Insère une espace fine insécable (U+202F) devant ; ! ? et »"
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.frenchSpacing)
          .onChange(async (value) => {
            this.plugin.settings.frenchSpacing = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    if (this.plugin.settings.frenchSpacing) {
      new Setting(containerEl)
        .setName("Caractère d'espace fine")
        .setDesc(
          "U+202F est la forme correcte. Basculez sur U+00A0 si votre police de travail ne la rend pas."
        )
        .addDropdown((dd) => {
          dd.addOption(FINE, "Fine insécable (U+202F)")
            .addOption(NBSP, "Insécable (U+00A0)")
            .addOption(THIN, "Fine sécable (U+2009)")
            .setValue(this.plugin.settings.frNarrowSpace)
            .onChange(async (value) => {
              this.plugin.settings.frNarrowSpace = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName("Deux-points")
        .setDesc(
          "Espace insécable pleine (U+00A0) devant « : », conformément à l'usage de l'Imprimerie nationale. À désactiver si vous saisissez souvent des URL, des heures ou des champs Dataview."
        )
        .addToggle((toggle) => {
          toggle
            .setValue(this.plugin.settings.frenchColon)
            .onChange(async (value) => {
              this.plugin.settings.frenchColon = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName("Guillemets")
        .setDesc("Espace fine après « et avant »")
        .addToggle((toggle) => {
          toggle
            .setValue(this.plugin.settings.frenchGuillemets)
            .onChange(async (value) => {
              this.plugin.settings.frenchGuillemets = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName("Pourcentages")
        .setDesc("Espace insécable entre le nombre et le signe % (50 %)")
        .addToggle((toggle) => {
          toggle
            .setValue(this.plugin.settings.frenchPercent)
            .onChange(async (value) => {
              this.plugin.settings.frenchPercent = value;
              await this.plugin.saveSettings();
            });
        });
    }

    new Setting(containerEl)
      .setName("Curly Quotes")
      .setDesc(
        "Double and single quotes will be converted to curly quotes (“” & ‘’)"
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.curlyQuotes)
          .onChange(async (value) => {
            this.plugin.settings.curlyQuotes = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Open double quote character")
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
      .setName("Close double quote character")
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
      .setName("Open single quote character")
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
      .setName("Close single quote character")
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
      .setName("Dashes")
      .setDesc(
        "Two dashes (--) will be converted to an en-dash (–). And en-dash followed by a dash will be converted to and em-dash (—). An em-dash followed by a dash will be converted into three dashes (---)"
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.emDash).onChange(async (value) => {
          this.plugin.settings.emDash = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Skip en-dash")
      .setDesc(
        "When enabled, two dashes will be converted to an em-dash rather than an en-dash."
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.skipEnDash)
          .onChange(async (value) => {
            this.plugin.settings.skipEnDash = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Ellipsis")
      .setDesc("Three periods (...) will be converted to an ellipses (…)")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.ellipsis)
          .onChange(async (value) => {
            this.plugin.settings.ellipsis = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Guillemets")
      .setDesc("<< | >> will be converted to « | »")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.guillemets)
          .onChange(async (value) => {
            this.plugin.settings.guillemets = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName("Open guillemet").addText((text) => {
      text
        .setValue(this.plugin.settings.openGuillemet)
        .onChange(async (value) => {
          if (!value) return;

          this.plugin.settings.openGuillemet = value;
          await this.plugin.saveSettings();
        });
    });

    new Setting(containerEl).setName("Close guillemet").addText((text) => {
      text
        .setValue(this.plugin.settings.closeGuillemet)
        .onChange(async (value) => {
          if (!value) return;

          this.plugin.settings.closeGuillemet = value;
          await this.plugin.saveSettings();
        });
    });

    new Setting(containerEl)
      .setName("Arrows")
      .setDesc("<- | -> will be converted to ← | →")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.arrows).onChange(async (value) => {
          this.plugin.settings.arrows = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName("Left arrow character").addText((text) => {
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
      .setName("Right arrow character")
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
      .setName("Comparison")
      .setDesc("<= | >= | /= will be converted to ≤ | ≥ | ≠")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.comparisons)
          .onChange(async (value) => {
            this.plugin.settings.comparisons = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Fractions")
      .setDesc(
        "1/2 will be converted to ½. Supported UTF-8 fractions: ½, ⅓, ⅔, ¼, ¾, ⅕, ⅖, ⅗, ⅘, ⅙, ⅚, ⅐, ⅛, ⅜, ⅝, ⅞, ⅑, ⅒"
      )
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
