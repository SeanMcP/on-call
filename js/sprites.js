// Original pixel art for On-call, as plain text. Each character is one pixel;
// '.' is transparent and the other letters index into a palette (see render.js).

// The three bug species, two wriggle frames each. 8×8.
// m = body, d = dark, l = light, w = eye white, k = black.
export const BUGS = [
  // Null Gnat (teal): spindly legs that flick in and out
  [
    ['d......d', '.d.mm.d.', '..mmmm..', '.mwkmwk.', 'dmmmmmmd', '..mddm..', '.d.mm.d.', 'd......d'],
    ['..d..d..', '.d.mm.d.', '..mmmm..', '.mkwmkw.', '.mmmmmm.', 'd.mddm.d', '.d.mm.d.', '..d..d..'],
  ],
  // Race Roach (orange): wide shell, twitching antennae
  [
    ['.k....k.', '..k..k..', '.mmmmmm.', 'mwkmmwkm', 'mmmmmmmm', 'mdmddmdm', '.mmmmmm.', 'd.d..d.d'],
    ['k......k', '..k..k..', '.mmmmmm.', 'mkwmmkwm', 'mmmmmmmm', 'mmdmmdmm', '.mmmmmm.', '.d.dd.d.'],
  ],
  // Leak Leech (violet): a blob with a swishing tail
  [
    ['........', '..mmmm..', '.mwkwkm.', '.mmmmmm.', '.mdkkdm.', '..mmmmm.', '...mmmmm', '....dd..'],
    ['........', '..mmmm..', '.mkwkwm.', '.mmmmmm.', '.mdkkdm.', '.mmmmm..', 'mmmmm...', '..dd....'],
  ],
];

// The on-call engineer. 16×16.
// h = hair, s = skin, k = glasses/shoes, e = headphones, c = hoodie (player colour),
// C = hoodie shade (drawstrings from the collar, front pocket), p = jeans, m = mouth.
export const ENGINEER = {
  // standing, arms at sides
  idle: [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...ehhhhhhhhe...',
    '...ehsssssshe...',
    '...eskksskkse...',
    '....ssssssss....',
    '....sssmmsss....',
    '.....cCccCc.....',
    '...cccCccCccc...',
    '..cccccccccccc..',
    '..sccccccccccs..',
    '....cCCCCCCc....',
    '....pppppppp....',
    '....ppp..ppp....',
    '...kkk....kkk...',
  ],
  // arms up, holding the next block overhead
  hold: [
    '................',
    '.....hhhhhh.....',
    '..s.hhhhhhhh.s..',
    '..sehhhhhhhhes..',
    '..cehsssssshec..',
    '..ceskksskksec..',
    '..c.ssssssss.c..',
    '..c.sssmmsss.c..',
    '..cc.cCccCc.cc..',
    '...cccCccCccc...',
    '....cccccccc....',
    '....cccccccc....',
    '....cCCCCCCc....',
    '....pppppppp....',
    '....ppp..ppp....',
    '...kkk....kkk...',
  ],
  // follow-through after a throw
  toss: [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...ehhhhhhhhe...',
    '...ehsssssshe...',
    '...eskksskkse...',
    '....ssssssss....',
    '....sssmmsss....',
    '.....cCccCc.....',
    '...cccCccCcccccs',
    '..cccccccccccccs',
    '..s.cccccccc....',
    '....cCCCCCCc....',
    '....pppppppp....',
    '....ppp..ppp....',
    '...kkk....kkk...',
  ],
  // the server crashed
  slump: [
    '................',
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...ehhhhhhhhe...',
    '...ehsssssshe...',
    '...esssssssse...',
    '....skksskks....',
    '....ssmmmmss....',
    '...cccCccCccc...',
    '..ccccCccCcccc..',
    '..cccccccccccc..',
    '..s.cCCCCCCc.s..',
    '....pppppppp....',
    '....ppp..ppp....',
    '...kkk....kkk...',
  ],
};

// 3×5 pixel font. Each glyph is five rows of three bits.
export const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  '!': '010010010000010', ':': '000010000010000', '-': '000000111000000', '.': '000000000000010',
};
