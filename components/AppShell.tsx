"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { roleLabels } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, roles: ["admin", "vendedor", "consulta"] },
  { href: "/calendario", label: "Calendario", icon: CalendarDays, roles: ["admin", "vendedor", "consulta"] },
  { href: "/contratos", label: "Contratos", icon: FileText, roles: ["admin", "vendedor", "consulta"] },
  { href: "/catalogos", label: "Catálogos", icon: BookOpen, roles: ["admin", "vendedor", "consulta"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["admin", "vendedor", "consulta"] },
  { href: "/usuarios", label: "Usuarios", icon: ShieldCheck, roles: ["admin"] },
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const role = profile?.role ?? "consulta";
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login/");
  };

  const isActive = (href: string) => {
    const base = href.replace(/\/$/, "");
    return pathname === base || pathname === `${base}/` || pathname.startsWith(`${base}/`);
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      <div className="flex items-center px-5 py-5">
        <Image
          src="/logo.png"
          alt="PantherSound Luz y Sonido"
          width={168}
          height={60}
          className="h-auto w-40 rounded-lg"
          priority
        />
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`${item.href}/`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-950/40"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-900 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
            {initials(profile?.full_name || "?")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {profile?.full_name || "Sin nombre"}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              {roleLabels[role]}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <Image
            src="/logo.png"
            alt="PantherSound Luz y Sonido"
            width={126}
            height={45}
            className="h-auto w-28 rounded-md"
            priority
          />
          <button
            type="button"
            className="btn-ghost h-9 w-9 p-0"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {open ? (
        <button
          type="button"
          className="fixed right-4 top-4 z-50 rounded-full bg-white p-2 text-slate-700 shadow-lg lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
