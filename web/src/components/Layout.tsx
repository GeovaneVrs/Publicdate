import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

/**
 * Sidebar é `position: fixed` — não entra no fluxo. O conteúdo só recebe `pl-[60px]` no desktop.
 * Evita `display: flex` no pai com dois filhos (sidebar + área), que em alguns casos soma largura
 * da sidebar ao padding e “empurra” as páginas.
 */
export function Layout() {
  return (
    <div className="relative min-h-screen bg-[#0b0e14] text-white">
      <Sidebar />
      <div className="relative box-border min-h-screen min-w-0 md:pl-[60px]">
        <main className="min-h-screen overflow-x-hidden overflow-y-auto bg-[#161621] px-4 pb-10 pt-14 md:px-8 md:pb-12 md:pt-8">
          <div className="mx-auto max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
