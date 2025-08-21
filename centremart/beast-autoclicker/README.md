## Beast Autoclicker

Human-like, fully modifiable autoclicker. Works on Linux/macOS/Windows via Python. Defaults to hold-to-click with instant start/stop and 10–15 CPS with natural jitter.

### Features
- Hold mode: hold left/right mouse button to click instantly; release stops immediately (0 ms delay)
- Toggle mode: press once to start, press again to stop (per button)
- Humanized CPS: varies between 10–15 CPS with small randomness and occasional micro-pauses
- Live hotkeys and on-screen status
- Configurable via `config.toml`

### Requirements
- Python 3.9+
- Packages: see `requirements.txt`

Install deps:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run (terminal UI)
```bash
python beast_autoclicker.py
```

### Run GUI
```bash
python beast_gui.py
```

### Hotkeys (while running)
- F6: toggle Left autoclick (in toggle mode)
- F7: toggle Right autoclick (in toggle mode)
- F8: switch mode (Hold ⇄ Toggle)
- F9: pause/resume all clicking
- ESC: quit

In Hold mode you do not need hotkeys; just hold the mouse button.

### Configuration
Copy the example and edit:
```bash
cp config.example.toml config.toml
```

Key options in `config.toml`:
- `mode`: "hold" or "toggle"
- `min_cps`, `max_cps`: bounds for CPS (10–15 by default)
- `micro_pause_every`: number of clicks between small rest moments (randomized around this value)
- `micro_pause_ms`: how long the micro-pause lasts (range)
- `start_paused`: start in paused state
- `ui.enabled`: show a simple status panel in terminal
- `hotkeys.*`: customize function keys

### Build a standalone EXE (optional)
You can package the GUI into a single file using PyInstaller:
```bash
pip install pyinstaller
pyinstaller --noconfirm --onefile --windowed beast_gui.py
```
The built executable will be under `dist/`. On Linux/macOS, you may need to grant input permissions for global hooks.

### Notes
- On some Linux desktops you may need to run the terminal with proper permissions for global input hooks.
- If clicks feel too robotic, lower `min_cps`, raise `micro_pause_ms`, or widen jitter by editing the config.

