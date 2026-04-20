interface IconProps {
  color: string;
}

interface ChevronIconProps extends IconProps {
  collapsed: boolean;
}

export function CameraIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <path
        d="M8.5 6.5h7l1 1.5H19a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2.5l1-1.5Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3.6" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function ChevronIcon({ collapsed, color }: ChevronIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 160ms ease' }}
    >
      <path d="m6 9 6 6 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SunIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.7" />
      <path
        d="M12 2.5v2.3M12 19.2v2.3M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M20 15.2A7.8 7.8 0 1 1 8.8 4a8.8 8.8 0 1 0 11.2 11.2Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
