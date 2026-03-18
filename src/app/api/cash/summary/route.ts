import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return startOfDay(monday);
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const sunday = new Date(start);
  sunday.setDate(start.getDate() + 6);
  return endOfDay(sunday);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const now = new Date();

  async function sumRange(start: Date, end: Date) {
    const [income, expense] = await Promise.all([
      prisma.cashEntry.aggregate({
        where: {
          userId: user.id,
          type: "INCOME",
          occurredAt: {
            gte: start,
            lte: end,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.cashEntry.aggregate({
        where: {
          userId: user.id,
          type: "EXPENSE",
          occurredAt: {
            gte: start,
            lte: end,
          },
        },
        _sum: { amountCents: true },
      }),
    ]);

    const incomeTotal = income._sum.amountCents ?? 0;
    const expenseTotal = expense._sum.amountCents ?? 0;

    return {
      income: incomeTotal,
      expense: expenseTotal,
      net: incomeTotal - expenseTotal,
    };
  }

  const [daily, weekly, monthly] = await Promise.all([
    sumRange(startOfDay(now), endOfDay(now)),
    sumRange(startOfWeek(now), endOfWeek(now)),
    sumRange(startOfMonth(now), endOfMonth(now)),
  ]);

  return NextResponse.json({
    daily,
    weekly,
    monthly,
  });
}
