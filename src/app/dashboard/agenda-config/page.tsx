"use client";

import { useEffect, useState } from "react";

interface WorkingSettings {
  workStartHour: number;
  workEndHour: number;
  slotMinutes: number;
}

export default function AgendaConfigPage() {
  const [settings, setSettings] = useState<WorkingSettings>({
    workStartHour: 9,
    workEndHour: 19,
    slotMinutes: 30,
  });
  const [message, setMessage] = useState("");

  async function loadSettings() {
    const response = await fetch("/api/settings");
    const data = await response.json();
    if (data?.settings) {
      setSettings(data.settings);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleUpdateSettings(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data?.error ?? "Não foi possível salvar.");
      return;
    }

    setMessage("Agenda atualizada.");
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Agenda do barbeiro</p>
        <h1 className="text-3xl font-semibold text-gradient">Configure horários</h1>
      </header>

      <div className="mt-8 max-w-xl">
        <div className="glass-panel rounded-3xl p-6">
          <form onSubmit={handleUpdateSettings} className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={0}
              max={23}
              value={settings.workStartHour}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  workStartHour: Number(event.target.value),
                }))
              }
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              placeholder="Início (hora)"
            />
            <input
              type="number"
              min={1}
              max={23}
              value={settings.workEndHour}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  workEndHour: Number(event.target.value),
                }))
              }
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              placeholder="Fim (hora)"
            />
            <select
              value={settings.slotMinutes}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  slotMinutes: Number(event.target.value),
                }))
              }
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value={15}>Intervalo 15 min</option>
              <option value={30}>Intervalo 30 min</option>
              <option value={60}>Intervalo 60 min</option>
            </select>
            <button
              type="submit"
              className="sm:col-span-2 cursor-pointer rounded-2xl bg-slate-200 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
            >
              Salvar agenda
            </button>
          </form>
          {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
