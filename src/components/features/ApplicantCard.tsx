import { useState, type FocusEvent } from 'react';
import { useDataStore } from '@/store/dataStore';
import Input from '@/components/ui/Input';
import { formatApplicantName, toTitleCaseInline } from '@/utils/nameParser';
import type { Record as EssaRecord } from '@/types/record';

interface ApplicantFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  testSuffix: string;
}

const FIELDS: ApplicantFieldConfig[] = [
  {
    key: 'nombreSolicitante',
    label: 'Nombre',
    placeholder: 'Nombre completo',
    testSuffix: 'nombre',
  },
  {
    key: 'RADICADO_SALIDA',
    label: 'Radicado salida',
    placeholder: 'Radicado de salida',
    testSuffix: 'radicado-salida',
  },
  {
    key: 'direccionSolicitante',
    label: 'Dirección',
    placeholder: 'Dirección',
    testSuffix: 'direccion',
  },
  {
    key: 'departamentoSolicitante',
    label: 'Departamento',
    placeholder: 'Departamento',
    testSuffix: 'departamento',
  },
  {
    key: 'municipioSolicitante',
    label: 'Municipio',
    placeholder: 'Municipio',
    testSuffix: 'municipio',
  },
  {
    key: 'correoSolicitante',
    label: 'Correo',
    placeholder: 'correo@ejemplo.com',
    type: 'email',
    testSuffix: 'correo',
  },
];

/** Franja de información del solicitante (Módulo 4, bajo el banner).
 *  Edita los datos del registro seleccionado con persistencia directa
 *  en el store, igual que el Módulo 3. */
export function ApplicantCard() {
  const records = useDataStore((s) => s.records);
  const selectedRows = useDataStore((s) => s.selectedRows);
  const editRecord = useDataStore((s) => s.editRecord);
  /** Texto en edición del campo "Nombre" (null = sin foco). Al enfocar se
   *  parte del nombre ya normalizado y mientras se escribe solo se ajusta
   *  la caja: el texto nunca salta ni se recortan los espacios. */
  const [nombreEdit, setNombreEdit] = useState<string | null>(null);

  const selectedRecord: EssaRecord | null =
    records && records.length > 0 && selectedRows.size > 0
      ? (((records as EssaRecord[]).find(
          (r) => (r as unknown as { rowId: string }).rowId === Array.from(selectedRows)[0]
        ) as EssaRecord) ?? null)
      : null;

  if (!selectedRecord) {
    return (
      <div className="dg-applicant dg-applicant--empty" data-testid="dg-applicant-empty">
        <style>{applicantStyles}</style>
        <div className="dg-applicant-empty-text">
          Selecciona un registro en el Módulo 3 para ver y editar la información del solicitante
        </div>
      </div>
    );
  }

  const rowId = (selectedRecord as unknown as { rowId: string }).rowId;
  const rec = selectedRecord as unknown as Record<string, unknown>;

  const nombreBruto = String(rec['nombreSolicitante'] ?? '');
  // Sin foco: el nombre completo con el mismo formato que usa el documento
  // Word. Con foco: el texto en edición, con la caja normalizada en vivo.
  const nombreVisible =
    nombreEdit !== null ? toTitleCaseInline(nombreEdit) : formatApplicantName(nombreBruto);

  // El "Nombre" arranca desde el valor ya normalizado (no hay salto de texto
  // al entrar) y al salir vuelve al formato completo del documento.
  const enfocarNombre = (e: FocusEvent<HTMLInputElement>) => {
    setNombreEdit(nombreVisible);
    e.currentTarget.style.borderColor = 'var(--essa-primary)';
    e.currentTarget.style.boxShadow = 'var(--ring)';
  };
  const desenfocarNombre = (e: FocusEvent<HTMLInputElement>) => {
    setNombreEdit(null);
    e.currentTarget.style.borderColor = 'var(--border-strong)';
    e.currentTarget.style.boxShadow = 'none';
  };
  const cambiarCampo = (key: string, valor: string, esNombre: boolean) => {
    // El "Nombre" se guarda ya con la caja normalizada: lo que se ve en el
    // campo es lo que queda en el registro y lo que viaja al documento.
    const v = esNombre ? toTitleCaseInline(valor) : valor;
    if (esNombre) setNombreEdit(v);
    editRecord(rowId, { [key]: v } as Partial<EssaRecord>);
  };

  return (
    <div className="dg-card dg-applicant" data-testid="dg-applicant-card">
      <style>{applicantStyles}</style>
      <div className="dg-panel-hdr">
        <span className="dg-panel-title">Información del solicitante</span>
        <span className="dg-panel-step">Registro</span>
      </div>
      <div className="dg-applicant-grid">
        {FIELDS.map((f) => {
          const esNombre = f.key === 'nombreSolicitante';
          return (
            <Input
              key={f.key}
              label={f.label}
              value={esNombre ? nombreVisible : String(rec[f.key] ?? '')}
              onChange={(e) => cambiarCampo(f.key, e.target.value, esNombre)}
              placeholder={f.placeholder}
              type={f.type}
              data-testid={`dg-applicant-${f.testSuffix}`}
              {...(esNombre ? { onFocus: enfocarNombre, onBlur: desenfocarNombre } : {})}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ApplicantCard;

/* ═══════════════════════════════════════════════════════════════
   STYLES — Franja del solicitante (Módulo 4, bajo el banner)
   ═══════════════════════════════════════════════════════════════ */
const applicantStyles = `
  .dg-applicant { display: flex; flex-direction: column; min-height: 0; }
  .dg-applicant .dg-panel-hdr { padding: 7px 14px; }
  .dg-applicant--empty { border: 1px dashed var(--border); border-radius: var(--radius-md); background: var(--bg-card); padding: 10px 14px; text-align: center; }
  .dg-applicant-empty-text { font-size: 0.72rem; color: var(--neutral-400); }
  .dg-applicant-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px 12px; padding: 10px 14px 12px; align-items: start; }
  .dg-applicant-grid label { gap: 4px !important; }
  .dg-applicant-grid label > span:first-child { font-size: 0.72rem !important; }
  .dg-applicant-grid input { height: 34px !important; font-size: 0.8rem !important; padding: 0 10px !important; }
`;
