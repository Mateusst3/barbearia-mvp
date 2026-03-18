import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import {
  buildAvailableStartTimes,
  extractDate,
  hasConflict,
  isWithinSchedule,
} from "@/lib/availability";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { cashEntry: true },
  });

  if (!appointment || appointment.userId !== user.id) {
    return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
  }

  const body = await request.json();
  const action = String(body?.action ?? "update");

  if (action === "cancel") {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ appointment: updated });
  }

  if (action === "complete") {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "COMPLETED" },
    });

    if (!appointment.cashEntry) {
      await prisma.cashEntry.create({
        data: {
          userId: user.id,
          appointmentId: appointment.id,
          type: "INCOME",
          amountCents: appointment.priceCents,
          description: `Atendimento: ${appointment.clientName}`,
          occurredAt: new Date(),
        },
      });
    }

    return NextResponse.json({ appointment: updated });
  }

  if (action === "reschedule") {
    const newStartAt = String(body?.startAt ?? "");
    if (!newStartAt) {
      return NextResponse.json(
        { error: "Nova data e hora são obrigatórias." },
        { status: 400 }
      );
    }

    const startDate = new Date(newStartAt);
    const settings = await prisma.user.findUnique({
      where: { id: user.id },
      select: { workStartHour: true, workEndHour: true, slotMinutes: true },
    });
    const schedule = {
      startHour: settings?.workStartHour ?? 9,
      endHour: settings?.workEndHour ?? 19,
      slotMinutes: settings?.slotMinutes ?? 30,
    };

    if (!isWithinSchedule(startDate, appointment.durationMinutes, schedule)) {
      return NextResponse.json(
        { error: "Horário fora da agenda configurada." },
        { status: 400 }
      );
    }
    const dayStart = new Date(`${extractDate(newStartAt)}T00:00:00`);
    const dayEnd = new Date(`${extractDate(newStartAt)}T23:59:59.999`);
    const dayAppointments = await prisma.appointment.findMany({
      where: {
        userId: user.id,
        startAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        NOT: { id: appointment.id },
      },
      select: { id: true, startAt: true, durationMinutes: true },
    });

    if (hasConflict(startDate, appointment.durationMinutes, dayAppointments)) {
      const date = extractDate(newStartAt);
      const alternatives = buildAvailableStartTimes(
        date,
        dayAppointments,
        schedule,
        appointment.durationMinutes
      ).slice(0, 5);

      return NextResponse.json(
        { error: "Horário já reservado.", alternatives },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.rescheduleHistory.create({
        data: {
          appointmentId: appointment.id,
          fromAt: appointment.startAt,
          toAt: startDate,
        },
      });

      return tx.appointment.update({
        where: { id: appointment.id },
        data: { startAt: startDate },
      });
    });

    return NextResponse.json({ appointment: updated });
  }

  const clientName = String(body?.clientName ?? appointment.clientName).trim();
  const serviceId = String(body?.serviceId ?? appointment.serviceId ?? "").trim();
  const startAt = body?.startAt ? new Date(String(body.startAt)) : appointment.startAt;
  let nextDurationMinutes = appointment.durationMinutes;

  if (serviceId) {
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: user.id,
      },
    });
    if (!service) {
      return NextResponse.json({ error: "Serviço inválido." }, { status: 400 });
    }
    nextDurationMinutes = service.durationMinutes;
  }

  if (body?.startAt || serviceId) {
    const settings = await prisma.user.findUnique({
      where: { id: user.id },
      select: { workStartHour: true, workEndHour: true, slotMinutes: true },
    });
    const schedule = {
      startHour: settings?.workStartHour ?? 9,
      endHour: settings?.workEndHour ?? 19,
      slotMinutes: settings?.slotMinutes ?? 30,
    };

    if (!isWithinSchedule(startAt, nextDurationMinutes, schedule)) {
      return NextResponse.json(
        { error: "Horário fora da agenda configurada." },
        { status: 400 }
      );
    }
    const date = extractDate(startAt.toISOString());
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);
    const dayAppointments = await prisma.appointment.findMany({
      where: {
        userId: user.id,
        startAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        NOT: { id: appointment.id },
      },
      select: { id: true, startAt: true, durationMinutes: true },
    });

    if (hasConflict(startAt, nextDurationMinutes, dayAppointments)) {
      const alternatives = buildAvailableStartTimes(
        date,
        dayAppointments,
        schedule,
        nextDurationMinutes
      ).slice(0, 5);

      return NextResponse.json(
        { error: "Horário já reservado.", alternatives },
        { status: 409 }
      );
    }
  }

  let serviceName = appointment.serviceName ?? "";
  let priceCents = appointment.priceCents;
  let durationMinutes = appointment.durationMinutes;
  let resolvedServiceId = appointment.serviceId;

  if (serviceId) {
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: user.id,
      },
    });
    if (!service) {
      return NextResponse.json({ error: "Serviço inválido." }, { status: 400 });
    }
    serviceName = service.name;
    priceCents = service.priceCents;
    durationMinutes = service.durationMinutes;
    resolvedServiceId = service.id;
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      clientName,
      serviceId: resolvedServiceId,
      serviceName,
      startAt,
      durationMinutes,
      priceCents,
    },
  });

  return NextResponse.json({ appointment: updated });
}
