import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  let whereDate = {};
  if (date) {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);
    whereDate = { occurredAt: { gte: dayStart, lte: dayEnd } };
  }

  const entries = await prisma.cashEntry.findMany({
    where: {
      userId: user.id,
      ...whereDate,
    },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const type = String(body?.type ?? "INCOME");
  const amountCents = Number(body?.amountCents ?? 0);
  const description = String(body?.description ?? "").trim();
  const occurredAt = body?.occurredAt ? new Date(String(body.occurredAt)) : new Date();

  if (!description || !Number.isFinite(amountCents)) {
    return NextResponse.json(
      { error: "Descrição e valor são obrigatórios." },
      { status: 400 }
    );
  }

  const entry = await prisma.cashEntry.create({
    data: {
      userId: user.id,
      type: type === "EXPENSE" ? "EXPENSE" : "INCOME",
      amountCents,
      description,
      occurredAt,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
