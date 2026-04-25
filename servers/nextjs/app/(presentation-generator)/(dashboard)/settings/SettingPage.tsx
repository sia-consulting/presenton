"use client";
import React from "react";
import { Sun, Moon, LogOut, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Locale } from "@/lib/i18n/translations";
import { useMsal } from "@azure/msal-react";

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div className="h-screen font-syne flex flex-col overflow-hidden relative">
      <main className="w-full mx-auto overflow-auto px-6 pb-20">
        <div className="sticky top-0 right-0 z-50 py-[28px] backdrop-blur-sm mb-4">
          <h3 className="text-[28px] tracking-[-0.84px] font-unbounded font-normal text-foreground">
            {t("settings")}
          </h3>
        </div>

        <div className="max-w-2xl space-y-8">
          {/* Theme Section */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <div className="mb-1">
              <h4 className="text-base font-semibold text-foreground">{t("theme")}</h4>
              <p className="text-sm text-muted-foreground mt-1">{t("themeDescription")}</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                  theme === "light"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:bg-accent"
                }`}
              >
                <Sun className="w-4 h-4" />
                {t("light")}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                  theme === "dark"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:bg-accent"
                }`}
              >
                <Moon className="w-4 h-4" />
                {t("dark")}
              </button>
            </div>
          </section>

          {/* Language Section */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <div className="mb-1">
              <h4 className="text-base font-semibold text-foreground">{t("language")}</h4>
              <p className="text-sm text-muted-foreground mt-1">{t("languageDescription")}</p>
            </div>
            <div className="flex gap-3 mt-4">
              {([
                { code: "en" as Locale, label: t("english"), flag: "🇬🇧" },
                { code: "de" as Locale, label: t("german"), flag: "🇩🇪" },
              ]).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLocale(lang.code)}
                  aria-label={lang.label}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                    locale === lang.code
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:bg-accent"
                  }`}
                >
                  <span className="text-base" aria-hidden="true">{lang.flag}</span>
                  {lang.label}
                </button>
              ))}
            </div>
          </section>

          {/* Account Section */}
          {account && (
            <section className="bg-card border border-border rounded-2xl p-6">
              <div className="mb-1">
                <h4 className="text-base font-semibold text-foreground">{t("account")}</h4>
                <p className="text-sm text-muted-foreground mt-1">{t("accountDescription")}</p>
              </div>
              <div className="flex items-center justify-between mt-4 p-4 rounded-xl bg-accent/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#7A5AF8] text-white flex items-center justify-center text-sm font-semibold">
                    {(account.name || account.username || "?")
                      .split(" ")
                      .filter((n) => n.length > 0)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{account.name || account.username}</p>
                    <p className="text-xs text-muted-foreground">{account.username}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  {t("logout")}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
