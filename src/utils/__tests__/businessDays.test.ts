import { describe, it, expect } from 'vitest';
import {
  isColombianHoliday,
  isBusinessDay,
  calculatePqrBusinessDays,
  parseDateOnly,
  addBusinessDays,
  countBusinessDaysBetween,
} from '../businessDays';

describe('businessDays utility (Colombia)', () => {
  it('detecta festivos fijos de Colombia', () => {
    // 1 de Enero (Año Nuevo)
    expect(isColombianHoliday(new Date(2026, 0, 1))).toBe(true);
    // 1 de Mayo (Trabajo)
    expect(isColombianHoliday(new Date(2026, 4, 1))).toBe(true);
    // 20 de Julio (Independencia)
    expect(isColombianHoliday(new Date(2026, 6, 20))).toBe(true);
    // 7 de Agosto (Boyacá)
    expect(isColombianHoliday(new Date(2026, 7, 7))).toBe(true);
    // 25 de Diciembre (Navidad)
    expect(isColombianHoliday(new Date(2026, 11, 25))).toBe(true);
  });

  it('detecta festivos trasladados por Ley Emiliani (Lunes)', () => {
    // 6 de Enero 2026 cae en martes -> se traslada al lunes 12 de Enero
    expect(isColombianHoliday(new Date(2026, 0, 12))).toBe(true);
    // 19 de Marzo 2026 cae en jueves -> se traslada al lunes 23 de Marzo
    expect(isColombianHoliday(new Date(2026, 2, 23))).toBe(true);
  });

  it('detecta Semana Santa y festivos religiosos', () => {
    // En 2026, Pascua es 5 de Abril:
    // Jueves Santo: 2 de Abril 2026
    expect(isColombianHoliday(new Date(2026, 3, 2))).toBe(true);
    // Viernes Santo: 3 de Abril 2026
    expect(isColombianHoliday(new Date(2026, 3, 3))).toBe(true);
  });

  it('identifica correctamente días hábiles (excluye fines de semana y festivos)', () => {
    // Sábado 4 de Abril 2026
    expect(isBusinessDay(new Date(2026, 3, 4))).toBe(false);
    // Domingo 5 de Abril 2026
    expect(isBusinessDay(new Date(2026, 3, 5))).toBe(false);
    // Viernes Santo 3 de Abril 2026 (festivo)
    expect(isBusinessDay(new Date(2026, 3, 3))).toBe(false);
    // Lunes 6 de Abril 2026 (día hábil normal)
    expect(isBusinessDay(new Date(2026, 3, 6))).toBe(true);
  });

  it('parseDateOnly extrae la fecha ignorando la hora', () => {
    const d1 = parseDateOnly('07/05/2026 16:18:56.53');
    expect(d1).not.toBeNull();
    expect(d1?.getDate()).toBe(7);
    expect(d1?.getMonth()).toBe(4); // Mayo = 4
    expect(d1?.getFullYear()).toBe(2026);
    expect(d1?.getHours()).toBe(0);
  });

  it('addBusinessDays suma únicamente días hábiles descontando festivos y fines de semana', () => {
    // Jueves 30 de Abril 2026
    // Viernes 1 Mayo (Festivo Trabajo), Sab 2, Dom 3, Lun 4 (H1), Mar 5 (H2)
    const start = new Date(2026, 3, 30);
    const due = addBusinessDays(start, 2);
    expect(due.getDate()).toBe(5);
    expect(due.getMonth()).toBe(4); // Mayo
  });

  it('calculatePqrBusinessDays calcula 15 días hábiles a partir de la fecha de radicación', () => {
    // Radicación: 07/05/2026 16:18:56.53
    // Si la referencia es la misma fecha de radicación: le deben quedar 15 días hábiles
    const pqr = calculatePqrBusinessDays('07/05/2026 16:18:56.53', 15, '07/05/2026');
    expect(pqr.remainingDays).toBe(15);
    expect(pqr.label).toContain('15 días hábiles');
    expect(pqr.isExpired).toBe(false);
  });
});
