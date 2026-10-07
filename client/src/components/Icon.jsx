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
  shuffle: <><path d="m18 14 4 4-4 4" /><path d="m18 2 4 4-4 4" /><path d="M2 18h2a4 4 0 0 0 3.3-1.7l5.4-7.6A4 4 0 0 1 16 7h6" /><path d="M2 6h2a4 4 0 0 1 3.6 2.2" /><path d="M22 18h-6a4 4 0 0 1-3.3-1.8l-.4-.5" /></>,
  sparkles: <><path d="M10 15.5A2 2 0 0 0 8.5 14l-6.1-1.6a.5.5 0 0 1 0-1L8.5 10A2 2 0 0 0 10 8.5l1.6-6.1a.5.5 0 0 1 1 0L14 8.5a2 2 0 0 0 1.5 1.5l6.1 1.6a.5.5 0 0 1 0 1L15.5 14a2 2 0 0 0-1.5 1.5l-1.6 6.1a.5.5 0 0 1-1 0Z" /><path d="M20 3v4" /><path d="M22 5h-4" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4" /><path d="m15.4 6.5-6.8 4" /></>,
  copy: <><rect x="8.5" y="8.5" width="13" height="13" rx="2.5" /><path d="M5 15.5h-.5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2V5" /></>,
  tag: <><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
  fridge: <><rect x="5" y="2" width="14" height="20" rx="2.5" /><path d="M5 10h14" /><path d="M8.5 5.5v2" /><path d="M8.5 13v3" /></>,
  snowflake: <><path d="M12 2v20" /><path d="M2 12h20" /><path d="m16 4-4 4-4-4" /><path d="m8 20 4-4 4 4" /><path d="m20 16-4-4 4-4" /><path d="m4 8 4 4-4 4" /></>,
  cupboard: <><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M12 3v18" /><path d="M9.5 10.5v3" /><path d="M14.5 10.5v3" /></>,
  move: <><path d="M5 9 2 12l3 3" /><path d="M19 9l3 3-3 3" /><path d="M2 12h20" /></>,
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
