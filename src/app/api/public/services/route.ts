import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get("barberId");

  if (!barberId) {
    return NextResponse.json(
      { error: "Barbeiro é obrigatório." },
      { status: 400 }
    );
  }

  const services = await prisma.service.findMany({
    where: { userId: barberId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ services });
}
