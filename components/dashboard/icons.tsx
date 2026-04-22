interface IconProps {
  color: string;
}

interface ChevronIconProps extends IconProps {
  collapsed: boolean;
}

export function CameraIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
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

export function PencilIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10-10a1.9 1.9 0 0 0-4-4L4 16v4Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m13 7 4 4" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CopyIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M8 8.5V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.5"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <rect x="4" y="8.5" width="11.5" height="11.5" rx="2" stroke={color} strokeWidth="1.7" />
    </svg>
  );
}

export function EyeIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M3.5 12s3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3 5.5-8.5 5.5S3.5 12 3.5 12Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth="1.7" />
    </svg>
  );
}

export function EyeOffIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 4l16 16" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M8.6 6.9A8 8 0 0 1 12 6.2c5.5 0 8.5 5.8 8.5 5.8a15.2 15.2 0 0 1-2.4 3.1M15 17.1a8.1 8.1 0 0 1-3 .7C6.5 17.8 3.5 12 3.5 12a15.5 15.5 0 0 1 3-3.7"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10.5 10.7a2.5 2.5 0 0 0 3 3" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function KeyIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="8" cy="12" r="3.5" stroke={color} strokeWidth="1.7" />
      <path d="M11.5 12H21M17 12v3M14.5 12v2" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
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

export function MenuIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function LogOutIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M14.5 16.5 19 12l-4.5-4.5M19 12H9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PanelLeftIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M9 4.8v14.4" stroke={color} strokeWidth="1.6" />
      <path d="m14.8 12-2.4-2.2m2.4 2.2-2.4 2.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PanelRightIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M15 4.8v14.4" stroke={color} strokeWidth="1.6" />
      <path d="m9.2 12 2.4-2.2m-2.4 2.2 2.4 2.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ClipboardListIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M8 4.5h8A1.5 1.5 0 0 1 17.5 6v13.5A1.5 1.5 0 0 1 16 21H8A1.5 1.5 0 0 1 6.5 19.5V6A1.5 1.5 0 0 1 8 4.5Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.5 9h5M9.5 12.5h5M9.5 16h3.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 3.3h4a1 1 0 0 1 1 1v1.2H9V4.3a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function CalendarIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="2.2" stroke={color} strokeWidth="1.6" />
      <path d="M4 9.2h16M8 3.7v3M16 3.7v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="13" r="1" fill={color} />
      <circle cx="12.5" cy="13" r="1" fill={color} />
      <circle cx="16" cy="13" r="1" fill={color} />
    </svg>
  );
}

export function NotesIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M6.5 4.8h11A1.7 1.7 0 0 1 19.2 6.5v11A1.7 1.7 0 0 1 17.5 19.2h-11a1.7 1.7 0 0 1-1.7-1.7v-11a1.7 1.7 0 0 1 1.7-1.7Z"
        stroke={color}
        strokeWidth="1.6"
      />
      <path d="M8.2 9h7.6M8.2 12.2h7.6M8.2 15.4H13" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function UserIcon({ color }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="1.6" />
      <path
        d="M5.5 19.2a6.5 6.5 0 0 1 13 0"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
