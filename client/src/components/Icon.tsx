import { ICONS, LOGO_SVG, type IconName } from '../icons';

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

/** Ícono de línea que hereda el color del texto (currentColor). */
export function Icon({ name, size = 18, className }: Props) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      className="logo"
      style={{ width: size, height: size }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
    />
  );
}
