// Set de íconos de PastiYA (24×24, trazo 1.8, currentColor).
// Es la misma fuente que se usó para construir los componentes en Figma ("PastiYA – Logo e íconos").
export const ICONS = {
  pillbox:
    '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M9 5v14M15 5v14M3 12h18"/>',
  cart:
    '<path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  sliders:
    '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  bell: '<path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  count:
    '<rect x="5" y="4" width="14" height="17" rx="2.5"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="m9 13.5 2 2 4-4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  trash:
    '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>',
  warning:
    '<path d="M10.3 4.9 2.9 18a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.9a2 2 0 0 0-3.4 0Z"/><path d="M12 10v4M12 17.5h.01"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  logout: '<path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** Logo: pastilla blanca sobre fondo violeta. */
export const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#6D28D9"/><g transform="rotate(-40 32 32)"><rect x="11" y="22.5" width="42" height="19" rx="9.5" fill="#FFFFFF"/><path d="M32 22.5v19" stroke="#6D28D9" stroke-opacity=".28" stroke-width="2.4"/><rect x="15.5" y="26.5" width="11" height="3.2" rx="1.6" fill="#6D28D9" fill-opacity=".14"/></g></svg>';
