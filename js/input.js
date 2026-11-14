// Keyboard layout for four players sharing one keyboard.
// Codes are physical key positions (KeyboardEvent.code), so they work on any layout.

// Every player gets the same triangle of four keys: turn on top; left, down, right below.
export const ACTIONS = ['left', 'right', 'down', 'turn'];

export const KEYMAPS = [
  { left: 'KeyA', right: 'KeyD', down: 'KeyS', turn: 'KeyW', hint: 'A D move · S drop · W turn' },
  { left: 'KeyF', right: 'KeyH', down: 'KeyG', turn: 'KeyT', hint: 'F H move · G drop · T turn' },
  { left: 'KeyJ', right: 'KeyL', down: 'KeyK', turn: 'KeyI', hint: 'J L move · K drop · I turn' },
  { left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', turn: 'ArrowUp', hint: '← → move · ↓ drop · ↑ turn' },
];

/**
 * Map of key code → { player, action } for the given player slots (0-3).
 * A lone player who is not in slot 4 can use the arrow keys as well.
 */
export function buildLookup(slots) {
  const lookup = new Map();
  for (const player of slots) {
    for (const action of ACTIONS) lookup.set(KEYMAPS[player][action], { player, action });
  }
  if (slots.length === 1 && slots[0] !== 3) {
    for (const action of ACTIONS) lookup.set(KEYMAPS[3][action], { player: slots[0], action });
  }
  return lookup;
}
