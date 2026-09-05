"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BarChart3,
  CreditCard,
  Home,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Settings,
  UserRoundCog,
  Users,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AppSidebarProps = {
  collapsed: boolean;
  mobile?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
};

const navigation = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Escanear",
    href: "/dashboard/escanear",
    icon: QrCode,
    primary: true,
  },
  {
    label: "Clientes",
    href: "/dashboard/clientes",
    icon: Users,
  },
  {
    label: "Mi tarjeta",
    href: "/dashboard/tarjeta",
    icon: CreditCard,
  },
  {
    label: "Equipo",
    href: "/dashboard/equipo",
    icon: UserRoundCog,
  },
  {
    label: "Ubicaciones",
    href: "/dashboard/ubicaciones",
    icon: MapPin,
  },
  {
    label: "Estadísticas",
    href: "/dashboard/estadisticas",
    icon: BarChart3,
  },
];

export function AppSidebar({
  collapsed,
  mobile = false,
  onToggle,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  }

  function createLink(item: (typeof navigation)[number]) {
    const Icon = item.icon;
    const active = isActive(item.href);

    const className = [
      "sidebar-link",
      active ? "active" : "",
      item.primary ? "scan-link" : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (collapsed && !mobile) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger
            render={
              <Link
                href={item.href}
                className={className}
                onClick={onNavigate}
                aria-label={item.label}
              />
            }
          >
            <Icon size={20} strokeWidth={1.8} />
          </TooltipTrigger>

          <TooltipContent side="right" sideOffset={10}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={className}
        onClick={onNavigate}
      >
        <Icon size={20} strokeWidth={1.8} />

        <span className="sidebar-label">{item.label}</span>

        {item.primary && <em>Acción rápida</em>}
      </Link>
    );
  }

  const configurationActive = pathname.startsWith("/dashboard/configuracion");

  return (
    <TooltipProvider delay={250}>
      <aside
        className={[
          "app-sidebar",
          mobile ? "app-sidebar-mobile" : "app-sidebar-desktop",
        ].join(" ")}
      >
        <div className="sidebar-brand-row">
          <Link
            href="/dashboard"
            className="dashboard-logo"
            onClick={onNavigate}
          >
            {collapsed && !mobile ? (
              <Image
                src="/Fidara-logo.png"
                alt="Fidara"
                width={40}
                height={40}
                priority
              />
            ) : (
              <Image
                src="/Fidara-logo-horizontal.png"
                alt="Fidara"
                width={142}
                height={42}
                priority
              />
            )}
          </Link>

          {!mobile && (
            <button
              type="button"
              className="sidebar-toggle"
              onClick={onToggle}
              aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            >
              {collapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navigation.map(createLink)}
        </nav>

        <div className="sidebar-bottom">
          {collapsed && !mobile ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/dashboard/configuracion"
                    className={[
                      "sidebar-link",
                      configurationActive ? "active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label="Configuración"
                  />
                }
              >
                <Settings size={20} />
              </TooltipTrigger>

              <TooltipContent side="right" sideOffset={10}>
                Configuración
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/dashboard/configuracion"
              className={["sidebar-link", configurationActive ? "active" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={onNavigate}
            >
              <Settings size={20} />

              <span className="sidebar-label">Configuración</span>
            </Link>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
