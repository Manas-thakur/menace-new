// Damped pendulums for the prints on the line, plus a spring on each string's sag.
//   θ'' = −k·θ − c·θ' + impulse        (θ in degrees, impulses in deg/s)
// One requestAnimationFrame loop that only runs while something is moving.

const K = 46; // stiffness (s⁻²) — about 1.1 swings a second
const C = 1.45; // damping (s⁻¹) — settles in three or four seconds
const MAX_THETA = 18;
const MAX_OMEGA = 110;
const SAG_K = 70;
const SAG_C = 6.5;

export class Swings {
  readonly theta: Float64Array;
  private omega: Float64Array;
  private awake: Uint8Array;
  readonly sag: Float64Array;
  private sagV: Float64Array;
  private raf = 0;
  private last = 0;
  enabled = false;

  constructor(
    private n: number,
    lines: number,
    private onPrint: (i: number, theta: number) => void,
    private onSag: (line: number, offset: number) => void,
    private canRun: () => boolean
  ) {
    this.theta = new Float64Array(n);
    this.omega = new Float64Array(n);
    this.awake = new Uint8Array(n);
    this.sag = new Float64Array(lines);
    this.sagV = new Float64Array(lines);
  }

  /** True while the loop is stepping (something on the line is still swinging). */
  get running(): boolean {
    return this.raf !== 0;
  }

  kick(i: number, dOmega: number) {
    if (!this.enabled || !Number.isFinite(dOmega)) return;
    this.omega[i] = Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, this.omega[i] + dOmega));
    this.awake[i] = 1;
    this.wake();
  }

  kickSag(line: number, dV: number) {
    if (!this.enabled || line >= this.sag.length) return;
    this.sagV[line] += dV;
    this.wake();
  }

  private wake() {
    if (this.raf || !this.canRun()) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.033, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    let moving = false;
    for (let i = 0; i < this.n; i++) {
      if (!this.awake[i]) continue;
      let w = this.omega[i] + (-K * this.theta[i] - C * this.omega[i]) * dt;
      let th = this.theta[i] + w * dt;
      if (th > MAX_THETA || th < -MAX_THETA) {
        th = Math.sign(th) * MAX_THETA;
        w *= -0.3;
      }
      if (Math.abs(th) < 0.015 && Math.abs(w) < 0.25) {
        th = 0;
        w = 0;
        this.awake[i] = 0;
      } else moving = true;
      this.theta[i] = th;
      this.omega[i] = w;
      this.onPrint(i, th);
    }
    for (let l = 0; l < this.sag.length; l++) {
      if (this.sag[l] === 0 && this.sagV[l] === 0) continue;
      this.sagV[l] += (-SAG_K * this.sag[l] - SAG_C * this.sagV[l]) * dt;
      this.sag[l] += this.sagV[l] * dt;
      if (Math.abs(this.sag[l]) < 0.05 && Math.abs(this.sagV[l]) < 0.5) {
        this.sag[l] = 0;
        this.sagV[l] = 0;
      } else moving = true;
      this.onSag(l, this.sag[l]);
    }
    if (moving && this.canRun()) this.raf = requestAnimationFrame(this.tick);
    else if (moving) this.settle();
  };

  /** Stop everything and put every print back at rest. */
  settle(silent = false) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (let i = 0; i < this.n; i++) {
      const was = this.theta[i] !== 0 || this.awake[i];
      this.theta[i] = 0;
      this.omega[i] = 0;
      this.awake[i] = 0;
      if (was && !silent) this.onPrint(i, 0);
    }
    for (let l = 0; l < this.sag.length; l++) {
      const was = this.sag[l] !== 0;
      this.sag[l] = 0;
      this.sagV[l] = 0;
      if (was && !silent) this.onSag(l, 0);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
