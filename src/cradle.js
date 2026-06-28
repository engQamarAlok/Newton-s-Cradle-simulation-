import * as THREE from 'three';

export class Cradle {
    constructor(scene, tableSurfaceY, ballsCount = 5, ballRadius = 0.4, stringLength = 3) {
        this.scene = scene;
        this.tableSurfaceY = tableSurfaceY; 
        this.ballsCount = ballsCount;
        this.ballRadius = ballRadius;
        this.stringLength = stringLength;
        this.cradles = [];

        this.ironMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
        this.stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

        this.buildCradle(); 
    }

    buildCradle() {
        const frameDepth = 1.6;
        const barRadius = 0.05;
        const gap = 0.3;

        const frameHeight = this.tableSurfaceY + gap + this.ballRadius + this.stringLength;

        const frameMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });
        const frameLength = this.ballRadius * 2 * this.ballsCount;

        const horizontalBarGeo = new THREE.CylinderGeometry(barRadius, barRadius, frameLength, 32);

        const frontFrame = new THREE.Mesh(horizontalBarGeo, frameMat);
        frontFrame.rotation.z = Math.PI * 0.5;
        frontFrame.position.set(0, frameHeight, frameDepth / 2);
        frontFrame.castShadow = true;
        this.scene.add(frontFrame);

        const backFrame = new THREE.Mesh(horizontalBarGeo, frameMat);
        backFrame.rotation.z = Math.PI * 0.5;
        backFrame.position.set(0, frameHeight, -frameDepth / 2);
        backFrame.castShadow = true;
        this.scene.add(backFrame);

        const legHeight = frameHeight - this.tableSurfaceY;
        const verticalLegGeo = new THREE.CylinderGeometry(barRadius, barRadius, legHeight, 32);

        const halfLength = frameLength / 2;
        const legYPosition = this.tableSurfaceY + (legHeight / 2);

        const supportPositions = [
            [-halfLength, legYPosition, frameDepth / 2],
            [halfLength, legYPosition, frameDepth / 2],
            [-halfLength, legYPosition, -frameDepth / 2],
            [halfLength, legYPosition, -frameDepth / 2]
        ];

        supportPositions.forEach(([x, y, z]) => {
            const supportLeg = new THREE.Mesh(verticalLegGeo, frameMat);
            supportLeg.position.set(x, y, z);
            supportLeg.castShadow = true;
            this.scene.add(supportLeg);
        });

        const cornerGeo = new THREE.SphereGeometry(barRadius, 32, 32);
        const cornerPositions = [
            [-halfLength, frameHeight, frameDepth / 2],
            [halfLength, frameHeight, frameDepth / 2],
            [-halfLength, frameHeight, -frameDepth / 2],
            [halfLength, frameHeight, -frameDepth / 2]
        ];

        cornerPositions.forEach(([x, y, z]) => {
            const corner = new THREE.Mesh(cornerGeo, frameMat);
            corner.position.set(x, y, z);
            this.scene.add(corner);
        });

        for (let i = 0; i < this.ballsCount; i++) {
            const xPosition = (i - (this.ballsCount - 1) / 2) * (this.ballRadius * 2);

            const pivotGroup = new THREE.Group();
            pivotGroup.position.set(xPosition, frameHeight, 0);

            const stringGeo1 = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, frameDepth / 2),
                new THREE.Vector3(0, -this.stringLength, 0)
            ]);
            const string1 = new THREE.Line(stringGeo1, this.stringMaterial);
            string1.castShadow = true;
            pivotGroup.add(string1);

            const stringGeo2 = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, -frameDepth / 2),
                new THREE.Vector3(0, -this.stringLength, 0)
            ]);
            const string2 = new THREE.Line(stringGeo2, this.stringMaterial);
            string2.castShadow = true;
            pivotGroup.add(string2);

            const ballGeo = new THREE.SphereGeometry(this.ballRadius, 32, 32);
            const ballMesh = new THREE.Mesh(ballGeo, this.ironMaterial);
            ballMesh.position.set(0, -this.stringLength, 0);
            ballMesh.castShadow = true;
            ballMesh.receiveShadow = true;
            pivotGroup.add(ballMesh);

            this.scene.add(pivotGroup);
            this.cradles.push(pivotGroup);
        }
    }

    getBalls() {
        return this.cradles;
    }
}