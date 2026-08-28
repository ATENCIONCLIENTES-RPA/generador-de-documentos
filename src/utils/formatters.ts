export function formatDateCC(date: string | null | undefined): string {
  if (date === undefined || date === null || date === '') return '';
  const strVal = String(date).trim();
  if (!strVal) return '';

  // Excel serial number
  if (!isNaN(Number(strVal)) && Number(strVal) > 10000 && Number(strVal) < 100000) {
    const d = new Date(Math.round((Number(strVal) - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }

  const isoMatch = strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1]!;
    const month = isoMatch[2]!.padStart(2, '0');
    const day = isoMatch[3]!.padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  const euroMatch = strVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (euroMatch) {
    const day = euroMatch[1]!.padStart(2, '0');
    const month = euroMatch[2]!.padStart(2, '0');
    const year = euroMatch[3]!;
    return `${day}/${month}/${year}`;
  }

  return strVal;
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value.replace(/[^\d.-]/g, '')) : value;
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('es-CO').format(num);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (isNaN(value)) return '—';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function truncate(text: string | null | undefined, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + '…';
}
