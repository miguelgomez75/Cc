// ═══════════════════════════════════════════════════════════
//  PALETA DE 16 COLORES
//  Índices 1-16. 0 = vacío. >16 hace wrap con módulo.
//
//  0  EMPTY       (vacío)
//  1  WHITE       #f5fafe
//  2  GREY        #596ca3
//  3  BLACK       #030405
//  4  PEACH       #fec3c1
//  5  PINK        #ee57ad
//  6  PURPLE      #7212a6
//  7  RED         #fa194e
//  8  ORANGE      #fd8545
//  9  YELLOW      #ffe461
// 10  LIGHTGREEN  #8fe132
// 11  GREEN       #22b341
// 12  DARKBLUE    #1b184c
// 13  BLUE        #2c3ac1
// 14  LIGHTBLUE   #65abf2
// 15  BROWN       #b33838
// 16  DARKBROWN   #320d1a
// ═══════════════════════════════════════════════════════════

// Helper: convert a CSS hex string "#rrggbb" to [r,g,b] floats in [0,1]
function hexToRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [
    ((n >> 16) & 0xff) / 255,
    ((n >>  8) & 0xff) / 255,
    ( n        & 0xff) / 255,
  ];
}

const PALETTE_HEX = [
  null,       // 0  vacío
  '#f5fafe',  // 1  WHITE
  '#596ca3',  // 2  GREY
  '#030405',  // 3  BLACK
  '#fec3c1',  // 4  PEACH
  '#ee57ad',  // 5  PINK
  '#7212a6',  // 6  PURPLE
  '#fa194e',  // 7  RED
  '#fd8545',  // 8  ORANGE
  '#ffe461',  // 9  YELLOW
  '#8fe132',  // 10 LIGHTGREEN
  '#22b341',  // 11 GREEN
  '#1b184c',  // 12 DARKBLUE
  '#2c3ac1',  // 13 BLUE
  '#65abf2',  // 14 LIGHTBLUE
  '#b33838',  // 15 BROWN
  '#320d1a',  // 16 DARKBROWN
];

const PALETTE = PALETTE_HEX.map(h => h ? hexToRGB(h) : null);

const PALETTE_NAMES = [
  '—','white','grey','black','peach','pink',
  'purple','red','orange','yellow','lgreen',
  'green','dkblue','blue','ltblue','brown','dkbrn'
];

// Convierte un número raw en [r,g,b] o null (vacío)
function paletteRGB(raw) {
  if (!raw || raw <= 0) return null;
  const idx = ((Math.floor(raw) - 1) % 16) + 1;
  return PALETTE[idx];
}

function paletteCSSHex(idx) {
  return PALETTE_HEX[idx] || '#000';
}

function buildPaletteGrid(id) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  for (let i = 1; i <= 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'palette-cell';
    cell.innerHTML = `<div class="pswatch" style="background:${paletteCSSHex(i)}"></div>${i} ${PALETTE_NAMES[i]}`;
    el.appendChild(cell);
  }
}

function buildPaletteBar() {
  const bar = document.getElementById('palette-bar');
  bar.innerHTML = '';
  for (let i = 1; i <= 16; i++) {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = paletteCSSHex(i);
    sw.title = i + ': ' + PALETTE_NAMES[i];
    bar.appendChild(sw);
  }
}
