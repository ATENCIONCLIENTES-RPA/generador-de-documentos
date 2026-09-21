interface Props {
  className?: string;
}

export function EnergyIllustration({ className = '' }: Props): JSX.Element {
  return (
    <div
      className={`energy-illustration ${className}`}
      style={{ width: '100%', overflow: 'hidden' }}
      data-testid="energy-illustration"
      aria-hidden="true"
    >
      <img
        src={`${import.meta.env.BASE_URL}energy-city.svg`}
        alt=""
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
}

export default EnergyIllustration;
