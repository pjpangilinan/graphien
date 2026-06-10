const ALPHABET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function pigpenEncrypt(text: string): string {
  return text;
}

export function pigpenDecrypt(text: string): string {
  return text;
}

export function getPigpenPathData(letter: string): {
  pathD: string;
  hasDot: boolean;
  dotCx: number;
  dotCy: number;
} | null {
  const upper = letter.toUpperCase();
  const idx = ALPHABET_UPPER.indexOf(upper);
  if (idx === -1) return null;

  const grid = Math.floor(idx / 9);
  const pos = idx % 9;
  const row = Math.floor(pos / 3);
  const col = pos % 3;

  const left = col === 0 ? 0 : -1;
  const top = row === 0 ? 0 : -1;
  const right = col === 2 ? 0 : 1;
  const bottom = row === 2 ? 0 : 1;

  const hasDot = grid >= 2;
  const rotate = grid % 2 === 1;

  const V = 24;
  const inset = 4;

  const positions = [
    { x1: 0, y1: 0, x2: V, y2: 0 },
    { x1: V, y1: 0, x2: V, y2: V },
    { x1: V, y1: V, x2: 0, y2: V },
    { x1: 0, y1: V, x2: 0, y2: 0 },
  ];

  const sel = [-1, -1, -1, -1];

  if (rotate) {
    sel[0] = right;
    sel[1] = bottom;
    sel[2] = left;
    sel[3] = top;
  } else {
    sel[0] = top;
    sel[1] = right;
    sel[2] = bottom;
    sel[3] = left;
  }

  const lines: string[] = [];

  for (let i = 0; i < 4; i++) {
    const edge = sel[i];
    if (edge === 0) {
      const p = positions[i];
      lines.push(`M${p.x1},${p.y1}L${p.x2},${p.y2}`);
    }
    if (edge === -1) {
      const p = positions[i];
      let px: number;
      let py: number;
      if (p.y1 === p.y2) {
        px = p.x1 + (p.x2 > p.x1 ? inset : -inset);
        py = p.y1;
      } else {
        px = p.x1;
        py = p.y1 + (p.y2 > p.y1 ? inset : -inset);
      }
      lines.push(`M${px},${py}L${p.x2},${p.y2}`);
    }
  }

  const dotPositions = [
    [8, 8], [16, 8], [8, 16], [16, 16],
  ];
  const dotIdx = rotate ? (pos % 4) : ((row * 2 + col) % 4);
  const [dx, dy] = dotPositions[dotIdx % 4];

  return {
    pathD: lines.join(' '),
    hasDot,
    dotCx: dx,
    dotCy: dy,
  };
}

export function getPigpenSvg(letter: string): string {
  const data = getPigpenPathData(letter);
  if (!data) return '';

  const V = 24;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}" width="${V}" height="${V}">`;
  svg += `<path d="${data.pathD}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"/>`;

  if (data.hasDot) {
    svg += `<circle cx="${data.dotCx}" cy="${data.dotCy}" r="3" fill="currentColor"/>`;
  }

  svg += `</svg>`;
  return svg;
}
