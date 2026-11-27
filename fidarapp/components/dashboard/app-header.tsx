"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  UserRound,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type OrganizationBranding, resolveLogoUrl } from "@/lib/branding";

type SessionData = {
  userName: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  role?: string;
};

type AppHeaderProps = {
  onOpenMobileMenu: () => void;
};

type BrandingResponse = {
  success?: boolean;
  data?: OrganizationBranding;
};

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getRoleName(role?: string) {
  switch (role) {
    case "Owner":
      return "Propietario";
    case "Admin":
      return "Administrador";
    case "Manager":
      return "Gerente";
    case "Employee":
      return "Empleado";
    default:
      return "Usuario";
  }
}

export function AppHeader({
  onOpenMobileMenu,
}: AppHeaderProps) {
  const router = useRouter();
  const [session, setSession] =
    useState<SessionData | null>(null);

  useEffect(() => {
    const brandingRequest = new AbortController();

    function synchronizeSession() {
      try {
        const storedSession = sessionStorage.getItem(
          "fidara_session",
        );

        if (!storedSession) {
          router.replace("/login");
          return;
        }

        const saved = JSON.parse(storedSession) as Partial<SessionData>;

        setSession({
          userName: saved.userName || "Usuario",
          organizationName:
            saved.organizationName || "Negocio",
          organizationLogoUrl:
            saved.organizationLogoUrl || null,
          role: saved.role || "Employee",
        });
      } catch {
        sessionStorage.removeItem("fidara_session");
        router.replace("/login");
      }
    }

    function updateOrganizationLogo(logoUrl: string | null) {
      setSession((current) =>
        current ? { ...current, organizationLogoUrl: logoUrl } : current,
      );
    }

    async function synchronizeBranding() {
      try {
        const response = await fetch(
          "/api/settings/branding",
          {
            cache: "no-store",
            signal: brandingRequest.signal,
          },
        );

        if (!response.ok) return;

        const payload =
          (await response.json()) as BrandingResponse;

        if (brandingRequest.signal.aborted || payload.success === false || !payload.data) return;

        const logoUrl = resolveLogoUrl(payload.data.organizationLogoUrl);
        const rawSession = sessionStorage.getItem(
          "fidara_session",
        );

        if (rawSession) {
          updateOrganizationLogo(logoUrl);
          const saved = JSON.parse(rawSession) as Record<
            string,
            unknown
          >;

          sessionStorage.setItem(
            "fidara_session",
            JSON.stringify({
              ...saved,
              organizationLogoUrl: logoUrl,
            }),
          );
        }
      } catch {
        // Conserva las iniciales si la configuración no está disponible.
      }
    }

    function handleBrandingUpdated(event: Event) {
      if (!(event instanceof CustomEvent) || typeof event.detail !== "string") return;

      brandingRequest.abort();
      updateOrganizationLogo(resolveLogoUrl(event.detail));
    }

    synchronizeSession();

    void synchronizeBranding();

    window.addEventListener(
      "fidara:branding-updated",
      handleBrandingUpdated,
    );

    window.addEventListener(
      "storage",
      synchronizeSession,
    );

    return () => {
      brandingRequest.abort();
      window.removeEventListener(
        "fidara:branding-updated",
        handleBrandingUpdated,
      );

      window.removeEventListener(
        "storage",
        synchronizeSession,
      );
    };
  }, [router]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      sessionStorage.removeItem("fidara_session");
      router.replace("/login");
      router.refresh();
    }
  }

  if (!session) {
    return (
      <header className="app-header">
        <button
          type="button"
          className="mobile-menu"
          aria-label="Abrir menú"
          onClick={onOpenMobileMenu}
        >
          <Menu size={22} />
        </button>

        <div className="organization-summary">
          <span className="organization-logo-placeholder">•</span>
          <div className="organization-copy">
            <small>Espacio de trabajo</small>
            <strong>Cargando...</strong>
          </div>
        </div>

        <div className="header-actions">
          <span className="profile-skeleton" />
        </div>
      </header>
    );
  }

  const organizationLogo = resolveLogoUrl(
    session.organizationLogoUrl,
  );

  return (
    <header className="app-header">
      <button
        type="button"
        className="mobile-menu"
        aria-label="Abrir menú"
        onClick={onOpenMobileMenu}
      >
        <Menu size={22} />
      </button>

      <div className="organization-summary">
        <Avatar size="lg" className="business-avatar">
          {organizationLogo && (
            <AvatarImage
              key={organizationLogo}
              src={organizationLogo}
              alt={`Logo de ${session.organizationName}`}
            />
          )}

          <AvatarFallback>
            {getInitials(session.organizationName)}
          </AvatarFallback>
        </Avatar>

        <div className="organization-copy">
          <small>Espacio de trabajo</small>
          <strong>{session.organizationName}</strong>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="Notificaciones"
          onClick={() =>
            router.push("/dashboard/notificaciones")
          }
        >
          <Bell size={19} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="profile-button"
                aria-label="Abrir menú de usuario"
              />
            }
          >
            <Avatar className="user-avatar after:hidden">
              <AvatarFallback>
                {getInitials(session.userName)}
              </AvatarFallback>
            </Avatar>

            <span className="profile-copy">
              <small>{getRoleName(session.role)}</small>
              <strong>{session.userName}</strong>
            </span>

            <ChevronDown size={16} />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="user-dropdown"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="dropdown-user-name">
                  {session.userName}
                </span>
                <span className="dropdown-user-role">
                  {getRoleName(session.role)}
                  {" · "}
                  {session.organizationName}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() =>
                  router.push("/dashboard/perfil")
                }
              >
                <UserRound />
                Mi perfil
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  router.push("/dashboard/configuracion")
                }
              >
                <Settings />
                Configuración
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onClick={logout}
            >
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
