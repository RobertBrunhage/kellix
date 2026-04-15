export const KELLIX_LOGO_VIEWBOX = "0 0 64 64";

export const KELLIX_LOGO_MARK_CONTENT = `<g fill="currentColor"><rect x="18" y="10" width="28" height="10" rx="5"/><rect x="12" y="26" width="40" height="12" rx="6" opacity="0.8"/><rect x="20" y="44" width="24" height="10" rx="5" opacity="0.6"/></g>`;

export function renderKellixBadgeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${KELLIX_LOGO_VIEWBOX}" fill="none"><rect x="6" y="6" width="52" height="52" rx="16" fill="#fff" stroke="#e5e2db" stroke-width="2"/><g fill="#171717"><rect x="20" y="15" width="24" height="8" rx="4"/><rect x="14" y="27" width="36" height="10" rx="5" fill-opacity="0.82"/><rect x="22" y="41" width="20" height="8" rx="4" fill-opacity="0.64"/></g></svg>`;
}

export function getKellixBadgeFaviconHref(): string {
  return `data:image/svg+xml,${encodeURIComponent(renderKellixBadgeSvg())}`;
}
