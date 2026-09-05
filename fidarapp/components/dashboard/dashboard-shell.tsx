"use client";

import { useEffect, useState } from "react";

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  useEffect(() => {
    const savedState =
      localStorage.getItem(
        "fidara_sidebar_collapsed",
      );

    setCollapsed(savedState === "true");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;

      localStorage.setItem(
        "fidara_sidebar_collapsed",
        String(next),
      );

      return next;
    });
  }

  return (
    <div
      className={[
        "dashboard-layout",
        collapsed ? "sidebar-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <AppSidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
      />

      <Sheet
        open={mobileOpen}
        onOpenChange={setMobileOpen}
      >
        <SheetContent
          side="left"
          showCloseButton={false}
          className="mobile-navigation-sheet"
        >
          <SheetTitle className="sr-only">
            Navegación de Fidara
          </SheetTitle>

          <SheetDescription className="sr-only">
            Menú principal del panel de Fidara.
          </SheetDescription>

          <AppSidebar
            collapsed={false}
            mobile
            onNavigate={() =>
              setMobileOpen(false)
            }
          />
        </SheetContent>
      </Sheet>

      <div className="dashboard-main">
        <AppHeader
          onOpenMobileMenu={() =>
            setMobileOpen(true)
          }
        />

        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}