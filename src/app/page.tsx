"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency, formatDateTime } from "@/lib/format";
import PublicNav from "@/components/PublicNav";
import AvailabilityPicker from "@/components/AvailabilityPicker";

interface Barber {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  clientName: string;
  serviceName?: string | null;
  durationMinutes: number;
  startAt: string;
  priceCents: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
}

interface Service {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState("");
  const [clientName, setClientName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [barberAgenda, setBarberAgenda] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slotsModal, setSlotsModal] = useState<{
    title: string;
    message: string;
    alternatives: string[];
  } | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const selectedBarberName = useMemo(
    () => barbers.find((barber) => barber.id === selectedBarber)?.name ?? "",
    [barbers, selectedBarber]
  );

  useEffect(() => {
    async function loadBarbers() {
      setLoading(true);
      const response = await fetch("/api/public/barbers");
      const data = await response.json();
      setBarbers(data.barbers ?? []);
      setLoading(false);
    }

    loadBarbers();
  }, []);

  useEffect(() => {
    if (searchParams.get("login") === "1") {
      setLoginModalOpen(true);
    }
    if (searchParams.get("register") === "1") {
      setRegisterModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadAgenda() {
      if (!selectedBarber || !date) {
        setBarberAgenda([]);
        return;
      }
      const response = await fetch(
        `/api/public/appointments?barberId=${selectedBarber}&date=${date}`
      );
      const data = await response.json();
      setBarberAgenda(data.appointments ?? []);
    }

    loadAgenda();
  }, [selectedBarber, date]);

  useEffect(() => {
    async function loadServices() {
      if (!selectedBarber) {
        setServices([]);
        setServiceId("");
        return;
      }

      const response = await fetch(`/api/public/services?barberId=${selectedBarber}`);
      const data = await response.json();
      setServices(data.services ?? []);
    }

    loadServices();
  }, [selectedBarber]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!date || !time) {
      setMessage("Selecione um horário para continuar.");
      return;
    }

    const startAt = `${date}T${time}:00`;

    const response = await fetch("/api/public/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId: selectedBarber,
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

    if (!response.ok) {
      const data = await response.json();
      setMessage(data?.error ?? "Não foi possível agendar.");
      return;
    }

    setClientName("");
    setTime("");
    setServiceId("");
    setMessage("Agendamento criado com sucesso!");

    if (date) {
      const data = await response.json();
      if (data?.appointment) {
        setBarberAgenda((prev) => [...prev, data.appointment]);
      }
    }
  }

  function handlePickAlternative(value: string) {
    const timePart = value.split("T")[1]?.slice(0, 5);
    const datePart = value.split("T")[0];
    if (timePart) {
      setTime(timePart);
    }
    if (datePart) {
      setDate(datePart);
    }
    setSlotsModal(null);
  }

  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    setLoginLoading(false);

    if (result?.error) {
      setLoginError("Email ou senha inválidos.");
      return;
    }

    setLoginModalOpen(false);
    setLoginEmail("");
    setLoginPassword("");
    router.push("/dashboard");
  }

  async function handleRegisterSubmit(event: React.FormEvent) {
    event.preventDefault();
    setRegisterError("");
    setRegisterLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setRegisterLoading(false);
      setRegisterError(data?.error ?? "Erro ao cadastrar.");
      return;
    }

    const result = await signIn("credentials", {
      email: registerEmail,
      password: registerPassword,
      redirect: false,
    });

    setRegisterLoading(false);

    if (result?.error) {
      setRegisterError("Falha ao autenticar.");
      return;
    }

    setRegisterModalOpen(false);
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <PublicNav />
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
                    className="w-full cursor-pointer rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:border-amber-300"
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
      {loginModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="text-lg font-semibold">Entrar</h3>
            <p className="mt-2 text-sm text-slate-400">
              Acesse sua conta para gerenciar a barbearia.
            </p>
            <form onSubmit={handleLoginSubmit} className="mt-4 grid gap-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              />
              <input
                type="password"
                required
                placeholder="Senha"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              />
              {loginError ? (
                <p className="text-sm text-rose-400">{loginError}</p>
              ) : null}
              <button
                type="submit"
                disabled={loginLoading}
                className="cursor-pointer rounded-2xl bg-amber-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setLoginModalOpen(false);
                  setRegisterModalOpen(true);
                }}
                className="cursor-pointer text-amber-300 hover:text-amber-200"
              >
                Criar conta
              </button>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="cursor-pointer text-slate-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {registerModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="text-lg font-semibold">Criar conta</h3>
            <p className="mt-2 text-sm text-slate-400">
              Crie sua conta para gerenciar a barbearia.
            </p>
            <form onSubmit={handleRegisterSubmit} className="mt-4 grid gap-3">
              <input
                type="text"
                required
                placeholder="Nome"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              />
              <input
                type="email"
                required
                placeholder="Email"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              />
              <input
                type="password"
                required
                placeholder="Senha"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              />
              {registerError ? (
                <p className="text-sm text-rose-400">{registerError}</p>
              ) : null}
              <button
                type="submit"
                disabled={registerLoading}
                className="cursor-pointer rounded-2xl bg-amber-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {registerLoading ? "Criando..." : "Criar conta"}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setRegisterModalOpen(false);
                  setLoginModalOpen(true);
                }}
                className="cursor-pointer text-amber-300 hover:text-amber-200"
              >
                Já tenho conta
              </button>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="cursor-pointer text-slate-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="px-6 py-12">
      <header className="mx-auto max-w-6xl">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">CorteCerto</p>
        <h1 className="mt-4 text-4xl font-semibold text-gradient">
          Agende seu horário com os melhores barbeiros
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Escolha um barbeiro, selecione o serviço e confirme o atendimento sem precisar criar conta.
        </p>
      </header>

      <section className="mx-auto mt-10 grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Barbeiros disponíveis</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Carregando...</p>
          ) : barbers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Nenhum barbeiro cadastrado ainda.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  type="button"
                  onClick={() => setSelectedBarber(barber.id)}
                  className={`cursor-pointer rounded-2xl border px-4 py-3 text-left transition ${
                    selectedBarber === barber.id
                      ? "border-amber-300 bg-amber-300/10"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-600"
                  }`}
                >
                  <p className="text-base font-semibold">{barber.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Agendar atendimento</h2>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <select
              value={selectedBarber}
              onChange={(event) => setSelectedBarber(event.target.value)}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
              required
            >
              <option value="">Selecione o barbeiro</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Seu nome"
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
                  {service.name} • {formatCurrency(service.priceCents)} • {service.durationMinutes} min
                </option>
              ))}
            </select>
            {selectedBarber && services.length === 0 ? (
              <p className="text-sm text-amber-200">
                Este barbeiro ainda não cadastrou serviços.
              </p>
            ) : null}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              {date && time ? (
                <>
                  Horário escolhido:{" "}
                  <span className="font-semibold text-slate-100">
                    {formatDateTime(`${date}T${time}:00`)}
                  </span>
                </>
              ) : (
                "Selecione um horário abaixo para continuar."
              )}
            </div>
            {selectedBarber && serviceId ? (
              <AvailabilityPicker
                barberId={selectedBarber}
                serviceId={serviceId}
                onSelect={(slot) => handlePickAlternative(slot)}
              />
            ) : null}
            {message ? <p className="text-sm text-amber-200">{message}</p> : null}
            <button
              type="submit"
              className="cursor-pointer rounded-2xl bg-amber-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
            >
              Confirmar agendamento
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Agenda pública</h2>
            <span className="text-sm text-slate-400">
              {selectedBarberName
                ? `Agenda de ${selectedBarberName}`
                : "Selecione um barbeiro"}
            </span>
          </div>
          {selectedBarber && date ? (
            <div className="mt-4 space-y-3">
              {barberAgenda.length === 0 ? (
                <p className="text-sm text-slate-400">Sem horários para esse dia.</p>
              ) : (
                barberAgenda.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">
                          {formatDateTime(appointment.startAt)}
                        </p>
                        <p className="text-base font-semibold">{appointment.clientName}</p>
                        <p className="text-sm text-slate-400">
                          {appointment.serviceName ?? "Serviço"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {appointment.durationMinutes} min
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCurrency(appointment.priceCents)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              Selecione um barbeiro e uma data para ver a agenda.
            </p>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
