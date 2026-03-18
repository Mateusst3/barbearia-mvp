"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const links = [
  { label: "Agenda", href: "/dashboard/agenda" },
  { label: "Agenda do Barbeiro", href: "/dashboard/agenda-config" },
  { label: "Serviços", href: "/dashboard/servicos" },
  { label: "Resumo", href: "/dashboard/resumo" },
  { label: "Caixa", href: "/dashboard/caixa" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-slate-900/60 bg-slate-950/90 px-6 py-8">
      <div className="text-xl font-semibold text-gradient">CorteCerto</div>
      <nav className="mt-10 flex flex-1 flex-col gap-3 overflow-y-auto text-sm">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`rounded-2xl border px-3 py-2 text-slate-200 transition ${
              pathname === link.href
                ? "border-amber-300 bg-amber-300/10 text-amber-200"
                : "border-transparent hover:border-slate-700 hover:bg-slate-900/40"
            }`}
          >
            {link.label}
          </a>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-6 rounded-2xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-400"
      >
        Sair
      </button>
    </aside>
  );
}
