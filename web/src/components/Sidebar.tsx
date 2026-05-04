import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Cloud,
  DollarSign,
  Home,
  LineChart,
  MapPin,
  Menu,
  ScrollText,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { docsUrl } from "../lib/api";

const iconProps = { className: "h-5 w-5", strokeWidth: 1.75 } as const;

type NavItem = { to: string; end?: boolean; label: string; Icon: LucideIcon };

const navItems: NavItem[] = [
  { to: "/", end: true, label: "Início", Icon: Home },
  { to: "/populacao/estados", label: "População", Icon: Users },
  { to: "/populacao/municipios", label: "Municípios", Icon: MapPin },
  { to: "/inflacao", label: "Inflação", Icon: LineChart },
  { to: "/economia", label: "Economia", Icon: DollarSign },
  { to: "/clima", label: "Clima", Icon: Cloud },
  { to: "/catalogo", label: "Catálogo", Icon: BookOpen },
];

function navBtnClass(active: boolean) {
  return [
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors",
    active
      ? "bg-[#161621] text-white shadow-inner ring-1 ring-violet-500/40"
      : "text-white/50 hover:bg-white/5 hover:text-white/85",
  ].join(" ");
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#161621] text-white md:hidden"
        aria-label="Abrir menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[60px] shrink-0 flex-col border-r border-white/15 bg-[#161621] py-3",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "transition-transform duration-200 ease-out",
        ].join(" ")}
      >
        <div className="relative flex shrink-0 flex-col items-center justify-center">
          <button
            type="button"
            className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 md:hidden"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <NavLink
            to="/"
            end
            className="mx-auto mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-900/40"
            title="Dados públicos BR"
            onClick={() => setMobileOpen(false)}
          >
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </NavLink>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto overflow-x-hidden px-1.5 pt-2">
          {navItems.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) => navBtnClass(isActive)}
              onClick={() => setMobileOpen(false)}
            >
              <Icon {...iconProps} />
              <span className="sr-only">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex shrink-0 flex-col items-center gap-2 border-t border-white/10 px-1.5 pt-3">
          <a
            href={docsUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/5 hover:text-white/90"
            title="Documentação da API"
          >
            <ScrollText className="h-5 w-5" strokeWidth={1.75} />
          </a>
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-gradient-to-br from-slate-600 to-slate-800 text-white/45"
            title="Perfil (placeholder)"
          >
            <UserRound className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </div>
      </aside>
    </>
  );
}
