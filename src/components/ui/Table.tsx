import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string | number;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T, idx: number) => string;
  emptyText?: string;
}

export function Table<T>({ columns, data, getRowKey, emptyText = 'Sin datos' }: Props<T>) {
  return (
    <div className="essa-table-wrap">
      <table className="essa-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: 28, color: 'var(--neutral-500)' }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={getRowKey(row, idx)}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
export default Table;
