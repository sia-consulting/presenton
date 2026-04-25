export type Locale = "en" | "de";

export const translations = {
  en: {
    // Settings page
    settings: "Settings",
    appearance: "Appearance",
    theme: "Theme",
    themeDescription: "Select your preferred color scheme.",
    light: "Light",
    dark: "Dark",
    language: "Language",
    languageDescription: "Select your preferred language.",
    english: "English",
    german: "Deutsch",
    account: "Account",
    accountDescription: "Manage your account.",
    logout: "Logout",
    logoutDescription: "Sign out of your account.",
    settingsSaved: "Settings saved",
    settingsSavedDescription: "Your preferences have been updated.",

    // Sidebar / Nav
    dashboard: "Dashboard",
    templates: "Templates",
    themes: "Themes",
    newPresentation: "New presentation",
    new: "New",
    newThemes: "New Themes",

    // Settings sidebar
    userSettings: "User Settings",
  },
  de: {
    // Settings page
    settings: "Einstellungen",
    appearance: "Darstellung",
    theme: "Design",
    themeDescription: "Wählen Sie Ihr bevorzugtes Farbschema.",
    light: "Hell",
    dark: "Dunkel",
    language: "Sprache",
    languageDescription: "Wählen Sie Ihre bevorzugte Sprache.",
    english: "English",
    german: "Deutsch",
    account: "Konto",
    accountDescription: "Verwalten Sie Ihr Konto.",
    logout: "Abmelden",
    logoutDescription: "Von Ihrem Konto abmelden.",
    settingsSaved: "Einstellungen gespeichert",
    settingsSavedDescription: "Ihre Einstellungen wurden aktualisiert.",

    // Sidebar / Nav
    dashboard: "Dashboard",
    templates: "Vorlagen",
    themes: "Designs",
    newPresentation: "Neue Präsentation",
    new: "Neu",
    newThemes: "Neue Designs",

    // Settings sidebar
    userSettings: "Benutzereinstellungen",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
