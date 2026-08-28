// Utility for Colombian Business Days and Holidays (Ley Emiliani)

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day, 0, 0, 0, 0);
}

function nextMonday(date: Date): Date {
  const d = new Date(date.getTime());
  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  if (dayOfWeek === 1) return d;
  const daysToAdd = (8 - dayOfWeek) % 7 || 7;
  d.setDate(d.getDate() + daysToAdd);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getColombianHolidaysForYear(year: number): Set<string> {
  const holidays = new Set<string>();

  // 1. Feriados Fijos
  holidays.add(dateKey(new Date(year, 0, 1))); // Año Nuevo (1 Ene)
  holidays.add(dateKey(new Date(year, 4, 1))); // Día del Trabajo (1 May)
  holidays.add(dateKey(new Date(year, 6, 20))); // Independencia de Colombia (20 Jul)
  holidays.add(dateKey(new Date(year, 7, 7))); // Batalla de Boyacá (7 Ago)
  holidays.add(dateKey(new Date(year, 11, 8))); // Inmaculada Concepción (8 Dic)
  holidays.add(dateKey(new Date(year, 11, 25))); // Navidad (25 Dic)

  // 2. Feriados Ley Emiliani (trasladados al siguiente lunes)
  holidays.add(dateKey(nextMonday(new Date(year, 0, 6)))); // Reyes Magos (6 Ene)
  holidays.add(dateKey(nextMonday(new Date(year, 2, 19)))); // San José (19 Mar)
  holidays.add(dateKey(nextMonday(new Date(year, 5, 29)))); // San Pedro y San Pablo (29 Jun)
  holidays.add(dateKey(nextMonday(new Date(year, 7, 15)))); // Asunción de la Virgen (15 Ago)
  holidays.add(dateKey(nextMonday(new Date(year, 9, 12)))); // Día de la Raza (12 Oct)
  holidays.add(dateKey(nextMonday(new Date(year, 10, 1)))); // Todos los Santos (1 Nov)
  holidays.add(dateKey(nextMonday(new Date(year, 10, 11)))); // Independencia de Cartagena (11 Nov)

  // 3. Feriados relativos a Pascua (Semana Santa y fiestas religiosas)
  const easter = getEasterSunday(year);
  holidays.add(dateKey(addDays(easter, -3))); // Jueves Santo
  holidays.add(dateKey(addDays(easter, -2))); // Viernes Santo
  holidays.add(dateKey(nextMonday(addDays(easter, 43)))); // Ascensión del Señor
  holidays.add(dateKey(nextMonday(addDays(easter, 64)))); // Corpus Christi
  holidays.add(dateKey(nextMonday(addDays(easter, 71)))); // Sagrado Corazón de Jesús

  return holidays;
}

const holidaysCache: { [year: number]: Set<string> } = {};

export function isColombianHoliday(date: Date): boolean {
  const y = date.getFullYear();
  if (!holidaysCache[y]) {
    holidaysCache[y] = getColombianHolidaysForYear(y);
  }
  return holidaysCache[y]!.has(dateKey(date));
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

export function isBusinessDay(date: Date): boolean {
  if (isWeekend(date)) return false;
  if (isColombianHoliday(date)) return false;
  return true;
}

export function parseDateOnly(val: unknown): Date | null {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate(), 0, 0, 0, 0);
  }

  const str = String(val).trim();
  if (!str) return null;

  // Check Excel numeric serial date (e.g. 45000)
  if (!isNaN(Number(str)) && Number(str) > 10000 && Number(str) < 100000) {
    const d = new Date(Math.round((Number(str) - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
  }

  // Matches DD/MM/YYYY or DD-MM-YYYY (ignoring time like 16:18:56.53)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]!, 10);
    const month = parseInt(dmyMatch[2]!, 10) - 1;
    const year = parseInt(dmyMatch[3]!, 10);
    const d = new Date(year, month, day, 0, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Matches YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1]!, 10);
    const month = parseInt(ymdMatch[2]!, 10) - 1;
    const day = parseInt(ymdMatch[3]!, 10);
    const d = new Date(year, month, day, 0, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  let added = 0;
  while (added < businessDays) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current)) {
      added++;
    }
  }
  return current;
}

export function countBusinessDaysBetween(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
  if (s.getTime() === e.getTime()) return 0;

  const forward = e.getTime() > s.getTime();
  let count = 0;
  const current = new Date(s.getTime());

  if (forward) {
    while (current.getTime() < e.getTime()) {
      current.setDate(current.getDate() + 1);
      if (isBusinessDay(current)) {
        count++;
      }
    }
    return count;
  } else {
    while (current.getTime() > e.getTime()) {
      current.setDate(current.getDate() - 1);
      if (isBusinessDay(current)) {
        count--;
      }
    }
    return count;
  }
}

export interface PqrDaysInfo {
  remainingDays: number;
  dueDateStr: string;
  isExpired: boolean;
  label: string;
}

export function calculatePqrBusinessDays(
  fechaRadicacionVal: unknown,
  plazoDiasHabiles = 15,
  referenceDateVal?: unknown
): PqrDaysInfo {
  const radDate = parseDateOnly(fechaRadicacionVal);
  if (!radDate) {
    return {
      remainingDays: 0,
      dueDateStr: '—',
      isExpired: false,
      label: '—',
    };
  }

  const refDate = referenceDateVal ? parseDateOnly(referenceDateVal) || new Date() : new Date();
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);

  const dueDate = addBusinessDays(radDate, plazoDiasHabiles);
  const dueDateStr = `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()}`;

  const remaining = countBusinessDaysBetween(today, dueDate);
  const isExpired = remaining < 0;

  let label = '';
  if (remaining > 1) {
    label = `${remaining} días hábiles`;
  } else if (remaining === 1) {
    label = `1 día hábil`;
  } else if (remaining === 0) {
    label = `Vence hoy`;
  } else {
    label = `Vencido (${Math.abs(remaining)} d)`;
  }

  return {
    remainingDays: remaining,
    dueDateStr,
    isExpired,
    label,
  };
}
