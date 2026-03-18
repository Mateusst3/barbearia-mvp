"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

interface CashSummary {
  income: number;
  expense: number;
  net: number;
}

export default function ResumoPage() {
  const [summary, setSummary] = useState<{
    daily: CashSummary;
    weekly: CashSummary;
    monthly: CashSummary;
  } | null>(null);

  async function loadSummary() {
    const response = await fetch("/api/cash/summary");
    const data = await response.json();
    setSummary(data);
  }

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="min-h-screen px-6 py-10">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Resumo</p>
        <h1 className="text-3xl font-semibold text-gradient">Visão financeira</h1>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {summary ? (
          [
            { label: "Diário", data: summary.daily },
            { label: "Semanal", data: summary.weekly },
            { label: "Mensal", data: summary.monthly },
          ].map((item) => (
            <div key={item.label} className="glass-panel rounded-3xl p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(item.data.net)}
              </p>
              <div className="mt-3 text-xs text-slate-400">
                <p>Entradas: {formatCurrency(item.data.income)}</p>
                <p>Saídas: {formatCurrency(item.data.expense)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">Carregando...</p>
        )}
      </div>
    </div>
  );
}
