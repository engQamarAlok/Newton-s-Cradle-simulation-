export class PendulumBall {
    constructor(index, x0, config) {
        this.index = index;
        this.x0 = x0;
        this.theta = 0;
        this.omega = 0;

        this.L = config.L;
        this.m = config.m;
        this.G = config.G;

    }


    getVelocity() {
        return this.L * this.omega;
    }

    
    getKineticEnergy() {
        const v = this.getVelocity();
        return 0.5 * this.m * v * v;
    }

   
    getPotentialEnergy() {
        return this.m * this.G * this.L * (1 - Math.cos(this.theta));
    }

   
    getTension() {
        const v = this.getVelocity();
        return this.m * this.G * Math.cos(this.theta) + (this.m * v * v) / this.L;
    }

    getDragForce(currentB) {
        return currentB * Math.abs(this.getVelocity());
    }

    getMaxHeight() {
        return this.L * (1 - Math.cos(this.theta));
    }

    getImpactVelocity() {
        return Math.sqrt(2 * this.G * this.L * (1 - Math.cos(this.theta)));
    }
}