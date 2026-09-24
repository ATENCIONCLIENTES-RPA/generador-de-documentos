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

  it('extractFirstName: dos apellidos + un nombre identifica el nombre', () => {
    // Antes tomaba el segundo apellido (MURILLO) como primer nombre
    expect(extractFirstName('CASTRO MURILLO JAIME')).toBe('Jaime');
    expect(extractFirstName('castro murillo jaime')).toBe('Jaime');
  });

  it('extractFirstName: dos apellidos + dos nombres identifica el primero', () => {
    expect(extractFirstName('CASTRO MURILLO JAIME ANDRÉS')).toBe('Jaime');
  });

  it('extractFirstName: un apellido + un nombre', () => {
    expect(extractFirstName('CASTRO JAIME')).toBe('Jaime');
  });

  it('extractFirstName: ignora partículas al buscar el nombre', () => {
    expect(extractFirstName('VILLEGAS SERNA OSCAR ORLANDO')).toBe('Oscar');
  });

  it('extractFirstName: empresa conserva la razón social sin la sigla jurídica', () => {
    expect(extractFirstName('INCOLYESOS SAS')).toBe('INCOLYESOS');
    expect(extractFirstName('INCOLYESOS S.A.S.')).toBe('INCOLYESOS');
    expect(extractFirstName('EMPRESA XYZ LTDA')).toBe('EMPRESA XYZ');
  });

  it('extractFirstName: empresa sin sigla pero con nombre comercial se conserva', () => {
    expect(extractFirstName('INDUSTRIA NACIONAL DE SNACKS SAS')).toBe(
      'INDUSTRIA NACIONAL DE SNACKS'
    );
    expect(extractFirstName('HG CONSTRUCTORA')).toBe('HG CONSTRUCTORA');
  });

  it('extractFirstName: dos apellidos iguales + nombre no sobrestima el apellido', () => {
    // Caso reportado: "Serrano Serrano Rosmira" -> Rosmira, no Serrano
    expect(extractFirstName('Serrano Serrano Rosmira')).toBe('Rosmira');
    expect(extractFirstName('SERRANO SERRANO ROSMIRA')).toBe('Rosmira');
    expect(extractFirstName('serrano serrano rosmira')).toBe('Rosmira');
  });

  it('formatApplicantName: dos apellidos iguales + nombre reordena', () => {
    expect(formatApplicantName('SERRANO SERRANO ROSMIRA')).toBe('Rosmira Serrano Serrano');
  });

  it('extractFirstName: respaldo estructural con nombre fuera del diccionario', () => {
    // Apellido conocido + nombre desconocido: nunca devolver el apellido
    expect(extractFirstName('SERRANO XYZQWE')).toBe('Xyzqwe');
    // Nombre desconocido en orden nombres-primero se conserva
    expect(extractFirstName('XYZQWE SERRANO SERRANO')).toBe('Xyzqwe');
  });

  it('formatApplicantName: solo apellidos no se rota', () => {
    expect(formatApplicantName('GARCIA LOPEZ')).toBe('Garcia Lopez');
  });

  it('formatApplicantName: dos apellidos + un nombre reordena', () => {
    expect(formatApplicantName('CASTRO MURILLO JAIME')).toBe('Jaime Castro Murillo');
  });

  it('formatApplicantName: empresas conservan la razón social completa', () => {
    expect(formatApplicantName('INCOLYESOS SAS')).toBe('INCOLYESOS');
    expect(formatApplicantName('INDUSTRIA NACIONAL DE SNACKS SAS')).toBe(
      'INDUSTRIA NACIONAL DE SNACKS'
    );
    expect(formatApplicantName('HG CONSTRUCTORA')).toBe('HG CONSTRUCTORA');
    expect(formatApplicantName('EMPRESA XYZ LTDA')).toBe('EMPRESA XYZ');
  });
});
