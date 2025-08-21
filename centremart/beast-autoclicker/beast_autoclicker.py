#!/usr/bin/env python3
import os
import sys
import time
import math
import random
import threading
from dataclasses import dataclass, field
from typing import Optional, Tuple

try:
    import tomli
except Exception:
    print("Missing dependency: tomli. Install with: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)

try:
    import keyboard  # type: ignore
    import mouse     # type: ignore
except Exception as e:
    print("Missing dependencies: keyboard, mouse. Install with: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)

try:
    from colorama import Fore, Style, init as colorama_init
    colorama_init()
except Exception:
    class Dummy:
        def __getattr__(self, _):
            return ''
    Fore = Style = Dummy()


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(value, max_value))


@dataclass
class Config:
    mode: str = "hold"  # hold | toggle
    start_paused: bool = False
    min_cps: float = 10.0
    max_cps: float = 15.0
    micro_pause_every: int = 45
    micro_pause_ms_min: int = 60
    micro_pause_ms_max: int = 140
    extra_jitter_ms_min: int = -6
    extra_jitter_ms_max: int = 9
    ui_enabled: bool = True
    ui_refresh_hz: int = 8
    # hotkeys
    hk_toggle_left: str = "f6"
    hk_toggle_right: str = "f7"
    hk_switch_mode: str = "f8"
    hk_pause_resume: str = "f9"
    hk_quit: str = "esc"

    @staticmethod
    def from_toml(path: str) -> "Config":
        cfg = Config()
        if not os.path.exists(path):
            return cfg
        with open(path, 'rb') as f:
            data = tomli.load(f)

        cfg.mode = str(data.get('mode', cfg.mode)).lower().strip()
        cfg.start_paused = bool(data.get('start_paused', cfg.start_paused))
        cfg.min_cps = float(data.get('min_cps', cfg.min_cps))
        cfg.max_cps = float(data.get('max_cps', cfg.max_cps))
        cfg.micro_pause_every = int(data.get('micro_pause_every', cfg.micro_pause_every))
        cfg.micro_pause_ms_min = int(data.get('micro_pause_ms_min', cfg.micro_pause_ms_min))
        cfg.micro_pause_ms_max = int(data.get('micro_pause_ms_max', cfg.micro_pause_ms_max))
        cfg.extra_jitter_ms_min = int(data.get('extra_jitter_ms_min', cfg.extra_jitter_ms_min))
        cfg.extra_jitter_ms_max = int(data.get('extra_jitter_ms_max', cfg.extra_jitter_ms_max))

        ui = data.get('ui', {}) or {}
        cfg.ui_enabled = bool(ui.get('enabled', cfg.ui_enabled))
        cfg.ui_refresh_hz = int(ui.get('refresh_hz', cfg.ui_refresh_hz))

        hk = data.get('hotkeys', {}) or {}
        cfg.hk_toggle_left = str(hk.get('toggle_left', cfg.hk_toggle_left))
        cfg.hk_toggle_right = str(hk.get('toggle_right', cfg.hk_toggle_right))
        cfg.hk_switch_mode = str(hk.get('switch_mode', cfg.hk_switch_mode))
        cfg.hk_pause_resume = str(hk.get('pause_resume', cfg.hk_pause_resume))
        cfg.hk_quit = str(hk.get('quit', cfg.hk_quit))

        if cfg.min_cps > cfg.max_cps:
            cfg.min_cps, cfg.max_cps = cfg.max_cps, cfg.min_cps
        cfg.min_cps = clamp(cfg.min_cps, 1.0, 50.0)
        cfg.max_cps = clamp(cfg.max_cps, 1.0, 50.0)
        cfg.micro_pause_every = max(5, cfg.micro_pause_every)
        return cfg


class HumanJitter:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self._reset_micro_target()
        self._clicks_since_pause = 0

    def _reset_micro_target(self) -> None:
        base = self.cfg.micro_pause_every
        jitter = int(base * random.uniform(-0.3, 0.3))
        self._micro_target = max(5, base + jitter)

    def next_delay_seconds(self) -> float:
        cps = random.uniform(self.cfg.min_cps, self.cfg.max_cps)
        interval_ms = 1000.0 / cps
        interval_ms += random.uniform(self.cfg.extra_jitter_ms_min, self.cfg.extra_jitter_ms_max)
        interval_ms = max(0.0, interval_ms)

        self._clicks_since_pause += 1
        if self._clicks_since_pause >= self._micro_target:
            self._clicks_since_pause = 0
            self._reset_micro_target()
            pause_ms = random.uniform(self.cfg.micro_pause_ms_min, self.cfg.micro_pause_ms_max)
            return pause_ms / 1000.0

        return interval_ms / 1000.0


@dataclass
class ClickState:
    running: bool = False
    paused: bool = False
    mode: str = "hold"  # hold | toggle
    left_toggle_on: bool = False
    right_toggle_on: bool = False
    left_is_held: bool = False
    right_is_held: bool = False
    cps_window: list = field(default_factory=list)
    last_click_ts: float = 0.0

    def record_click(self) -> None:
        now = time.time()
        if self.last_click_ts > 0:
            delta = now - self.last_click_ts
            if delta > 0:
                current_cps = 1.0 / delta
                self.cps_window.append(current_cps)
                if len(self.cps_window) > 25:
                    self.cps_window.pop(0)
        self.last_click_ts = now

    def avg_cps(self) -> float:
        if not self.cps_window:
            return 0.0
        return sum(self.cps_window) / len(self.cps_window)


class BeastAutoclicker:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.state = ClickState(running=True, paused=cfg.start_paused, mode=cfg.mode)
        self.jitter_left = HumanJitter(cfg)
        self.jitter_right = HumanJitter(cfg)
        self._threads: list[threading.Thread] = []
        self._lock = threading.Lock()

    def _should_click_left(self) -> bool:
        if self.state.paused:
            return False
        if self.state.mode == 'hold':
            return self.state.left_is_held
        return self.state.left_toggle_on

    def _should_click_right(self) -> bool:
        if self.state.paused:
            return False
        if self.state.mode == 'hold':
            return self.state.right_is_held
        return self.state.right_toggle_on

    def _click_loop(self, button: str) -> None:
        jitter = self.jitter_left if button == 'left' else self.jitter_right
        while self.state.running:
            do_click = self._should_click_left() if button == 'left' else self._should_click_right()
            if do_click:
                try:
                    mouse.click(button)
                    self.state.record_click()
                except Exception:
                    pass
                time.sleep(jitter.next_delay_seconds())
            else:
                # Sleep briefly to reduce CPU when idle
                time.sleep(0.002)

    def _keyboard_listener(self) -> None:
        # Mode switching and pause hotkeys
        keyboard.add_hotkey(self.cfg.hk_switch_mode, self._toggle_mode)
        keyboard.add_hotkey(self.cfg.hk_pause_resume, self._toggle_pause)
        keyboard.add_hotkey(self.cfg.hk_quit, self._quit)

        # Toggle mode controls
        keyboard.add_hotkey(self.cfg.hk_toggle_left, self._toggle_left)
        keyboard.add_hotkey(self.cfg.hk_toggle_right, self._toggle_right)

        # Hold detection using low-level mouse events
        mouse.hook(self._mouse_event)

        # Keep thread alive
        while self.state.running:
            time.sleep(0.05)

    def _mouse_event(self, event) -> None:
        # Instant reaction on press/release
        if event.event_type == 'down':
            if event.button == 'left':
                self.state.left_is_held = True
            elif event.button == 'right':
                self.state.right_is_held = True
        elif event.event_type == 'up':
            if event.button == 'left':
                self.state.left_is_held = False
            elif event.button == 'right':
                self.state.right_is_held = False

    def _toggle_left(self) -> None:
        if self.state.mode != 'toggle':
            return
        self.state.left_toggle_on = not self.state.left_toggle_on

    def _toggle_right(self) -> None:
        if self.state.mode != 'toggle':
            return
        self.state.right_toggle_on = not self.state.right_toggle_on

    def _toggle_mode(self) -> None:
        self.state.mode = 'toggle' if self.state.mode == 'hold' else 'hold'
        # Reset toggle states when switching to hold
        if self.state.mode == 'hold':
            self.state.left_toggle_on = False
            self.state.right_toggle_on = False

    def _toggle_pause(self) -> None:
        self.state.paused = not self.state.paused

    def _quit(self) -> None:
        self.state.running = False

    def _ui_loop(self) -> None:
        if not self.cfg.ui_enabled:
            return
        interval = 1.0 / max(1, self.cfg.ui_refresh_hz)
        while self.state.running:
            avg_cps = self.state.avg_cps()
            mode = self.state.mode
            paused = self.state.paused
            left = self.state.left_toggle_on if mode == 'toggle' else self.state.left_is_held
            right = self.state.right_toggle_on if mode == 'toggle' else self.state.right_is_held
            status = (
                f"{Fore.CYAN}Beast Autoclicker{Style.RESET_ALL} | "
                f"Mode: {Fore.YELLOW}{mode.upper()}{Style.RESET_ALL} | "
                f"Paused: {'Yes' if paused else 'No'} | "
                f"Left: {'ON' if left else 'off'} | Right: {'ON' if right else 'off'} | "
                f"Avg CPS: {avg_cps:.1f}    "
            )
            print("\r" + status, end="", flush=True)
            time.sleep(interval)
        print()

    def start(self) -> None:
        t_left = threading.Thread(target=self._click_loop, args=('left',), daemon=True)
        t_right = threading.Thread(target=self._click_loop, args=('right',), daemon=True)
        t_keys = threading.Thread(target=self._keyboard_listener, daemon=True)
        t_ui = threading.Thread(target=self._ui_loop, daemon=True)
        self._threads.extend([t_left, t_right, t_keys, t_ui])
        for t in self._threads:
            t.start()

        try:
            while self.state.running:
                time.sleep(0.05)
        except KeyboardInterrupt:
            pass
        finally:
            self.state.running = False
            time.sleep(0.1)


def main() -> None:
    cfg_path = os.path.join(os.path.dirname(__file__), 'config.toml')
    cfg = Config.from_toml(cfg_path)
    app = BeastAutoclicker(cfg)
    print(f"Loaded mode={app.state.mode}, cps=[{cfg.min_cps},{cfg.max_cps}] | Hotkeys: L={cfg.hk_toggle_left} R={cfg.hk_toggle_right} Mode={cfg.hk_switch_mode} Pause={cfg.hk_pause_resume} Quit={cfg.hk_quit}")
    print("Hold left/right to click instantly in Hold mode. In Toggle mode, use hotkeys to start/stop per button.")
    app.start()


if __name__ == '__main__':
    main()

