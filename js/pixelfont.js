// A tiny 5×7 bitmap font, drawn as SVG squares: used for the title and the round countdown.

export const GLYPHS = {
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
};

const ADVANCE = 6; // glyph width plus one column of space

/**
 * SVG markup for some text. `parts` is a string, or a list of [text, className] pairs
 * so different words can be styled differently. Unknown characters are left blank.
 */
export function pixelText(parts) {
  if (typeof parts === 'string') parts = [[parts, '']];
  let x = 0;
  const groups = parts.map(([text, cls]) => {
    let d = '';
    for (const ch of text.toUpperCase()) {
      (GLYPHS[ch] || []).forEach((row, y) => {
        // one rectangle per run of filled pixels
        for (const m of row.matchAll(/#+/g)) d += `M${x + m.index} ${y}h${m[0].length}v1H${x + m.index}z`;
      });
      x += ADVANCE;
    }
    return `<path${cls ? ` class="${cls}"` : ''} d="${d}"/>`;
  });
  const width = Math.max(1, x - 1);
  return `<svg class="pixel-text" viewBox="0 0 ${width} 7" aria-hidden="true" focusable="false">${groups.join('')}</svg>`;
}
