import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '@/App';
import { useNavigationStore } from '@/store/navigationStore';
import { useProfileStore } from '@/store/profileStore';

function resetNav() {
  useNavigationStore.getState().reset();
}

describe('App routing currentStep → view render', () => {
  beforeEach(() => {
    resetNav();
    // clear profile persist not needed but reset
    useProfileStore.getState().clearProfile();
    localStorage.clear();
  });

  it('renderiza Configuración de Recursos por defecto al cargar el asistente', () => {
    render(<App />);
    expect(screen.getByTestId('config-view')).toBeInTheDocument();
    expect(screen.getByTestId('header-nav-configuracion')).toHaveAttribute(
      'aria-label',
      'Ir a Módulo 1: Configuración de Recursos'
    );
  });

  it('AppHeader navigation funciona: click Cuadro de Mando → goTo', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('header-nav-inicio'));
    expect(await screen.findByTestId('home-view')).toBeInTheDocument();
  });

  it('ConfigView integra la configuración de perfil y abre ProfileModal', async () => {
    render(<App />);
    expect(screen.getByTestId('config-profile-card')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('config-open-profile'));
    expect(await screen.findByTestId('profile-card')).toBeInTheDocument();

    // Rellenar nombre y guardar
    const nameInput = screen.getByTestId('profile-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Jaime Rizo' } });
    fireEvent.click(screen.getByTestId('profile-save'));

    // Perfil guardado en el store
    expect(useProfileStore.getState().profile.name).toBe('Jaime Rizo');
  });

  it('profile modal abre el signature pad para dibujar firma', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('config-open-profile'));
    expect(await screen.findByTestId('profile-card')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('profile-open-pad'));
    expect(await screen.findByTestId('signature-pad-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('signature-canvas')).toBeInTheDocument();
    // close via cancel
    fireEvent.click(screen.getByTestId('signature-cancel'));
    expect(screen.queryByTestId('signature-pad-overlay')).not.toBeInTheDocument();
  });

  it('focus-visible y aria-labels en elementos interactivos', () => {
    render(<App />);
    expect(screen.getByTestId('header-nav-inicio')).toHaveAttribute('aria-label');
    expect(screen.getByTestId('header-nav-configuracion')).toHaveAttribute('aria-label');
  });

  it('navega por todas las vistas via store goTo', async () => {
    render(<App />);
    const nav = useNavigationStore.getState();
    nav.goTo('datos');
    // DataView will render empty state if no records
    expect(await screen.findByTestId('data-view')).toBeInTheDocument();
    nav.goTo('generacion');
    expect(await screen.findByTestId('generate-view')).toBeInTheDocument();
    nav.goTo('inicio');
    expect(await screen.findByTestId('home-view')).toBeInTheDocument();
  });

  it('StepperBar visible en todas las vistas incluyendo inicio', async () => {
    render(<App />);
    expect(screen.getByTestId('stepper-bar')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('header-nav-inicio'));
    expect(screen.getByTestId('stepper-bar')).toBeInTheDocument();
    expect(screen.getByTestId('stepper-step-inicio')).toHaveAttribute('data-status', 'active');
  });
});
