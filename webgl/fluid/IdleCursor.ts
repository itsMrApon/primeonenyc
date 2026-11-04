import { Vector2 } from "three";

/**
 * Drives the fluid when nobody is moving the mouse (reference behaviour):
 * - starts idle 2.5 s after creation;
 * - any mousemove / touchmove hands control to the real pointer for 2 s;
 * - while idle, a 9.5 s loop plays from the start: a 2.5 s zig-zag sweep
 *   down the screen, a 1.5 s pause, a 2.5 s sweep back up, then 3 s rest.
 *   x = −cos(4π·px)·0.75 (px eased power1.inOut), y = cos(π·py)·0.5 (linear).
 */
const SWEEP = 2.5;
const SECOND_SWEEP_AT = 4;
const CYCLE = SECOND_SWEEP_AT + SWEEP + 3;
const START_IDLE_AFTER = 2.5;
const RESUME_IDLE_AFTER = 2;

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

export class IdleCursor {
  readonly cursor = new Vector2();
  isMoving = true;

  #idleSince = 0;
  #lastMove = -Infinity;
  // The reference's tween pre-renders its end state, so the very first idle
  // frame reads progress (1, 1) → cursor (−0.75, −0.5) before snapping to the
  // start. Later idle restarts read whatever progress was left. Keep both.
  readonly #progress = new Vector2(1, 1);
  readonly #onMove = () => {
    this.#lastMove = performance.now() / 1000;
  };

  constructor(private readonly startedAt = performance.now() / 1000) {
    document.addEventListener("mousemove", this.#onMove);
    document.addEventListener("touchmove", this.#onMove);
  }

  update(now = performance.now() / 1000) {
    const userActive = now - this.#lastMove < RESUME_IDLE_AFTER;
    const bootActive = this.#lastMove === -Infinity && now - this.startedAt < START_IDLE_AFTER;
    const moving = userActive || bootActive;

    const wasMoving = this.isMoving;
    this.isMoving = moving;
    if (moving) return;

    if (wasMoving) {
      // Transition frame: stale progress, then the loop restarts from 0.
      this.#applyCursor();
      this.#idleSince = now;
      this.#setProgress(0);
      return;
    }
    this.#setProgress(now - this.#idleSince);
    this.#applyCursor();
  }

  #setProgress(elapsed: number) {
    const t = elapsed % CYCLE;
    if (t < SECOND_SWEEP_AT) {
      const k = clamp01(t / SWEEP);
      this.#progress.set(easeInOutQuad(k), k);
    } else {
      const k = clamp01((t - SECOND_SWEEP_AT) / SWEEP);
      this.#progress.set(1 - easeInOutQuad(k), 1 - k);
    }
  }

  #applyCursor() {
    this.cursor.set(-Math.cos(this.#progress.x * Math.PI * 4) * 0.75, Math.cos(this.#progress.y * Math.PI) * 0.5);
  }

  dispose() {
    document.removeEventListener("mousemove", this.#onMove);
    document.removeEventListener("touchmove", this.#onMove);
  }
}
