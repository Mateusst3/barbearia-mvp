import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const settings = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      workStartHour: true,
      workEndHour: true,
      slotMinutes: true,
    },
  });

  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const workStartHour = Number(body?.workStartHour ?? 9);
  const workEndHour = Number(body?.workEndHour ?? 19);
  const slotMinutes = Number(body?.slotMinutes ?? 30);

  if (!Number.isFinite(workStartHour) || !Number.isFinite(workEndHour)) {
    return NextResponse.json({ error: "Horário inválido." }, { status: 400 });
  }

  if (workEndHour <= workStartHour) {
    return NextResponse.json(
      { error: "Hora final deve ser maior que a inicial." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      workStartHour,
      workEndHour,
      slotMinutes: Number.isFinite(slotMinutes) ? slotMinutes : 30,
    },
    select: {
      workStartHour: true,
      workEndHour: true,
      slotMinutes: true,
    },
  });

  return NextResponse.json({ settings: updated });
}
