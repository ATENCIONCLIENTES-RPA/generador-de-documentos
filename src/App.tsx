import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import PageContainer from '@/components/layout/PageContainer';
import StepperBar from '@/components/layout/StepperBar';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { ToastProvider } from '@/components/ui/Toast';

const STEPS = [
  { key: 'plantillas', label: '1 · Plantillas' },
  { key: 'cargar', label: '2 · Datos Excel' },
  { key: 'generar', label: '3 · Generar' },
  { key: 'perfiles', label: '4 · Perfiles' },
] as const;

export default function App(): JSX.Element {
  const [active, setActive] = useState<string>('plantillas');

  const stepperSteps = STEPS.map((s, idx) => {
    const curr = STEPS.findIndex((x) => x.key === active);
    return {
      key: s.key,
      label: s.label,
      status: (idx < curr ? 'completed' : idx === curr ? 'active' : 'pending') as 'completed' | 'active' | 'pending',
    };
  });

  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
        <AppHeader activeKey={active} onNav={setActive} />

        <PageContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <StepperBar steps={stepperSteps} onStepClick={setActive} />

            {/* stub view shell */}
            <Card>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <CardTitle>ESSA Vite OK</CardTitle>
                  <Badge variant="primary" dot>
                    Shell UI · Task 5
                  </Badge>
                  <Badge variant="accent">Micro-interacciones</Badge>
                </div>
                <CardDescription>
                  Layout shell con AppHeader · StepperBar · PageContainer · tokens #004B93 / #76BC21 · Plus Jakarta Sans
                </CardDescription>
              </CardHeader>

              {/* polished showcase — proves primitives render */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <strong style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--neutral-500)' }}>
                    Botones
                  </strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button variant="primary">Primario</Button>
                    <Button variant="secondary">Secundario</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Danger</Button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button size="sm">sm</Button>
                    <Button size="md">md</Button>
                    <Button size="lg">lg</Button>
                    <Button loading>Loading</Button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <strong style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--neutral-500)' }}>
                    Campos
                  </strong>
                  <Input label="Nombre" placeholder="Ej. Juan Pérez" />
                  <Select label="Plantilla" placeholder="Seleccione" options={[{ value: 'a', label: 'Plantilla A' }]} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <strong style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--neutral-500)' }}>
                    Estados
                  </strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge>neutral</Badge>
                    <Badge variant="success">success</Badge>
                    <Badge variant="warning">warning</Badge>
                    <Badge variant="danger">danger</Badge>
                    <Badge variant="info">info</Badge>
                  </div>
                  <div style={{ display: 'inline-flex', gap: 14, alignItems: 'center', marginTop: 4 }}>
                    <Spinner size={18} />
                    <span style={{ width: 90 }}>
                      <Spinner variant="shimmer" size={10} />
                    </span>
                    <Spinner variant="pulse" size={12} />
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--neutral-50)',
                  border: '1px dashed var(--border)',
                  fontSize: '0.8125rem',
                  color: 'var(--neutral-600)',
                }}
              >
                Vista activa: <strong style={{ color: 'var(--essa-primary)' }}>{active}</strong> · Contenido real en Tareas 6–10. Este shell
                valida tokens, layout y primitivos.
              </div>
            </Card>

            {/* secondary ghost card to show Card hover */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <Card hover>
                <CardTitle>Card hover</CardTitle>
                <CardDescription>Essa-card con micro-elevación al hover (shadow + translateY).</CardDescription>
              </Card>
              <Card>
                <CardTitle>Próximo</CardTitle>
                <CardDescription>Task 6 consume estos primitivos para vistas reales (plantillas / excel / generación).</CardDescription>
              </Card>
            </div>
          </div>
        </PageContainer>

        <AppFooter />
      </div>
    </ToastProvider>
  );
}
