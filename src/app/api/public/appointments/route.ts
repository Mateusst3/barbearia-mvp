import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildAvailableStartTimes,
  extractDate,
  hasConflict,
  isWithinSchedule,
} from "@/lib/availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get("barberId");
  const date = searchParams.get("date");

  if (!barberId || !date) {
    return NextResponse.json(
      { error: "Barbeiro e data são obrigatórios." },
      { status: 400 }
    );
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59.999`);

  const appointments = await prisma.appointment.findMany({
    where: {
      userId: barberId,
      startAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  const body = await request.json();
  const barberId = String(body?.barberId ?? "").trim();
  const clientName = String(body?.clientName ?? "").trim();
  const serviceId = String(body?.serviceId ?? "").trim();
  const startAt = String(body?.startAt ?? "");

  if (!barberId || !clientName || !serviceId || !startAt) {
    return NextResponse.json(
      { error: "Dados do agendamento incompletos." },
      { status: 400 }
    );
  }

  const barber = await prisma.user.findUnique({ where: { id: barberId } });
  if (!barber) {
    return NextResponse.json({ error: "Barbeiro não encontrado." }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, userId: barberId },
  });

  if (!service) {
    return NextResponse.json({ error: "Serviço inválido." }, { status: 400 });
  }

  const settings = await prisma.user.findUnique({
    where: { id: barberId },
    select: { workStartHour: true, workEndHour: true, slotMinutes: true },
  });
  const schedule = {
    startHour: settings?.workStartHour ?? 9,
    endHour: settings?.workEndHour ?? 19,
    slotMinutes: settings?.slotMinutes ?? 30,
  };

  const startDate = new Date(startAt);
  if (!isWithinSchedule(startDate, service.durationMinutes, schedule)) {
    return NextResponse.json(
      { error: "Horário fora da agenda configurada." },
      { status: 400 }
    );
  }
  const date = extractDate(startAt);
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59.999`);
  const dayAppointments = await prisma.appointment.findMany({
    where: {
      userId: barberId,
      startAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    select: { startAt: true, durationMinutes: true },
  });

  if (hasConflict(startDate, service.durationMinutes, dayAppointments)) {
    const alternatives = buildAvailableStartTimes(
      date,
      dayAppointments,
      schedule,
      service.durationMinutes
    ).slice(0, 5);

    return NextResponse.json(
      { error: "Horário já reservado.", alternatives },
      { status: 409 }
    );
  }

  const appointment = await prisma.appointment.create({
    data: {
      userId: barberId,
      clientName,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      startAt: startDate,
      priceCents: service.priceCents,
    },
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
