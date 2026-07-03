import './style.css';
import { SceneManager } from './sceneManager';
import { Table } from './table';
import { Cradle } from './cradle.js';
import { AnimationSystem } from './animation.js';

const environment = new SceneManager();

const myTable = new Table(environment.scene);

const cradleConfig = {
    numBalls: 5,
    ballRadius: 0.4,
    stringLength: 0.3,
    ballMass: 4.0,
    airDamping: 0.004,
    restitution: 0.97,
    initialAngle: Math.PI / 4
};

const myCradle = new Cradle(
    environment.scene,
    myTable.surfaceY,
    cradleConfig.numBalls,
    cradleConfig.ballRadius,
    cradleConfig.stringLength
);

const animationSystem = new AnimationSystem(
    environment.scene,
    environment.camera,
    environment.renderer,
    environment.controls,
    myCradle.getBalls(),
    cradleConfig
);

animationSystem.animate();