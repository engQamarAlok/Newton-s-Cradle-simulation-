import * as THREE from 'three';

export class Table {
    constructor(scene) {
        this.scene = scene;
        this.surfaceY = -0.4; 
        this.woodMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.6 });
        
        this.buildTable();
    }

    buildTable() {
        this.tableGroup = new THREE.Group();

        const tableWidth = 14;     
        const tableDepth = 8;      
        const topThickness = 0.2;   

        const topGeo = new THREE.BoxGeometry(tableWidth, topThickness, tableDepth);
        const tableTop = new THREE.Mesh(topGeo, this.woodMaterial);
        tableTop.position.y = this.surfaceY - (topThickness / 2);
        tableTop.castShadow = true;    
        tableTop.receiveShadow = true; 
        this.tableGroup.add(tableTop);

        const legHeight = 3;
        const legThickness = 0.3; 
        const legGeo = new THREE.BoxGeometry(legThickness, legHeight, legThickness);

        const xOffset = (tableWidth / 2) - 0.2;
        const zOffset = (tableDepth / 2) - 0.2;
        const legYPosition = tableTop.position.y - (topThickness / 2) - (legHeight / 2);

        const legPositions = [
            [-xOffset, legYPosition, -zOffset], [xOffset, legYPosition, -zOffset],
            [-xOffset, legYPosition, zOffset],  [xOffset, legYPosition, zOffset]
        ];

        legPositions.forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(legGeo, this.woodMaterial);
            leg.position.set(x, y, z);
            leg.castShadow = true;    
            leg.receiveShadow = true; 
            this.tableGroup.add(leg);
        });

        this.scene.add(this.tableGroup);
    }
}