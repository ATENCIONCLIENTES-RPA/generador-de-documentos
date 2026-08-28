import { describe, it, expect } from 'vitest';
import {
  extractFirstName,
  formatApplicantName,
  getInitials,
  toTitleCase,
  cleanSpecialCharacters,
} from '../nameParser';

describe('nameParser', () => {
  it('extractFirstName extrae primer nombre', () => {
    expect(extractFirstName('Juan Carlos Pérez')).toBe('Juan');
  });

  it('formatApplicantName normaliza', () => {
    expect(formatApplicantName('juan carlos pérez')).toBe('Juan Carlos Pérez');
  });

  it('extractFirstName: apellidos primero 4 palabras', () => {
    expect(extractFirstName('CARRILLO PALACIO JUAN CARLOS')).toBe('Juan');
  });

  it('formatApplicantName: 4 palabras apellidos primero', () => {
    expect(formatApplicantName('CARRILLO PALACIO JUAN CARLOS')).toBe(
      'Juan Carlos Carrillo Palacio'
    );
  });

  it('extractFirstName: 3 palabras apellido + 2 nombres', () => {
    expect(extractFirstName('HERNANDEZ DIEGO FERNANDO')).toBe('Diego');
  });

  it('formatApplicantName: 3 palabras reordena', () => {
    expect(formatApplicantName('HERNANDEZ DIEGO FERNANDO')).toBe('Diego Fernando Hernandez');
  });

  it('extractFirstName: slash toma parte después', () => {
    expect(extractFirstName('ZAPATA JESUS/SERGIO')).toBe('Sergio');
  });

  it('extractFirstName: hyphen', () => {
    expect(extractFirstName('ZAPATA JESUS-SERGIO')).toBe('Sergio');
  });

  it('formatApplicantName: slash limpia', () => {
    expect(formatApplicantName('ZAPATA JESUS/SERGIO')).toBe('Zapata Jesus Sergio');
  });

  it('extractFirstName: GARCIA LOPEZ MARIA CAMILA', () => {
    expect(extractFirstName('GARCIA LOPEZ MARIA CAMILA')).toBe('Maria');
  });

  it('formatApplicantName: 4 palabras mujer', () => {
    expect(formatApplicantName('GARCIA LOPEZ MARIA CAMILA')).toBe('Maria Camila Garcia Lopez');
  });

  it('maneja vacío y null', () => {
    expect(extractFirstName('')).toBe('');
    expect(extractFirstName(null as unknown as string)).toBe('');
    expect(formatApplicantName('')).toBe('');
    expect(formatApplicantName(null as unknown as string)).toBe('');
  });

  it('toTitleCase respeta partículas', () => {
    expect(toTitleCase('RODRIGUEZ DE LA TORRE')).toBe('Rodriguez de la Torre');
  });

  it('cleanSpecialCharacters normaliza separadores', () => {
    expect(cleanSpecialCharacters('a/b\\c-d_e')).toBe('a b c d e');
  });

  it('getInitials extrae iniciales', () => {
    expect(getInitials('Juan Carlos Pérez')).toBe('JP');
    expect(getInitials('Maria')).toBe('M');
    expect(getInitials('')).toBe('');
  });

  it('extractFirstName 2 palabras apellido+nombre', () => {
    // GOMEZ JUAN -> surname + given => returns given
    expect(extractFirstName('GOMEZ JUAN')).toBe('Juan');
  });

  it('formatApplicantName 2 palabras apellido+nombre invierte', () => {
    expect(formatApplicantName('GOMEZ JUAN')).toBe('Juan Gomez');
  });
});
