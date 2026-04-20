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

export function FilePlusIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" aria-hidden="true">
      <path
        d="M7 3.5h6.2L18 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13 3.8V8h4.2M12 11v6M9 14h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SaveIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M5 4h11.2L19 6.8V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8 4v5h7V4M8 20v-6h8v6" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M9 4h6M5 7h14M10 11v6M14 11v6" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M7 7h10l-.7 12a1.5 1.5 0 0 1-1.5 1.4H9.2A1.5 1.5 0 0 1 7.7 19L7 7Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
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
