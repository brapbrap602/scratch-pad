// Small decorative pictures for the home page cards. They use currentColor,
// so each card's game accent colours its picture.
const ART = {
  'brick-breaker': `
    <g fill="currentColor">
      ${[0, 1, 2].map((row) => [0, 1, 2, 3, 4, 5].map((col) =>
        `<rect x="${22 + col * 44}" y="${18 + row * 20}" width="38" height="14" rx="3" opacity="${1 - row * 0.25}"/>`).join('')).join('')}
      <rect x="120" y="118" width="70" height="10" rx="5"/>
      <circle cx="170" cy="96" r="7"/>
    </g>
    <path d="M150 112 L172 98" stroke="currentColor" stroke-width="2" stroke-dasharray="3 4" opacity=".6"/>`,
  'space-invaders': `
    <g fill="currentColor">
      ${[0, 1].map((row) => [0, 1, 2, 3, 4].map((col) => {
        const x = 46 + col * 48;
        const y = 20 + row * 30;
        return `<path d="M${x} ${y}h20v4h4v8h-4v4h-4v-4h-12v4h-4v-4h-4v-8h4z" opacity="${1 - row * 0.3}"/>`;
      }).join('')).join('')}
      <path d="M150 112h20v6h6v10h-32v-10h6z"/>
      <rect x="158" y="86" width="4" height="14" rx="2"/>
      <rect x="30" y="100" width="40" height="12" rx="3" opacity=".45"/>
      <rect x="230" y="100" width="40" height="12" rx="3" opacity=".45"/>
    </g>`,
  'tower-defense': `
    <g fill="currentColor">
      ${[34, 74, 114].map((y) => `<rect x="20" y="${y - 6}" width="260" height="12" rx="6" opacity=".25"/>`).join('')}
      ${[34, 74, 114].map((y, lane) => `
        <rect x="26" y="${y - 22}" width="16" height="14" rx="3"/>
        <circle cx="${84 + lane * 30}" cy="${y}" r="3.5"/>
        <rect x="${210 - lane * 26}" y="${y - 9}" width="18" height="18" rx="4" opacity=".8"/>`).join('')}
    </g>`,
};

export const gameArt = (lessonId) => {
  const template = document.createElement('template');
  template.innerHTML = `<svg viewBox="0 0 300 140" aria-hidden="true" focusable="false">${ART[lessonId] ?? ''}</svg>`;
  return template.content.firstElementChild;
};
