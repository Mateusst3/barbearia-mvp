function toTwo(value: number) {
  return String(value).padStart(2, "0");
}

type AppointmentSlot = {
  startAt: Date;
  durationMinutes: number;
  id?: string;
};

function overlaps(startA: Date, durationA: number, startB: Date, durationB: number) {
  const endA = new Date(startA.getTime() + durationA * 60000);
  const endB = new Date(startB.getTime() + durationB * 60000);
  return startA < endB && endA > startB;
}

export function hasConflict(
  startAt: Date,
  durationMinutes: number,
  appointments: AppointmentSlot[],
  ignoreId?: string
) {
  return appointments.some((appointment) => {
    if (ignoreId && appointment.id === ignoreId) return false;
    return overlaps(startAt, durationMinutes, appointment.startAt, appointment.durationMinutes);
  });
}

export function buildAvailableStartTimes(
  date: string,
  appointments: AppointmentSlot[],
  options: { startHour: number; endHour: number; slotMinutes: number },
  desiredDuration: number
) {
  const slots: string[] = [];
  const startHour = options.startHour;
  const endHour = options.endHour;
  const slotMinutes = options.slotMinutes;

  for (let hour = startHour; hour < endHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += slotMinutes) {
      const slot = `${date}T${toTwo(hour)}:${toTwo(minute)}`;
      const startAt = new Date(`${slot}:00`);
      const endAt = new Date(startAt.getTime() + desiredDuration * 60000);
      const withinSchedule = endAt.getHours() < endHour || (endAt.getHours() === endHour && endAt.getMinutes() === 0);
      if (!withinSchedule) continue;
      if (!hasConflict(startAt, desiredDuration, appointments)) {
        slots.push(`${slot}:00`);
      }
    }
  }

  return slots;
}

export function extractDate(value: string) {
  return value.split("T")[0];
}

export function isWithinSchedule(
  dateTime: Date,
  durationMinutes: number,
  options: { startHour: number; endHour: number; slotMinutes: number }
) {
  const hour = dateTime.getHours();
  const minute = dateTime.getMinutes();
  const inRange = hour >= options.startHour && hour < options.endHour;
  const aligned = minute % options.slotMinutes === 0;
  const endAt = new Date(dateTime.getTime() + durationMinutes * 60000);
  const endHour = endAt.getHours();
  const endMinute = endAt.getMinutes();
  const withinEnd =
    endHour < options.endHour || (endHour === options.endHour && endMinute === 0);
  return inRange && aligned && withinEnd;
}
