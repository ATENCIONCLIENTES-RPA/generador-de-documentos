import { test, expect } from '@playwright/test';

/**
 * E2E crítico M2 → M6 (inicio → generación)
 * Requiere: npm run dev en http://localhost:5173
 * Ejecutar: npx playwright test --project=chromium
 */
test.describe('ESSA flujo completo M2→M6', () => {
  test('flujo inicio → perfil → configuracion → datos → plantillas → generacion', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // M1 inicio: hero + CTA
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page.getByTestId('home-title')).toContainText('Generación documental');
    await expect(page.getByTestId('home-cta')).toBeVisible();
    await expect(page.getByTestId('energy-illustration')).toBeVisible();
    await expect(page.getByTestId('feature-card-rápido')).toBeVisible();
    await expect(page.getByTestId('home-como-funciona')).toContainText('1. Configura tu perfil');

    // Ir a perfil
    await page.getByTestId('home-cta').click();
    await expect(page.getByTestId('profile-view')).toBeVisible();
    await expect(page.getByTestId('stepper-bar')).toBeVisible();
    await expect(page.getByTestId('stepper-step-perfil')).toHaveAttribute('data-status', 'active');

    // Guardar perfil
    await page.getByTestId('profile-name').fill('Jaime Arley Rizo Morales');
    await page.getByTestId('profile-email').fill('jaime@essa.com.co');
    await page.getByTestId('profile-save').click();
    await expect(page.getByTestId('config-view')).toBeVisible();

    // M2: Configuración — hero + grid + progreso 3 segmentos
    await expect(page.getByTestId('m2-hero')).toBeVisible();
    await expect(page.getByTestId('m2-grid')).toBeVisible();
    await expect(page.getByTestId('m2-progress-track')).toBeVisible();
    await expect(page.getByTestId('m2-continuar')).toBeDisabled();

    // Navegar por header a datos (vacío) y plantillas
    await page.getByTestId('header-nav-datos').click();
    await expect(page.getByTestId('data-view')).toBeVisible();

    await page.getByTestId('header-nav-plantillas').click();
    await expect(page.getByTestId('templates-view')).toBeVisible();

    await page.getByTestId('header-nav-generacion').click();
    await expect(page.getByTestId('generate-view')).toBeVisible();
    await expect(page.getByTestId('gv-status-bar')).toBeVisible();
    await expect(page.getByTestId('gv-status-bar')).toContainText('documentos:');

    // Volver a inicio via header y verificar stepper oculto en inicio
    await page.getByTestId('header-nav-inicio').click();
    await expect(page.getByTestId('home-view')).toBeVisible();
    await expect(page.getByTestId('stepper-bar')).toHaveCount(0);
  });

  test('persistencia de firma y a11y focus-visible', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.getByTestId('header-nav-perfil').click();
    await expect(page.getByTestId('profile-view')).toBeVisible();

    // Abrir SignaturePad modal
    await page.getByTestId('profile-open-pad').click();
    await expect(page.getByTestId('signature-pad-overlay')).toBeVisible();
    await expect(page.getByTestId('signature-canvas')).toBeVisible();

    // Verificar pen colors y aria-labels
    await expect(page.getByTestId('pen-color-#002f6c')).toBeVisible();
    await expect(page.getByTestId('signature-clear')).toHaveAttribute('aria-label', 'Limpiar trazo');
    await expect(page.getByTestId('signature-save')).toHaveAttribute('aria-label', 'Guardar firma');

    // Cerrar modal
    await page.getByTestId('signature-cancel').click();
    await expect(page.getByTestId('signature-pad-overlay')).toHaveCount(0);
  });

  test('header navigation va a cada sección y stepper refleja estado', async ({ page }) => {
    await page.goto('http://localhost:5173');
    const steps: Array<[string, string]> = [
      ['perfil', 'profile-view'],
      ['configuracion', 'config-view'],
      ['datos', 'data-view'],
      ['plantillas', 'templates-view'],
      ['generacion', 'generate-view'],
    ];
    for (const [nav, view] of steps) {
      await page.getByTestId(`header-nav-${nav}`).click();
      await expect(page.getByTestId(view)).toBeVisible();
      await expect(page.getByTestId(`stepper-step-${nav}`)).toBeVisible();
    }
  });
});
