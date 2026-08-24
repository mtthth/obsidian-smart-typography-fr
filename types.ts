export interface SmartTypographySettings {
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
  frenchColon: boolean;
  frenchGuillemets: boolean;
  frenchPercent: boolean;
  frNarrowSpace: string;
  frNbSpace: string;
}
