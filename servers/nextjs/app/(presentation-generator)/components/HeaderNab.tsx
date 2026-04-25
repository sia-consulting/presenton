"use client";
import { LayoutDashboard, Settings, Upload } from "lucide-react";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent, MixpanelEvent } from "@/utils/mixpanel";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const HeaderNav = () => {

  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2">

      <Link
        href="/dashboard"
        prefetch={false}
        className="flex items-center gap-2 px-3 py-2 text-foreground  rounded-md transition-colors outline-none"
        role="menuitem"
        onClick={() => trackEvent(MixpanelEvent.Navigation, { from: pathname, to: "/dashboard" })}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-sm font-medium font-inter">
          {t("dashboard")}
        </span>
      </Link>
      <Link
        href="/settings"
        prefetch={false}
        className="flex items-center gap-2 px-3 py-2 text-foreground  rounded-md transition-colors outline-none"
        role="menuitem"
        onClick={() => trackEvent(MixpanelEvent.Navigation, { from: pathname, to: "/settings" })}
      >
        <Settings className="w-5 h-5" />
        <span className="text-sm font-medium font-inter">
          {t("settings")}
        </span>
      </Link>
    </div>
  );
};

export default HeaderNav;
