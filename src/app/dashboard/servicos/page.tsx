"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

interface Service {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
}

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceNameInput, setServiceNameInput] = useState("");
  const [servicePriceInput, setServicePriceInput] = useState("");
  const [serviceDurationInput, setServiceDurationInput] = useState("30");

  async function loadServices() {
    const response = await fetch("/api/services");
    const data = await response.json();
    setServices(data.services ?? []);
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function handleCreateService(event: React.FormEvent) {
    event.preventDefault();

    const priceCents = Math.round(Number(servicePriceInput.replace(",", ".")) * 100);
    const durationMinutes = Number(serviceDurationInput);

    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: serviceNameInput,
        priceCents,
        durationMinutes,
      }),
    });

    if (response.ok) {
      setServiceNameInput("");
      setServicePriceInput("");
      setServiceDurationInput("30");
      await loadServices();
    }
  }

  async function handleDeleteService(id: string) {
    await fetch(`/api/services?id=${id}`, { method: "DELETE" });
    await loadServices();
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <header>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Serviços</p>
        <h1 className="text-3xl font-semibold text-gradient">Catálogo do barbeiro</h1>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Cadastrar serviço</h2>
          <form onSubmit={handleCreateService} className="mt-4 grid gap-3">
            <input
              required
              placeholder="Nome do serviço"
              value={serviceNameInput}
              onChange={(event) => setServiceNameInput(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            />
            <input
              required
              placeholder="Valor (R$)"
              value={servicePriceInput}
              onChange={(event) => setServicePriceInput(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            />
            <select
              value={serviceDurationInput}
              onChange={(event) => setServiceDurationInput(event.target.value)}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="15">Duração 15 min</option>
              <option value="30">Duração 30 min</option>
              <option value="45">Duração 45 min</option>
              <option value="60">Duração 60 min</option>
            </select>
            <button
              type="submit"
              className="cursor-pointer rounded-2xl bg-amber-300 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
            >
              Adicionar serviço
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Serviços ativos</h2>
          <div className="mt-4 space-y-3">
            {services.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum serviço cadastrado.</p>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{service.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(service.priceCents)} • {service.durationMinutes} min
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service.id)}
                      className="cursor-pointer rounded-full border border-rose-400 px-3 py-1 text-xs text-rose-200"
                    >
                      Remover
                    </button>
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
