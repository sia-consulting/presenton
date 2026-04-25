"use client";

import React from "react";
import { LayoutDashboard, Star, Brain, Settings, Palette } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";



export const defaultNavItems = [
    { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { key: "templates" as const, label: "Standard", icon: Star },
    { key: "designs" as const, label: "Smart", icon: Brain },



];
export const BelongingNavItems = [
    { key: "settings" as const, label: "Settings", icon: Settings },
]

const DashboardSidebar = () => {

    const { t } = useLanguage();
    const pathname = usePathname();
    const activeTab = pathname.split("?")[0].split("/").pop();
    const router = useRouter();




    return (
        <aside
            className="sticky top-0 h-screen w-[115px] flex flex-col justify-between bg-secondary backdrop-blur border-r border-border px-4  py-8"
            aria-label="Dashboard sidebar"
        >
            <div>

                <div onClick={() => router.push("/dashboard")} className="flex items-center  pb-6 border-b border-border   gap-2    ">
                    <div className="bg-[#7C51F8] rounded-full cursor-pointer p-1 flex justify-center items-center mx-auto">
                        <img src="/logo-with-bg.png" alt="Presenton logo" className="h-[40px] object-contain w-full" />
                    </div>
                </div>
                <nav className="pt-6 font-syne" aria-label="Dashboard sections">
                    <div className="  space-y-6">

                        {/* Dashboard */}
                        <Link
                            prefetch={false}
                            href={`/dashboard`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/dashboard" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label="Dashboard"
                            title="Dashboard"
                        >
                            <LayoutDashboard className={["h-4 w-4", pathname === "/dashboard" ? "text-[#5146E5]" : "text-muted-foreground"].join(" ")} />
                            <span className="text-[11px] text-foreground">{t("dashboard")}</span>
                        </Link>
                        <Link
                            prefetch={false}
                            href={`/templates`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/templates" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label="Templates"
                            title="Templates"
                        >
                            <div className="flex flex-col cursor-pointer tex-center items-center gap-2  transition-colors">
                                <Star className={`h-4 w-4 ${pathname === "/templates" ? "text-[#5146E5]" : "text-muted-foreground"}`} />
                                <span className="text-[11px] text-foreground">{t("templates")}</span>
                            </div>
                        </Link>
                        <Link
                            prefetch={false}
                            href={`/theme`}
                            className={[
                                "flex flex-col tex-center items-center gap-2  transition-colors",
                                pathname === "/theme" ? "" : "ring-transparent",
                            ].join(" ")}
                            aria-label="Theme"
                            title="Theme"
                        >
                            <div className="flex flex-col cursor-pointer tex-center items-center gap-2  transition-colors">
                                <Palette className={`h-4 w-4 ${pathname === "/theme" ? "text-[#5146E5]" : "text-muted-foreground"}`} />
                                <span className="text-[11px] text-foreground">{t("themes")}</span>
                            </div>
                        </Link>
                    </div>
                </nav>
            </div>

            <div className=" pt-5 border-t border-border  font-syne "
            >
                <Link
                    prefetch={false}
                    href="/settings"
                    className={[
                        "flex flex-col tex-center items-center gap-2  transition-colors ",
                        activeTab === "settings" ? "" : "ring-transparent",
                    ].join(" ")}
                    aria-label={t("settings")}
                    title={t("settings")}
                >
                    <Settings className={["h-4 w-4", activeTab === "settings" ? "text-[#5146E5]" : "text-muted-foreground"].join(" ")} />
                    <span className="text-[11px] text-foreground">{t("settings")}</span>
                </Link>
            </div>

        </aside>
    );
};

export default DashboardSidebar;

