import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAvailableStartTimes } from "@/lib/availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const barberId = searchParams.get("barberId");

  if (!date || !serviceId || !barberId) {
    return NextResponse.json(
      { error: "Barbeiro, serviço e data são obrigatórios." },
      { status: 400 }
    );
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

  const slots = buildAvailableStartTimes(
    date,
    dayAppointments,
    schedule,
    service.durationMinutes
  );

  return NextResponse.json({ slots });
}
