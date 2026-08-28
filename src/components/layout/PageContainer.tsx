import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  maxWidth?: string;
  padding?: string;
}

export function PageContainer({
  children,
  maxWidth = 'var(--max-container)',
  padding = '28px 24px',
}: Props) {
  return (
    <div style={{ maxWidth, margin: '0 auto', width: '100%', padding, flex: 1 }}>{children}</div>
  );
}
export default PageContainer;
