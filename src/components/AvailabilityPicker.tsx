"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface AvailabilityPickerProps {
  barberId: string;
  serviceId: string;
  onSelect: (value: string) => void;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function AvailabilityPicker({ barberId, serviceId, onSelect }: AvailabilityPickerProps) {
  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => addDays(now, index));
  }, []);

  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      if (!barberId || !serviceId) return;
      setLoading(true);
      const date = toDateString(selectedDay);
      const response = await fetch(
        `/api/public/availability?barberId=${barberId}&serviceId=${serviceId}&date=${date}`
      );
      const data = await response.json();
      setSlots(data.slots ?? []);
      setLoading(false);
    }

    loadSlots();
  }, [barberId, serviceId, selectedDay]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {days.map((day) => {
          const label = day.toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          });
          const isActive = day.toDateString() === selectedDay.toDateString();
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-wide transition ${
                isActive
                  ? "bg-amber-300 text-slate-900"
                  : "border border-slate-800 text-slate-200 hover:border-amber-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">Carregando horários...</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-400">Sem horários para esse dia.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onSelect(slot)}
                className="rounded-2xl border border-slate-800 px-3 py-2 text-sm text-slate-100 transition hover:border-amber-300"
              >
                {formatDateTime(slot)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
