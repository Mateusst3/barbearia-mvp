"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";

interface CashEntry {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountCents: number;
  description: string;
  occurredAt: string;
}

export default function CaixaPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  });
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [loadingCash, setLoadingCash] = useState(false);
  const [cashType, setCashType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [cashDescription, setCashDescription] = useState("");
  const [cashAmount, setCashAmount] = useState("");

  async function loadCashEntries() {
    setLoadingCash(true);
    const response = await fetch(`/api/cash/entries?date=${selectedDate}`);
    const data = await response.json();
    setCashEntries(data.entries ?? []);
    setLoadingCash(false);
  }

  useEffect(() => {
    loadCashEntries();
  }, [selectedDate]);

  async function handleCashEntry(event: React.FormEvent) {
    event.preventDefault();

    const amountCents = Math.round(Number(cashAmount.replace(",", ".")) * 100);

    await fetch("/api/cash/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: cashType,
        description: cashDescription,
        amountCents,
        occurredAt: new Date(`${selectedDate}T12:00:00`).toISOString(),
      }),
    });

    setCashDescription("");
    setCashAmount("");

    await loadCashEntries();
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Caixa</p>
          <h1 className="text-3xl font-semibold text-gradient">Movimentações</h1>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100"
        />
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Novo lançamento</h2>
          <form onSubmit={handleCashEntry} className="mt-4 grid gap-3">
            <select
              value={cashType}
              onChange={(event) => setCashType(event.target.value as "INCOME" | "EXPENSE")}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saída</option>
            </select>
            <input
              required
              placeholder="Descrição"
              value={cashDescription}
              onChange={(event) => setCashDescription(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            />
            <input
              required
              placeholder="Valor (R$)"
              value={cashAmount}
              onChange={(event) => setCashAmount(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-2xl bg-indigo-300 py-3 text-sm font-semibold text-slate-900 transition hover:bg-indigo-200"
            >
              Registrar
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Movimentações do dia</h2>
          <div className="mt-6 space-y-3">
            {loadingCash ? (
              <p className="text-sm text-slate-400">Carregando...</p>
            ) : cashEntries.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma movimentação hoje.</p>
            ) : (
              cashEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">
                        {formatDateTime(entry.occurredAt)}
                      </p>
                      <p className="text-base font-semibold">{entry.description}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          entry.type === "INCOME" ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {entry.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(entry.amountCents)}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {entry.type === "INCOME" ? "Entrada" : "Saída"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
