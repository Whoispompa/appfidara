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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SessionData = {
  userName: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  role?: string;
};

type AppHeaderProps = {
  onOpenMobileMenu: () => void;
};

const apiUrl =
  process.env.NEXT_PUBLIC_FIDARA_API_URL ?? "https://api.fidara.mx";

function createAbsoluteLogoUrl(logoUrl?: string | null) {
  if (!logoUrl) {
    return null;
  }

  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }

  return `${apiUrl}${logoUrl}`;
}

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

export function AppHeader({ onOpenMobileMenu }: AppHeaderProps) {
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    try {
      const storedSession = sessionStorage.getItem("fidara_session");

      if (!storedSession) {
        router.replace("/login");
        return;
      }

      const saved = JSON.parse(storedSession);

      setSession({
        userName: saved.userName || "Usuario",

        organizationName: saved.organizationName || "Negocio",

        organizationLogoUrl: saved.organizationLogoUrl || null,

        role: saved.role || "Employee",
      });
    } catch {
      sessionStorage.removeItem("fidara_session");
      router.replace("/login");
    }
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

  const organizationLogo = createAbsoluteLogoUrl(session.organizationLogoUrl);

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
              <AvatarFallback>{getInitials(session.userName)}</AvatarFallback>
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
                <span className="dropdown-user-name">{session.userName}</span>

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
                onClick={() => router.push("/dashboard/perfil")}
              >
                <UserRound />
                Mi perfil
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/dashboard/configuracion")}
              >
                <Settings />
                Configuración
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
