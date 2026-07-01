
export class NewtonsCradlePhysics {

    constructor(config = {}) {


        this.G = 9.81;
        this.numBalls = config.numBalls ?? 5;
        this.L = config.stringLength ?? 0.3;
        this.m = config.ballMass ?? 0.1;
        this.R = config.ballRadius ?? 0.05;
        this.e = config.restitution ?? 0.97;
        this.b = config.airDamping ?? 0.004;
        this.substeps = config.substeps ?? 10;

        this.spacing = 2 * this.R;

        this.collisionLog = [];
        this.energyHistory = [];
        this.time = 0;

        this._periodTracker = {
            lastCrossTime: null,
            lastDir: null,
            measured: null,
        };

        this._initBalls();
    }


    _initBalls() {

        this.balls = Array.from({ length: this.numBalls }, (_, i) => ({
            theta: 0,
            omega: 0,
            x0: (i - (this.numBalls - 1) / 2) * this.spacing,
        }));

        this.collisionLog = [];
        this.energyHistory = [];
        this.time = 0;
        this._periodTracker = { lastCrossTime: null, lastDir: null, measured: null };
    }


    reset() { this._initBalls(); }

    lift(count, angleRad) {
        count = Math.max(1, Math.min(count, this.numBalls - 1));
        angleRad = Math.abs(angleRad);
        for (let i = 0; i < count; i++) {
            this.balls[i].theta = -angleRad;
            this.balls[i].omega = 0;
        }
    }



    liftRight(count, angleRad) {
        count = Math.max(1, Math.min(count, this.numBalls - 1));
        angleRad = Math.abs(angleRad);

        for (let i = 0; i < count; i++) {
            const index = (this.numBalls - 1) - i;
            this.balls[index].theta = angleRad;
            this.balls[index].omega = 0;
        }
    }

    release() { }

    step(dt) {
        dt = Math.min(dt, 0.05);
        const subDt = dt / this.substeps;

        this.justCollided = false;
        this.maxImpulse = 0;

        for (let s = 0; s < this.substeps; s++) {
            this._integrate(subDt);
            this._resolveCollisions(subDt);
        }
        this.time += dt;
        this._trackPeriod();
        this._recordEnergy();
    }

    getBalls() {
        return this.balls.map((b, i) => {
            const sinT = Math.sin(b.theta);
            const cosT = Math.cos(b.theta);
            const v = this.L * b.omega;
            const h = this.L * (1 - cosT);

            const tension = this.m * this.G * cosT + this.m * v * v / this.L;

            const dragForce = this.b * Math.abs(v);

            return {
                index: i,
                x: b.x0 + this.L * sinT,
                y: -this.L * cosT,
                theta: b.theta,
                omega: b.omega,
                speed: Math.abs(v),
                height: h,
                tension,
                dragForce,
                weight: this.m * this.G,
            };
        });
    }


    getEnergy() {
        let KE = 0, PE = 0;
        this.balls.forEach(b => {
            const v = this.L * b.omega;
            KE += 0.5 * this.m * v * v;
            PE += this.m * this.G * this.L * (1 - Math.cos(b.theta));
        });
        const TE = KE + PE;
        const initialTE = this.energyHistory.length > 0
            ? this.energyHistory[0].TE
            : TE;
        return { KE, PE, TE, dissipated: Math.max(0, initialTE - TE) };
    }


    getPeriod() {
        return {
            theoretical: 2 * Math.PI * Math.sqrt(this.L / this.G),
            measured: this._periodTracker.measured,
        };
    }


    getCollisionLog() { return [...this.collisionLog]; }


    getEnergyHistory() { return [...this.energyHistory]; }

    setRestitution(e) { this.e = Math.max(0, Math.min(1, e)); }

    setAirDamping(b) { this.b = Math.max(0, b); }


    _integrate(dt) {

        const g_over_L = this.G / this.L;
        const b_over_m = this.b / this.m;

        this.balls.forEach(ball => {
            const alpha = -g_over_L * Math.sin(ball.theta)
                - b_over_m * ball.omega;

            ball.omega += alpha * dt;
            ball.theta += ball.omega * dt;
        });
    }


    _resolveCollisions(dt) {

        const L = this.L;
        const e = this.e;

        for (let pass = 0; pass < this.numBalls; pass++) {
            for (let i = 0; i < this.numBalls - 1; i++) {
                const A = this.balls[i];
                const B = this.balls[i + 1];

                const xA = A.x0 + L * Math.sin(A.theta);
                const xB = B.x0 + L * Math.sin(B.theta);

                const vA = L * A.omega;
                const vB = L * B.omega;

                const penetration = this.spacing - (xB - xA);

                if (penetration >= -1e-6 && vA > vB) {

                    const vA_new = ((1 - e) / 2) * vA + ((1 + e) / 2) * vB;
                    const vB_new = ((1 + e) / 2) * vA + ((1 - e) / 2) * vB;


                    let impulse = this.m * Math.abs(vB_new - vB);
                    const MAX_IMPULSE = 50;
                    impulse = Math.min(impulse, MAX_IMPULSE);


                    this.justCollided = true;
                    this.maxImpulse = Math.max(this.maxImpulse, impulse);

                    const subDtSafe = dt > 1e-9 ? dt : 1e-3;
                    const collisionForce = impulse / subDtSafe;


                    const KE_before = 0.5 * this.m * (vA * vA + vB * vB);
                    const KE_after = 0.5 * this.m * (vA_new * vA_new + vB_new * vB_new);
                    const energyLost = KE_before - KE_after;


                    A.omega = vA_new / L;
                    B.omega = vB_new / L;


                    if (penetration > 1e-6) {

                        const safeCorr = (penetration / 2) + 1e-5;
                        A.theta -= safeCorr / L;
                        B.theta += safeCorr / L;
                    }


                    if (impulse > 0.01) {
                        this.collisionLog.push({
                            time: this.time,
                            ballA: i,
                            ballB: i + 1,
                            vA_before: vA,
                            vB_before: vB,
                            vA_after: vA_new,
                            vB_after: vB_new,
                            impulse,
                            collisionForce,
                            energyLost,
                        });

                        if (this.collisionLog.length > 200) this.collisionLog.shift();
                    }
                }
            }
        }
    }

    _trackPeriod() {

        const ball = this.balls[0];
        const dir = ball.omega < 0 ? -1 : 1;
        const pt = this._periodTracker;

        if (pt.lastDir === 1 && dir === -1 && Math.abs(ball.theta) < 0.1) {
            if (pt.lastCrossTime !== null) {
                pt.measured = (this.time - pt.lastCrossTime) * 2;
            }
            pt.lastCrossTime = this.time;
        }
        pt.lastDir = dir;
    }


    _recordEnergy() {

        const last = this.energyHistory[this.energyHistory.length - 1];
        if (last && this.time - last.time < 0.05) return;

        const { KE, PE, TE } = this.getEnergy();
        this.energyHistory.push({ time: this.time, KE, PE, TE });

        if (this.energyHistory.length > 500) this.energyHistory.shift();
    }



    getImpactVelocity(thetaRad) {
        return Math.sqrt(2 * this.G * this.L * (1 - Math.cos(thetaRad)));
    }


    getTension(ballIndex) {
        const b = this.balls[ballIndex];
        const v = this.L * b.omega;
        return this.m * this.G * Math.cos(b.theta)
            + this.m * v * v / this.L;
    }

    getDragForce(ballIndex) {
        return this.b * Math.abs(this.L * this.balls[ballIndex].omega);
    }


    getMaxHeight(thetaRad) {
        return this.L * (1 - Math.cos(thetaRad));
    }


    getStringCoords(ballIndex, pivotY = 0, zOffset = 0) {
        const b = this.balls[ballIndex];
        const ballX = b.x0 + this.L * Math.sin(b.theta);
        const ballY = pivotY - this.L * Math.cos(b.theta);
        return {
            top: { x: b.x0, y: pivotY, z: zOffset },
            bottom: { x: ballX, y: ballY, z: zOffset },
        };
    }

}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NewtonsCradlePhysics };
}

