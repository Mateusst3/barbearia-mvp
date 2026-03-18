"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatDateTime } from "@/lib/format";

interface Appointment {
  id: string;
  clientName: string;
  serviceName?: string | null;
  serviceId?: string | null;
  durationMinutes: number;
  startAt: string;
  priceCents: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  reschedules: { id: string; fromAt: string; toAt: string }[];
}

interface Service {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [clientName, setClientName] = useState("");
  const [time, setTime] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [services, setServices] = useState<Service[]>([]);

  const [slotsModal, setSlotsModal] = useState<{
    title: string;
    message: string;
    alternatives: string[];
  } | null>(null);

  const [editModal, setEditModal] = useState<{
    id: string;
    clientName: string;
    serviceId: string;
    date: string;
    time: string;
  } | null>(null);

  function formatPromptDateTime(value: string) {
    const date = new Date(value);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  const appointmentDay = useMemo(() => appointments ?? [], [appointments]);

  async function loadAppointments() {
    setLoadingAppointments(true);
    const response = await fetch(`/api/appointments?date=${selectedDate}`);
    const data = await response.json();
    setAppointments(data.appointments ?? []);
    setLoadingAppointments(false);
  }

  async function loadServices() {
    const response = await fetch("/api/services");
    const data = await response.json();
    setServices(data.services ?? []);
  }

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  useEffect(() => {
    loadServices();
  }, []);

  async function handleCreateAppointment(event: React.FormEvent) {
    event.preventDefault();

    if (!time || !serviceId) return;

    const startAt = `${selectedDate}T${time}:00`;

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        serviceId,
        startAt,
      }),
    });

    if (response.status === 409) {
      const data = await response.json();
      setSlotsModal({
        title: "Horário indisponível",
        message: data?.error ?? "Horário indisponível.",
        alternatives: data?.alternatives ?? [],
      });
      return;
    }

    setClientName("");
    setTime("");
    setServiceId("");

    await loadAppointments();
  }

  async function handleUpdateAppointment(id: string, action: string, payload: Record<string, unknown> = {}) {
    const response = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });

    if (response.status === 409) {
      const data = await response.json();
      setSlotsModal({
        title: "Horário indisponível",
        message: data?.error ?? "Horário indisponível.",
        alternatives: data?.alternatives ?? [],
      });
      return;
    }

    await loadAppointments();
  }

  async function handleReschedule(appointment: Appointment) {
    const newTime = window.prompt(
      "Nova data e hora (YYYY-MM-DD HH:mm):",
      formatPromptDateTime(appointment.startAt)
    );
    if (!newTime) return;
    const [datePart, timePart] = newTime.split(" ");
    const normalized = `${datePart}T${timePart}:00`;

    const response = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", startAt: normalized }),
    });

    if (response.status === 409) {
      const data = await response.json();
      setSlotsModal({
        title: "Horário indisponível",
        message: data?.error ?? "Horário indisponível.",
        alternatives: data?.alternatives ?? [],
      });
      return;
    }

    await loadAppointments();
  }

  async function handleShowAvailableTimes() {
    if (!serviceId || !selectedDate) {
      setSlotsModal({
        title: "Selecione os dados",
        message: "Escolha o serviço e a data para ver horários.",
        alternatives: [],
      });
      return;
    }

    const response = await fetch(
      `/api/availability?date=${selectedDate}&serviceId=${serviceId}`
    );
    const data = await response.json();
    setSlotsModal({
      title: "Horários disponíveis",
      message: "Escolha um horário para preencher o agendamento.",
      alternatives: data?.slots ?? [],
    });
  }

  function handlePickAlternative(value: string) {
    const timePart = value.split("T")[1]?.slice(0, 5);
    if (timePart) {
      setTime(timePart);
    }
    setSlotsModal(null);
  }

  function handleEditAppointment(appointment: Appointment) {
    const dateTime = formatPromptDateTime(appointment.startAt);
    const [datePart, timePart] = dateTime.split(" ");
    setEditModal({
      id: appointment.id,
      clientName: appointment.clientName,
      serviceId: appointment.serviceId ?? "",
      date: datePart,
      time: timePart,
    });
  }

  async function handleSaveEdit() {
    if (!editModal) return;
    const startAt = `${editModal.date}T${editModal.time}:00`;

    await handleUpdateAppointment(editModal.id, "update", {
      clientName: editModal.clientName,
      serviceId: editModal.serviceId,
      startAt,
    });

    setEditModal(null);
  }

  return (
    <div className="min-h-screen px-6 py-10">
      {slotsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="text-lg font-semibold">{slotsModal.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{slotsModal.message}</p>
            <div className="mt-4 space-y-2">
              {slotsModal.alternatives.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Não há outros horários disponíveis hoje.
                </p>
              ) : (
                slotsModal.alternatives.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handlePickAlternative(slot)}
                    className="w-full cursor-pointer rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:border-emerald-300"
                  >
                    {formatDateTime(slot)}
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setSlotsModal(null)}
              className="mt-4 w-full cursor-pointer rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {editModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="text-lg font-semibold">Editar atendimento</h3>
            <div className="mt-4 space-y-3">
              <input
                value={editModal.clientName}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev ? { ...prev, clientName: event.target.value } : prev
                  )
                }
                placeholder="Cliente"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              />
              <select
                value={editModal.serviceId}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev ? { ...prev, serviceId: event.target.value } : prev
                  )
                }
                className="w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              >
                <option value="">Selecione o serviço</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} • {formatCurrency(service.priceCents)}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={editModal.date}
                  onChange={(event) =>
                    setEditModal((prev) =>
                      prev ? { ...prev, date: event.target.value } : prev
                    )
                  }
                  className="w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
                />
                <input
                  type="time"
                  value={editModal.time}
                  onChange={(event) =>
                    setEditModal((prev) =>
                      prev ? { ...prev, time: event.target.value } : prev
                    )
                  }
                  className="w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="flex-1 cursor-pointer rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editModal.serviceId}
                className="flex-1 cursor-pointer rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Agenda</p>
          <h1 className="text-3xl font-semibold text-gradient">Controle de atendimentos</h1>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100"
        />
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Agenda do dia</h2>
            <span className="text-sm text-slate-400">
              {loadingAppointments ? "Carregando..." : `${appointments.length} atendimentos`}
            </span>
          </div>

          <form onSubmit={handleCreateAppointment} className="mt-6 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Cliente"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            />
            <select
              required
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="">Selecione o serviço</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} • {formatCurrency(service.priceCents)}
                </option>
              ))}
            </select>
            <input
              required
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={handleShowAvailableTimes}
              className="sm:col-span-2 cursor-pointer rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 transition hover:border-emerald-300"
            >
              Ver horários disponíveis
            </button>
            <button
              type="submit"
              className="sm:col-span-2 cursor-pointer rounded-2xl bg-emerald-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
            >
              Agendar
            </button>
          </form>
          {services.length === 0 ? (
            <p className="mt-3 text-sm text-amber-200">
              Cadastre pelo menos um serviço para começar a agendar.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          {appointmentDay.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum atendimento para hoje.</p>
          ) : (
            appointmentDay.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">{formatDateTime(appointment.startAt)}</p>
                    <p className="text-lg font-semibold">{appointment.clientName}</p>
                    <p className="text-sm text-slate-400">
                      {appointment.serviceName ?? "Serviço"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {appointment.durationMinutes} min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Valor</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(appointment.priceCents)}
                    </p>
                    <p
                      className={`text-xs uppercase tracking-wide ${
                        appointment.status === "COMPLETED"
                          ? "text-emerald-300"
                          : appointment.status === "CANCELLED"
                          ? "text-rose-300"
                          : "text-amber-300"
                      }`}
                    >
                      {appointment.status === "COMPLETED"
                        ? "Concluído"
                        : appointment.status === "CANCELLED"
                        ? "Cancelado"
                        : "Agendado"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleUpdateAppointment(appointment.id, "complete")}
                    type="button"
                    className="cursor-pointer rounded-full border border-emerald-400 px-3 py-1 text-emerald-200"
                    disabled={appointment.status !== "SCHEDULED"}
                  >
                    Concluir
                  </button>
                  <button
                    onClick={() => handleUpdateAppointment(appointment.id, "cancel")}
                    type="button"
                    className="cursor-pointer rounded-full border border-rose-400 px-3 py-1 text-rose-200"
                    disabled={appointment.status !== "SCHEDULED"}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleReschedule(appointment)}
                    type="button"
                    className="cursor-pointer rounded-full border border-slate-500 px-3 py-1 text-slate-200"
                  >
                    Reagendar
                  </button>
                  <button
                    onClick={() => handleEditAppointment(appointment)}
                    type="button"
                    className="cursor-pointer rounded-full border border-slate-500 px-3 py-1 text-slate-200"
                  >
                    Editar
                  </button>
                </div>
                {appointment.reschedules.length > 0 ? (
                  <div className="mt-3 text-xs text-slate-400">
                    Reagendamentos:{" "}
                    {appointment.reschedules.map((reschedule) => (
                      <span key={reschedule.id} className="block">
                        {formatDateTime(reschedule.fromAt)} → {formatDateTime(reschedule.toAt)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
