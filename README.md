# On-call

A falling-block puzzle game about fixing after-hours bugs, for one to four players on one keyboard.

You play the on-call software engineer, throwing two-colour blocks of code into a server's memory. Line up four or more of one colour, across
or down, and the code compiles away, taking any bugs caught in it. Clear every bug to resolve the incident. If the
stack blocks the top of the well, the server crashes.

## Play

Open `index.html` through any static web server (browsers do not load JavaScript modules from `file://`):

```sh
python3 -m http.server
```

On GitHub Pages, serve the repository root. There is no build step and nothing to install.

| Player | Left | Down (soft drop) | Right | Turn |
| ------ | ---- | ---------------- | ----- | ---- |
| 1      | A    | S                | D     | W    |
| 2      | F    | G                | H     | T    |
| 3      | J    | K                | L     | I    |
| 4      | ←    | ↓                | →     | ↑    |

A solo player can also use the arrow keys. `Esc` pauses. On the settings screen each player uses their own
keys (turn and drop pick a row, left and right change it), `M` changes the music and `Enter` starts.

On a phone, or any window narrower than 700 px, the game is one player with on-screen buttons in the same
triangle: turn on top; left, down, right below. Touch screens of any width get the buttons for solo games.

It can be installed to a phone's home screen (Share → Add to Home Screen on iPhone, or the browser's install
prompt on Android and desktop) and plays offline after the first visit.

With two or more players everyone gets the same sequence of blocks; the first to clear their bugs wins the
round, as does the last server left running. `?autostart=2` in the URL jumps straight into a two-player match.

## Code

| File            | What it holds                                               |
| --------------- | ----------------------------------------------------------- |
| `js/engine.js`  | Game rules. Pure logic, no DOM.                              |
| `js/input.js`   | Key layout for the four players.                             |
| `js/sprites.js` | Pixel art and the pixel font, as text.                       |
| `js/render.js`  | Canvas drawing and animation.                                |
| `js/audio.js`   | Chiptune songs and sound effects, synthesised with Web Audio. |
| `js/main.js`    | Settings screen, match flow and the frame loop.              |
| `sw.js`         | Service worker for offline play. Lists every file to save.   |
| `tools/make-icons.mjs` | Redraws `icons/` from the bug sprite. Run it only if the art changes. |

Tests need only Node:

```sh
node tests/engine.test.js && node tests/data.test.js
```
