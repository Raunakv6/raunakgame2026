# Dino Dash

A complete, original desert endless-runner built with HTML5 Canvas, CSS, and vanilla JavaScript. Leap over cacti and rocks, duck beneath swooping birds, and see how far your little dinosaur can run.

## Features

- Original canvas-drawn dinosaur, desert scenery, obstacles, clouds, and particle effects.
- Smooth jump physics, running animation, ducking, collision detection, and touch controls.
- Increasing pace, survival score, score milestones, and a locally saved personal best.
- Gradual day/night color transitions, optional Web Audio effects, pause/resume, and screen shake.
- Responsive layout designed for desktop and portrait mobile screens. No frameworks, external assets, or backend.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Jump / start | `Space` or `↑` | Tap the canvas or **JUMP** |
| Duck | Hold `↓` | Hold **DUCK** |
| Pause / resume | `P` or `Esc` | Pause button |
| Start / restart | `Enter` or on-screen button | On-screen button |

Use the sound button in the header to mute or enable generated sound effects. Your high score is saved in this browser using `localStorage`.

## Run locally

Download or clone this repository, then open `index.html` in a modern browser. There is no build step or package installation.

## Deploy with GitHub Pages

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and `/ (root)` folder, then save.
4. After the deployment finishes, open the Pages URL shown in the settings.

All game files are at the repository root, so no additional configuration is needed. The game itself has no external runtime dependencies; the optional font import falls back to system sans-serif fonts when offline.
