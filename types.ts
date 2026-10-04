import type { UiLang } from "i18n";
import { Lang, LangOptionsMap } from "languages";

export interface SmartTypographySettings {
  // Language of the settings, menus, notices and marker tooltips.
  uiLanguage: UiLang;

  curlyQuotes: boolean;
  emDash: boolean;
  ellipsis: boolean;
  arrows: boolean;
  guillemets: boolean;
  comparisons: boolean;
  fractions: boolean;
  skipEnDash: boolean;

  openSingle: string;
  closeSingle: string;
  openDouble: string;
  closeDouble: string;
  openGuillemet: string;
  closeGuillemet: string;
  leftArrow: string;
  rightArrow: string;

  // --- Portee ---
  limitToFolders: boolean;
  includedFolders: string[];

  // --- Typographie francaise ---
  frenchSpacing: boolean;
  // Familles de règles activées, langue par langue.
  langOptions: LangOptionsMap;
  flagWrongSpaces: boolean;
  // Langue des lignes et des notes que la détection ne sait pas reconnaître.
  defaultLanguage: Lang;
  frNarrowSpace: string;
  frNbSpace: string;
}
