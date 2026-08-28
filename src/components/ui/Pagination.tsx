interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < pages;

  // window of 5
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  const nums: number[] = [];
  for (let i = start; i <= end; i++) nums.push(i);

  const btn = (active?: boolean): React.CSSProperties => ({
    minWidth: 36,
    height: 36,
    padding: '0 10px',
    borderRadius: 10,
    border: `1px solid ${active ? 'var(--essa-primary)' : 'var(--border)'}`,
    background: active ? 'var(--essa-primary)' : '#fff',
    color: active ? '#fff' : 'var(--neutral-700)',
    fontWeight: 700,
    fontSize: '0.8125rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)' }}>
        {total === 0
          ? '0 resultados'
          : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
      </span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button style={btn()} disabled={!canPrev} onClick={() => onPageChange(page - 1)}>
          ‹
        </button>
        {nums.map((n) => (
          <button key={n} style={btn(n === page)} onClick={() => onPageChange(n)}>
            {n}
          </button>
        ))}
        <button style={btn()} disabled={!canNext} onClick={() => onPageChange(page + 1)}>
          ›
        </button>
      </div>
    </div>
  );
}
export default Pagination;
