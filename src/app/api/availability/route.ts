import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { buildAvailableStartTimes } from "@/lib/availability";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!date || !serviceId) {
    return NextResponse.json(
      { error: "Data e serviço são obrigatórios." },
      { status: 400 }
    );
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, userId: user.id },
  });

  if (!service) {
    return NextResponse.json({ error: "Serviço inválido." }, { status: 400 });
  }

  const settings = await prisma.user.findUnique({
    where: { id: user.id },
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
      userId: user.id,
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
