import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const barbers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ barbers });
}
