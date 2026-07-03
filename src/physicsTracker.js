export class PhysicsTracker {
    constructor() {
        this.reset();
    }

    reset() {
        this.collisionLog = [];
        this.energyHistory = [];
        this.periodTracker = { lastCrossTime: null, lastDir: null, measured: null };
    }

    logCollision(time, ballA, ballB, vA, vB, vA_new, vB_new, impulse, collisionForce, energyLost) {
        this.collisionLog.push({
            time, ballA, ballB,
            vA_before: vA, vB_before: vB,
            vA_after: vA_new, vB_after: vB_new,
            impulse, collisionForce, energyLost,
        });
        if (this.collisionLog.length > 200) this.collisionLog.shift();
    }

    trackPeriod(ball, time) {
        const dir = ball.omega < 0 ? -1 : 1;
        const pt = this.periodTracker;

        if (pt.lastDir === 1 && dir === -1 && Math.abs(ball.theta) < 0.1) {
            if (pt.lastCrossTime !== null) {
                pt.measured = (time - pt.lastCrossTime) * 2;
            }
            pt.lastCrossTime = time;
        }
        pt.lastDir = dir;
    }

    recordEnergy(time, KE, PE, TE) {
        const last = this.energyHistory[this.energyHistory.length - 1];
        if (last && time - last.time < 0.05) return;

        this.energyHistory.push({ time, KE, PE, TE });
        if (this.energyHistory.length > 500) this.energyHistory.shift();
    }

    getInitialTotalEnergy() {
        return this.energyHistory.length > 0 ? this.energyHistory[0].TE : null;
    }
}