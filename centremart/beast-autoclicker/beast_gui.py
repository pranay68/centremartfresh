#!/usr/bin/env python3
import os
import threading
import tkinter as tk
from tkinter import ttk, messagebox

from beast_autoclicker import Config, BeastAutoclicker


class BeastGUI(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Beast Autoclicker")
        self.geometry("560x430")
        self.resizable(False, False)

        self.cfg_path = os.path.join(os.path.dirname(__file__), 'config.toml')
        self.cfg = Config.from_toml(self.cfg_path)
        self.app: BeastAutoclicker | None = None
        self.app_thread: threading.Thread | None = None

        self._build_ui()
        self._refresh_status()

    def _build_ui(self) -> None:
        pad = {"padx": 10, "pady": 8}

        frm_top = ttk.LabelFrame(self, text="Mode")
        frm_top.pack(fill="x", **pad)
        self.mode_var = tk.StringVar(value=self.cfg.mode)
        ttk.Radiobutton(frm_top, text="Hold (press-and-hold to click)", variable=self.mode_var, value="hold",
                        command=self._apply_mode).pack(anchor="w", padx=10, pady=4)
        ttk.Radiobutton(frm_top, text="Toggle (press key once to start/stop)", variable=self.mode_var, value="toggle",
                        command=self._apply_mode).pack(anchor="w", padx=10, pady=4)

        frm_cps = ttk.LabelFrame(self, text="CPS (Clicks per second)")
        frm_cps.pack(fill="x", **pad)
        row = ttk.Frame(frm_cps)
        row.pack(fill="x", padx=10, pady=6)
        ttk.Label(row, text="From:").pack(side="left")
        self.min_cps_var = tk.StringVar(value=str(int(self.cfg.min_cps)))
        self.max_cps_var = tk.StringVar(value=str(int(self.cfg.max_cps)))
        self.min_cps_entry = ttk.Entry(row, textvariable=self.min_cps_var, width=6)
        self.min_cps_entry.pack(side="left", padx=6)
        ttk.Label(row, text="to").pack(side="left")
        self.max_cps_entry = ttk.Entry(row, textvariable=self.max_cps_var, width=6)
        self.max_cps_entry.pack(side="left", padx=6)
        ttk.Label(row, text="(randomly varies within this range)").pack(side="left", padx=8)

        frm_human = ttk.LabelFrame(self, text="Humanization")
        frm_human.pack(fill="x", **pad)
        r1 = ttk.Frame(frm_human); r1.pack(fill="x", padx=10, pady=4)
        ttk.Label(r1, text="Micro pause every ~").pack(side="left")
        self.micro_every_var = tk.StringVar(value=str(self.cfg.micro_pause_every))
        ttk.Entry(r1, textvariable=self.micro_every_var, width=6).pack(side="left", padx=6)
        ttk.Label(r1, text="clicks").pack(side="left")

        r2 = ttk.Frame(frm_human); r2.pack(fill="x", padx=10, pady=4)
        ttk.Label(r2, text="Micro pause ms:").pack(side="left")
        self.micro_min_var = tk.StringVar(value=str(self.cfg.micro_pause_ms_min))
        self.micro_max_var = tk.StringVar(value=str(self.cfg.micro_pause_ms_max))
        ttk.Entry(r2, textvariable=self.micro_min_var, width=6).pack(side="left", padx=6)
        ttk.Label(r2, text="to").pack(side="left")
        ttk.Entry(r2, textvariable=self.micro_max_var, width=6).pack(side="left", padx=6)

        r3 = ttk.Frame(frm_human); r3.pack(fill="x", padx=10, pady=4)
        ttk.Label(r3, text="Extra jitter ms:").pack(side="left")
        self.jitter_min_var = tk.StringVar(value=str(self.cfg.extra_jitter_ms_min))
        self.jitter_max_var = tk.StringVar(value=str(self.cfg.extra_jitter_ms_max))
        ttk.Entry(r3, textvariable=self.jitter_min_var, width=6).pack(side="left", padx=6)
        ttk.Label(r3, text="to").pack(side="left")
        ttk.Entry(r3, textvariable=self.jitter_max_var, width=6).pack(side="left", padx=6)

        frm_ctl = ttk.LabelFrame(self, text="Controls")
        frm_ctl.pack(fill="x", **pad)
        c1 = ttk.Frame(frm_ctl); c1.pack(fill="x", padx=10, pady=6)
        ttk.Button(c1, text="Apply Settings", command=self._apply_settings).pack(side="left")
        ttk.Button(c1, text="Start", command=self._start).pack(side="left", padx=8)
        ttk.Button(c1, text="Pause/Resume", command=self._pause_resume).pack(side="left", padx=8)
        ttk.Button(c1, text="Stop", command=self._stop).pack(side="left", padx=8)

        help_txt = (
            "Hold mode: press and hold mouse buttons to click instantly.\n"
            "Toggle mode hotkeys: F6=Left, F7=Right, F8=Switch Mode, F9=Pause, ESC=Quit."
        )
        ttk.Label(frm_ctl, text=help_txt, foreground="#666").pack(anchor="w", padx=10)

        frm_status = ttk.LabelFrame(self, text="Status")
        frm_status.pack(fill="x", **pad)
        s1 = ttk.Frame(frm_status); s1.pack(fill="x", padx=10, pady=6)
        self.lbl_mode = ttk.Label(s1, text="Mode: -")
        self.lbl_paused = ttk.Label(s1, text="Paused: -")
        self.lbl_left = ttk.Label(s1, text="Left: -")
        self.lbl_right = ttk.Label(s1, text="Right: -")
        self.lbl_cps = ttk.Label(s1, text="Avg CPS: -")
        for w in (self.lbl_mode, self.lbl_paused, self.lbl_left, self.lbl_right, self.lbl_cps):
            w.pack(side="left", padx=10)

    def _parse_int(self, var: tk.StringVar, default: int, min_v: int | None = None, max_v: int | None = None) -> int:
        try:
            val = int(float(var.get().strip()))
        except Exception:
            val = default
        if min_v is not None:
            val = max(min_v, val)
        if max_v is not None:
            val = min(max_v, val)
        return val

    def _parse_float(self, var: tk.StringVar, default: float, min_v: float | None = None, max_v: float | None = None) -> float:
        try:
            val = float(var.get().strip())
        except Exception:
            val = default
        if min_v is not None:
            val = max(min_v, val)
        if max_v is not None:
            val = min(max_v, val)
        return val

    def _apply_mode(self) -> None:
        self.cfg.mode = self.mode_var.get()
        if self.app:
            # Switch live
            self.app.state.mode = self.cfg.mode
            if self.app.state.mode == 'hold':
                self.app.state.left_toggle_on = False
                self.app.state.right_toggle_on = False

    def _apply_settings(self) -> None:
        min_cps = self._parse_float(self.min_cps_var, self.cfg.min_cps, 1.0, 50.0)
        max_cps = self._parse_float(self.max_cps_var, self.cfg.max_cps, 1.0, 50.0)
        if min_cps > max_cps:
            min_cps, max_cps = max_cps, min_cps
        self.cfg.min_cps, self.cfg.max_cps = min_cps, max_cps

        self.cfg.micro_pause_every = self._parse_int(self.micro_every_var, self.cfg.micro_pause_every, 5, 1000)
        self.cfg.micro_pause_ms_min = self._parse_int(self.micro_min_var, self.cfg.micro_pause_ms_min, 0, 2000)
        self.cfg.micro_pause_ms_max = self._parse_int(self.micro_max_var, max(self.cfg.micro_pause_ms_max, self.cfg.micro_pause_ms_min), 0, 3000)
        if self.cfg.micro_pause_ms_min > self.cfg.micro_pause_ms_max:
            self.cfg.micro_pause_ms_min, self.cfg.micro_pause_ms_max = self.cfg.micro_pause_ms_max, self.cfg.micro_pause_ms_min

        self.cfg.extra_jitter_ms_min = self._parse_int(self.jitter_min_var, self.cfg.extra_jitter_ms_min, -50, 0)
        self.cfg.extra_jitter_ms_max = self._parse_int(self.jitter_max_var, self.cfg.extra_jitter_ms_max, 0, 50)
        if self.cfg.extra_jitter_ms_min > self.cfg.extra_jitter_ms_max:
            self.cfg.extra_jitter_ms_min, self.cfg.extra_jitter_ms_max = self.cfg.extra_jitter_ms_max, self.cfg.extra_jitter_ms_min

        messagebox.showinfo("Beast Autoclicker", "Settings applied. They take effect immediately for running clicks.")

    def _start(self) -> None:
        if self.app and self.app.state.running:
            messagebox.showinfo("Beast Autoclicker", "Already running.")
            return
        self._apply_settings()
        self.app = BeastAutoclicker(self.cfg)
        self.app_thread = threading.Thread(target=self.app.start, daemon=True)
        self.app_thread.start()

    def _pause_resume(self) -> None:
        if self.app:
            self.app._toggle_pause()

    def _stop(self) -> None:
        if self.app:
            self.app._quit()
            self.app = None
            self.app_thread = None

    def _refresh_status(self) -> None:
        if self.app:
            mode = self.app.state.mode
            paused = self.app.state.paused
            left = self.app.state.left_toggle_on if mode == 'toggle' else self.app.state.left_is_held
            right = self.app.state.right_toggle_on if mode == 'toggle' else self.app.state.right_is_held
            cps = self.app.state.avg_cps()
            self.lbl_mode.config(text=f"Mode: {mode.upper()}")
            self.lbl_paused.config(text=f"Paused: {'Yes' if paused else 'No'}")
            self.lbl_left.config(text=f"Left: {'ON' if left else 'off'}")
            self.lbl_right.config(text=f"Right: {'ON' if right else 'off'}")
            self.lbl_cps.config(text=f"Avg CPS: {cps:.1f}")
        else:
            self.lbl_mode.config(text="Mode: -")
            self.lbl_paused.config(text="Paused: -")
            self.lbl_left.config(text="Left: -")
            self.lbl_right.config(text="Right: -")
            self.lbl_cps.config(text="Avg CPS: -")
        self.after(125, self._refresh_status)


if __name__ == '__main__':
    app = BeastGUI()
    app.mainloop()

