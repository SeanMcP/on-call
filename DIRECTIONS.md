Build an original browser puzzle game called "Lil McP" (working title) about squashing bugs in a codebase.

Premise: Lil McP is a software engineer fighting an infestation of software bugs living inside a server. Lil McP
throws blocks of code into the server's memory to wipe the bugs out. Each block of code is made of two
segments, and each segment is one of three colours that match the three species of bug. When enough code of one
colour lines up, it compiles and deletes the bugs caught in it. Clear every bug to ship the release; let the
memory fill up and the server crashes.

The game belongs to the falling-block colour-match genre and is inspired by Dr. Mario, Puyo Puyo and Columns.
Those games are references for the genre only. Do not imitate their art, characters, sounds, music, menus,
layouts or wording. All names, characters, art and music must be original to this project.

How it plays:

- The play area is the server's memory: a vertical well that starts each round seeded with bugs (blocker tiles)
  in three colours.
- Two-segment, two-colour code blocks fall into the well one at a time. The player moves and rotates each block
  as it falls.
- Lining up four or more of one colour in a row or column (code segments and bugs together) clears them.
- Unsupported code segments then fall and can set off chain clears. Bugs stay where they are.
- The round is won when every bug is cleared and lost when the stack blocks the top of the well.

Requirements:

1. It must run in the browser with up to four players at once on the same keyboard, each with their own server.
2. Per-player settings for the starting bug count (level) and drop speed; one music setting shared by all players.
3. Original 8-bit-style pixel art with animations (Lil McP throwing code, bugs wriggling, clears compiling away),
   and original chiptune music.
4. It must run on GitHub Pages as static files.
5. No build step and no dependencies: plain HTML, CSS and JavaScript modules, so there is nothing to maintain in
   the long run.

Build it in stages and check each one works before starting the next:

1. Core engine for one player.
2. Four players on one keyboard.
3. Settings screen.
4. Pixel art and animations.
5. Chiptune music with the Web Audio API.
