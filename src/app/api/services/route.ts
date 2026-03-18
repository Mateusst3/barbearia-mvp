import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const priceCents = Number(body?.priceCents ?? 0);
  const durationMinutes = Number(body?.durationMinutes ?? 30);

  if (!name || !Number.isFinite(priceCents) || !Number.isFinite(durationMinutes)) {
    return NextResponse.json(
      { error: "Nome e valor são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const service = await prisma.service.create({
      data: {
        userId: user.id,
        name,
        priceCents,
        durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 30,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Serviço já cadastrado." },
      { status: 409 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Serviço inválido." }, { status: 400 });
  }

  await prisma.service.deleteMany({
    where: {
      id,
      userId: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
