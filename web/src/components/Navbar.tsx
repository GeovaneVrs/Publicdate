import { useState } from "react";
import { NavLink } from "react-router-dom";
import { docsUrl } from "../lib/api";

const links = [
  { to: "/", label: "Início", end: true },
  { to: "/populacao/estados", label: "População" },
  { to: "/populacao/municipios", label: "Municípios" },
  { to: "/inflacao", label: "Inflação" },
  { to: "/economia", label: "Economia" },
  { to: "/clima", label: "Clima" },
  { to: "/catalogo", label: "Catálogo" },
];

function linkClass(isActive: boolean) {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-sky-500/15 text-sky-300 shadow-glow"
      : "text-slate-300 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <NavLink
          to="/"
          className="flex shrink-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-lg font-bold text-slate-950 shadow-glow">
            BR
          </span>
          <div className="leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              Dados públicos
            </span>
            <span className="hidden text-xs text-slate-500 sm:block">IBGE · BCB · Clima</span>
          </div>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => linkClass(isActive)}>
              {label}
            </NavLink>
          ))}
          <a
            href={docsUrl()}
            target="_blank"
            rel="noreferrer"
            className="ml-1 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-sky-500/40 hover:text-sky-300"
          >
            API docs
          </a>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <a
            href={docsUrl()}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-300"
          >
            Docs
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-200 hover:bg-white/5"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Abrir menu</span>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => linkClass(isActive)}
                onClick={() => setOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
