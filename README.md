# 🎛️ DJ Light Show

> An interactive, browser-based DJ light show controller with real-time music sync, 8 stunning light effects, and full visual controls — no installation needed.

![DJ Light Show](https://img.shields.io/badge/DJ-Light%20Show-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNFY4bDYgNHoiLz48L3N2Zz4=)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## ✨ Features

### 🔦 8 Light Effects
| # | Effect | Description |
|---|--------|-------------|
| 1 | **Spotlight** | Moving cone beams sweeping from the ceiling |
| 2 | **Strobe** | Rapid full-screen color flash |
| 3 | **Laser** | Sweeping laser lines across the stage |
| 4 | **Color Wash** | Flowing full-stage color washes |
| 5 | **Scanner** | Moving pinpoint scanner heads |
| 6 | **Galaxy** | Spiral galaxy particle animation |
| 7 | **Firework** | Beat-triggered firework bursts |
| 8 | **Tunnel** | Infinite zoom-through light tunnel |

### 🎨 Color Control
- **8 Palette Presets** — Rainbow, Fire, Ice, Neon, Gold, Mono, Cyber, Sunset
- **Custom Color Picker** — Pick any exact hex color
- **Hue Cycle** — Auto-rotate through the color spectrum

### 🎛️ Light Controls
- **Effect Speed** — 1 to 10
- **BPM Sync** — 60 to 200 BPM beat pulse
- **Brightness** — 10% to 100%
- **Beam Count** — 1 to 16 beams
- **Spread Angle** — 10° to 180°

### ✨ Visual FX Toggles
| Toggle | Effect |
|--------|--------|
| Fog Machine | Ambient fog atmosphere |
| Floor Glow | Reflective floor lighting |
| Beat Pulse | Ring pulse on every beat |
| Light Trail | Motion blur / persistence |
| Glitter | Floating glitter particles |
| Hue Cycle | Continuous hue rotation |

### 🔄 Auto Effects
- **Change Interval** — Set how often the effect auto-switches (2–30 seconds)
- **Shuffle Order** — Random or sequential effect cycling

### 🎵 Music Sync (Web Audio API)
- **🎤 Microphone** — Captures live audio from your mic; clap, snap, or play music nearby
- **📂 Audio File** — Load a local audio file and sync lights to it
- **Real-time Frequency Visualizer** — 64-bar spectrum analyzer in the panel
- **Beat Meter Bar** — Glowing bass-pulse bar at the bottom of the stage
- **Sensitivity** — Control how aggressively audio drives the lights
- **Bass Threshold** — Set how loud the bass must be to trigger a beat

#### React Modes
| Mode | Behavior |
|------|----------|
| **Bright** | Brightness surges with bass energy |
| **Beams** | Beam count pulses (2→16) with bass |
| **Color** | Hue shifts on every detected beat |
| **Effect** | Randomly switches effects on strong beats |

#### Accepted Audio File Formats
`.mp3` · `.wav` · `.ogg` · `.m4a` · `.aac` · `.flac`

### 🖥️ UI Controls
- **Fullscreen Toggle** — Top-right button or `F11`
- **Panel Toggle** — Slide the control panel in/out with the `◀` tab or `✕` close button

---

## 🚀 Getting Started

No installation, no dependencies, no build step.

1. **Download or clone** this repo
2. **Open** `index.html` in any modern browser
3. **Enjoy the show!** 🎉

```bash
# Clone
git clone https://github.com/yourname/dj-light-show.git

# Open
cd dj-light-show
start index.html       # Windows
open index.html        # macOS
xdg-open index.html    # Linux
```

> ✅ Works best in **Chrome** or **Edge**. Firefox supported. Requires a browser with Web Audio API support.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` – `8` | Switch to effect 1–8 |
| `↑` / `↓` | Increase / decrease speed |
| `A` | Toggle Auto mode |
| `B` | Toggle Blackout |
| `F` | Flash (one-shot white burst) |
| `M` | Toggle Microphone sync |
| `P` | Toggle control panel |
| `F11` | Toggle fullscreen |

---

## 📁 Project Structure

```
DJ Light/
├── index.html   — Main HTML, stage layout & control panel
├── style.css    — All styles, dark theme, animations
├── app.js       — Light engine, music sync, control wiring
└── README.md    — You are here
```

---

## 🛠️ Tech Stack

- **HTML5 Canvas** — All light effects rendered in real-time
- **Web Audio API** — Microphone & file audio analysis, FFT beat detection
- **Vanilla CSS** — Dark glassmorphism UI, smooth transitions
- **Vanilla JS** — Zero dependencies, zero frameworks

---

## 🎤 Music Sync Tips

- **Best results:** Use **Beams** or **Bright** react mode with bass-heavy music
- **For mic sync:** Play music loud near your mic, or use a system audio loopback
- **For file sync:** `.mp3` files with a strong kick drum work best for beat detection
- Adjust **Sensitivity** up if lights aren't reacting, down if they're too chaotic
- Adjust **Bass Threshold** to filter out background noise

---

## 📄 License

MIT — free to use, remix, and share. Have fun! 🎶

---

<p align="center">Made with ❤️ and lots of neon lights</p>
