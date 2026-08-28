import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: number | string;
}
export function Card({ hover, padding = 20, style, className, children, ...rest }: CardProps) {
  return (
    <div
      className={`essa-card ${hover ? 'essa-card--hover' : ''} ${className ?? ''}`}
      style={{ padding, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return <div style={{ marginBottom: 14, ...style }}>{children}</div>;
}
export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--essa-primary)', lineHeight: 1.2 }}
    >
      {children}
    </h3>
  );
}
export function CardDescription({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)', marginTop: 4 }}>{children}</p>
  );
}
export default Card;
