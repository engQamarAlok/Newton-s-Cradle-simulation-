import { PendulumBall } from './pendulumBall.js';
import { PhysicsTracker } from './physicsTracker.js';
import { CollisionSolver } from './collisionSolver.js';

export class NewtonsCradlePhysics {
    constructor(config = {}) {
        this.G = 9.81;
        this.numBalls = config.numBalls ?? 5;
        this.L = config.stringLength ?? 0.3;
        this.m = config.ballMass ?? 0.1;
        this.R = config.ballRadius ?? 0.05;
        this.e = config.restitution ?? 0.97;
        this.b = config.airDamping ?? 0.004;
        this.initialAngle = config.initialAngle ?? Math.PI / 4;
        this.substeps = config.substeps ?? 30;
        this.spacing = 2 * this.R;
        this.time = 0;

        this.tracker = new PhysicsTracker();

       
        this.justCollided = false;
        this.maxImpulse = 0;

        this._initBalls();
    }

    _initBalls() {
        this.balls = Array.from({ length: this.numBalls }, (_, i) => {
            const x0 = (i - (this.numBalls - 1) / 2) * this.spacing;
            return new PendulumBall(i, x0, { L: this.L, m: this.m, G: this.G, b: this.b });
        });
        
        this.tracker.reset();
        this.time = 0;
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

    step(dt) {
        dt = Math.min(dt, 0.05);
        const subDt = dt / this.substeps;

        this.justCollided = false;
        this.maxImpulse = 0;

       
        const solverConfig = { L: this.L, e: this.e, m: this.m, spacing: this.spacing };

        for (let s = 0; s < this.substeps; s++) {
            this._integrate(subDt);
            
           
            const result = CollisionSolver.resolve(subDt, this.balls, this.tracker, this.time, solverConfig);
            
            if (result.justCollided) {
                this.justCollided = true;
                this.maxImpulse = Math.max(this.maxImpulse, result.maxImpulse);
            }
        }
        
        this.time += dt;
        
        this.tracker.trackPeriod(this.balls[0], this.time);
        
        const energy = this.getEnergy();
        this.tracker.recordEnergy(this.time, energy.KE, energy.PE, energy.TE);
    }

    _integrate(dt) {
        const g_over_L = this.G / this.L;
        const b_over_m = this.b / this.m;

        this.balls.forEach(ball => {
            const alpha = -g_over_L * Math.sin(ball.theta) - b_over_m * ball.omega;
            ball.omega += alpha * dt;
            ball.theta += ball.omega * dt;
        });
    }

   
    
    getBalls() {
        return this.balls.map(b => {
            const sinT = Math.sin(b.theta);
            const cosT = Math.cos(b.theta);
            return {
                index: b.index,
                x: b.x0 + this.L * sinT,
                y: -this.L * cosT,
                theta: b.theta,
                omega: b.omega,
                speed: Math.abs(b.getVelocity()),
                height: b.getMaxHeight(),
                tension: b.getTension(),
                weight: this.m * this.G,
                impactVelocity: b.getImpactVelocity(),
                dragForce: b.getDragForce(this.b),
            };
        });
    }

    getEnergy() {
        let KE = 0, PE = 0;
        this.balls.forEach(b => {
            KE += b.getKineticEnergy();
            PE += b.getPotentialEnergy();
        });
        const TE = KE + PE;
        const initialTE = this.tracker.getInitialTotalEnergy() ?? TE;
        return { KE, PE, TE, dissipated: Math.max(0, initialTE - TE) };
    }

    getPeriod() {
        return {
            theoretical: 2 * Math.PI * Math.sqrt(this.L / this.G),
            measured: this.tracker.periodTracker.measured,
        };
    }

    getCollisionLog() { 
        return [...this.tracker.collisionLog]; 
    }
}