export default function PublicNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/80 bg-slate-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold text-slate-100">CorteCerto</span>
        <div className="flex items-center gap-3 text-sm">
          <a
            href="/?register=1"
            className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 transition hover:border-slate-400"
          >
            Criar conta
          </a>
          <a
            href="/?login=1"
            className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 transition hover:border-slate-400"
          >
            Login
          </a>
        </div>
      </div>
    </nav>
  );
}
