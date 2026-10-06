import React from 'react';

// simple line icons (24×24, drawn with the current text color) used instead of emoji,
// so they look the same on every device and match the brown/orange palette
const PATHS = {
  search: <><circle cx="11" cy="11" r="7.5" /><path d="m20.5 20.5-4.2-4.2" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  alert: <><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5" /><path d="M12 16.5h.01" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M8 2.5v4" /><path d="M16 2.5v4" /><path d="M3 10h18" /><path d="M12 13.5v4.5" /><path d="M9.75 15.75h4.5" /></>,
  trash: <><path d="M3.5 6h17" /><path d="M18.5 6v13a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V6" /><path d="M8.5 6V4.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V6" /></>,
  clock: <><circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3.5 2" /></>,
  utensils: <><path d="M4 2.5v6.5a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2.5" /><path d="M7 2.5v19" /><path d="M20 15V2.5a5 5 0 0 0-5 5V13a2 2 0 0 0 2 2h3Zm0 0v6.5" /></>,
  arrowLeft: <><path d="m11 18.5-6.5-6.5L11 5.5" /><path d="M19.5 12h-15" /></>,
  arrowRight: <><path d="M4.5 12h15" /><path d="m13 5.5 6.5 6.5-6.5 6.5" /></>,
  external: <><path d="M14.5 3.5h6v6" /><path d="M10 14 20.5 3.5" /><path d="M18.5 13.5v5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h5" /></>,
  heart: <path d="M12 20.5s-7.5-4.6-9.6-9.2C.9 7.9 3 4 6.8 4c2.2 0 3.6 1.2 5.2 3.1C13.6 5.2 15 4 17.2 4c3.8 0 5.9 3.9 4.4 7.3-2.1 4.6-9.6 9.2-9.6 9.2Z" />,
  chefHat: <><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.46.32-.84.73-1.04a4 4 0 0 0-2.14-7.59 5 5 0 0 0-9.18 0 4 4 0 0 0-2.14 7.59c.41.2.73.58.73 1.04V20a1 1 0 0 0 1 1Z" /><path d="M6 17h12" /></>,
};

function Icon({ name, size = 18, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
