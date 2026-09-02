import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  maxWidth?: string;
  padding?: string;
}

export function PageContainer({
  children,
  maxWidth = 'var(--max-container)',
  padding = '14px 20px 12px',
}: Props) {
  return (
    <div style={{ maxWidth, margin: '0 auto', width: '100%', padding, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 10 }}>{children}</div>
  );
}
export default PageContainer;
