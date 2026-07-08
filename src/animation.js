import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { NewtonsCradlePhysics } from './physics.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export class AnimationSystem {
    constructor(scene, camera, renderer, controls, pivotGroups, config) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.pivotGroups = pivotGroups;
        this.physics = new NewtonsCradlePhysics(config);
        this.audioCtx = null;
        this.setupGUI();
        this.clock = new THREE.Clock();
        this.animate = this.animate.bind(this);
        this.lastCollisionId = null;
        this.initUI();
    }

    start() {
        this.animate();
    }


    initUI() {
        const ctx = document.getElementById('energyChart').getContext('2d');

        this.energyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(50).fill(''),
                datasets: [
                    { label: 'KE (حركية)', borderColor: '#ff4757', data: Array(50).fill(0), pointRadius: 0, borderWidth: 2, tension: 0.2 },
                    { label: 'PE (وضع)', borderColor: '#1e90ff', data: Array(50).fill(0), pointRadius: 0, borderWidth: 2, tension: 0.2 },
                    { label: 'TE (كلية)', borderColor: '#2ed573', data: Array(50).fill(0), pointRadius: 0, borderWidth: 2, tension: 0.2, borderDash: [5, 5] }
                ]
            },
            options: {
                animation: false,
                responsive: true,
                scales: {
                    x: { display: false },
                    y: { beginAtZero: true, grid: { color: '#444' } }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } }
                }
            }
        });

        this.frameCount = 0;
    }

    updateUI() {
        this.frameCount++;

        if (this.frameCount % 3 === 0) {

            let energy = this.physics.getEnergy();
            const threshold = 0.0001;
            let finalKE = Math.abs(energy.KE) < threshold ? 0 : energy.KE;
            let finalPE = Math.abs(energy.PE) < threshold ? 0 : energy.PE;
            let finalTE = Math.abs(energy.TE) < threshold ? 0 : energy.TE;

            this.energyChart.data.datasets[0].data.shift();
            this.energyChart.data.datasets[0].data.push(finalKE);
            this.energyChart.data.datasets[1].data.shift();
            this.energyChart.data.datasets[1].data.push(finalPE);
            this.energyChart.data.datasets[2].data.shift();
            this.energyChart.data.datasets[2].data.push(finalTE);
            this.energyChart.update();

            const periodData = this.physics.getPeriod();

            const isStopped = this.physics.getEnergy().KE < 0.00001;

            document.getElementById('theoretical-period').innerText = periodData.theoretical.toFixed(4);

            if (isStopped) {
                document.getElementById('measured-period').innerText = 'متوقف';
            } else {
                document.getElementById('measured-period').innerText = periodData.measured
                    ? `${periodData.measured.toFixed(4)}`
                    : 'جاري الحساب عند العبور...';
            }
            const tableBody = document.getElementById('balls-physics-table');
            if (tableBody) {
                tableBody.innerHTML = '';

                const physicsData = this.physics.getBalls();

                physicsData.forEach((ballData, i) => {
                    const displayTheta = Math.abs(ballData.theta) < 0.0005 ? "0.000" : ballData.theta.toFixed(3);
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid #444';

                    row.innerHTML = `
            <td style="padding: 6px; font-weight: bold; color: #2ed573;">${i + 1}</td>
            <td style="padding: 6px;">${displayTheta}</td>
            <td style="padding: 6px; color: #ffa502;">${ballData.tension.toFixed(2)} N</td>
            <td style="padding: 6px; color: #ff4757;">${ballData.dragForce.toFixed(4)} N</td>
            <td style="padding: 6px; color: #1e90ff;">${(ballData.height * 100).toFixed(2)} سم</td>
            <td style="padding: 6px; color: #2ed573; font-weight: bold;">${ballData.impactVelocity.toFixed(2)} م/ث</td>
        `;

                    tableBody.appendChild(row);
                });
            }
        }

        if (this.physics.justCollided) {
            const logs = this.physics.getCollisionLog();
            const latestLog = logs[logs.length - 1];

            const collisionId = `${latestLog.time}-${latestLog.ballA}-${latestLog.ballB}`;
            if (latestLog && collisionId !== this.lastCollisionId) {
                this.lastCollisionId = collisionId;
                const logContainer = document.getElementById('collision-log');
                const entryDiv = document.createElement('div');
                entryDiv.className = 'log-entry';

                entryDiv.innerHTML = `
                وقت: <span>${latestLog.time.toFixed(2)} s </span> | 
                الكرات: <span>[${latestLog.ballA} - ${latestLog.ballB}]</span><br>
                قوة الصدمة: <span>${latestLog.collisionForce.toFixed(1)} N</span><br>
                طاقة مبددة: <span>${(latestLog.energyLost * 1000).toFixed(2)} mJ</span>
                `;

                logContainer.prepend(entryDiv);

                if (logContainer.children.length > 15) {
                    logContainer.removeChild(logContainer.lastChild);
                }
            }
        }
    }



    playCollisionSound(impulse) {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'triangle';
        const baseFreq = 1200 + Math.min(800, impulse * 1000);
        osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.03);

        const volume = Math.min(0.6, impulse * 2);
        gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.03);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.03);
    }

    setupGUI() {
        const gui = new GUI();
        const folderPhysics = gui.addFolder('إعدادات فيزيائية');

        folderPhysics.add(this.physics, 'e', 0, 1).name('معامل الارتداد');
        folderPhysics.add(this.physics, 'b', 0, 0.5).name('مقاومة الهواء');
        folderPhysics.add(this.physics, 'initialAngle', 0, Math.PI / 2, 0.05)
            .name('زاوية الإطلاق (راديان)');

        const folderActions = gui.addFolder('أنماط الإطلاق');
        const actions = {
            'كرة واحدة': () => this.triggerPattern(1),
            'كرتين': () => this.triggerPattern(2),
            'ثلاث كرات': () => this.triggerPattern(3),
            'أربع كرات': () => this.triggerPattern(4),
            'كرة واحدة من الجهتين': () => this.triggerDualPattern(1),
            'كرتين من الجهتين': () => this.triggerDualPattern(2),
            'إعادة ضبط': () => this.physics.reset()
        };

        folderActions.add(actions, 'كرة واحدة');
        folderActions.add(actions, 'كرتين');
        folderActions.add(actions, 'ثلاث كرات');
        folderActions.add(actions, 'أربع كرات');
        folderActions.add(actions, 'كرة واحدة من الجهتين');
        folderActions.add(actions, 'كرتين من الجهتين');
        folderActions.add(actions, 'إعادة ضبط');
    }

    triggerPattern(count) {
        this.physics.reset();
        this.physics.lift(count, this.physics.initialAngle);
    }

    triggerDualPattern(count) {
        this.physics.reset();
        this.physics.lift(count, this.physics.initialAngle);
        this.physics.liftRight(count, this.physics.initialAngle);
    }

    animate() {
        const energy = this.physics.getEnergy();
        console.log("إجمالي الطاقة:", energy);

        const dt = this.clock.getDelta();

        this.physics.step(dt);



        if (this.physics.justCollided && this.physics.maxImpulse > 0.01) {
            this.playCollisionSound(this.physics.maxImpulse);
        }

        const physicsBalls = this.physics.getBalls();
        physicsBalls.forEach((b, i) => {
            if (this.pivotGroups[i]) {
                this.pivotGroups[i].rotation.z = b.theta;
            }
        });
        this.updateUI();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(this.animate);
    }
}