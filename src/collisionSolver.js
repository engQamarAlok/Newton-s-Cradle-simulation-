export class CollisionSolver {
  
    static resolve(dt, balls, tracker, time, config) {
        const { L, e, m, spacing } = config;
        let justCollided = false;
        let maxImpulse = 0;
        const numBalls = balls.length;

        for (let pass = 0; pass < numBalls; pass++) {
            for (let i = 0; i < numBalls - 1; i++) {
                const A = balls[i];
                const B = balls[i + 1];

              
                const xA = A.x0 + L * Math.sin(A.theta);
                const xB = B.x0 + L * Math.sin(B.theta);

      
                const vA = A.getVelocity();
                const vB = B.getVelocity();

                const penetration = spacing - (xB - xA);

      
                if (penetration >= -1e-6 && vA > vB) {
    
                    const vA_new = ((1 - e) / 2) * vA + ((1 + e) / 2) * vB;
                    const vB_new = ((1 + e) / 2) * vA + ((1 - e) / 2) * vB;

                    let impulse = Math.min(m * Math.abs(vB_new - vB), 50);

                    justCollided = true;
                    maxImpulse = Math.max(maxImpulse, impulse);

                    const subDtSafe = dt > 1e-9 ? dt : 1e-3;
                    const collisionForce = impulse / subDtSafe;

             
                    const KE_before = A.getKineticEnergy() + B.getKineticEnergy();
                    A.omega = vA_new / L;
                    B.omega = vB_new / L;
                    const KE_after = A.getKineticEnergy() + B.getKineticEnergy();
                    const energyLost = KE_before - KE_after;

               
                    if (penetration > 1e-6) {
                        const safeCorr = (penetration / 2) + 1e-5;
                        A.theta -= safeCorr / L;
                        B.theta += safeCorr / L;
                    }

               
                    if (impulse > 0.01) {
                        tracker.logCollision(time, i, i + 1, vA, vB, vA_new, vB_new, impulse, collisionForce, energyLost);
                    }
                }
            }
        }
        
        return { justCollided, maxImpulse };
    }
}