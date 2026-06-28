import './style.css';
import { SceneManager } from './SceneManager.js';
import { Table } from './Table.js';
import { Cradle } from './Cradle.js';
import { AnimationSystem } from './Animation.js';

const environment = new SceneManager();

const myTable = new Table(environment.scene);

const myCradle = new Cradle(environment.scene, myTable.surfaceY, 5, 0.4, 3);

const animationSystem = new AnimationSystem(
    environment.scene, 
    environment.camera, 
    environment.renderer, 
    environment.controls, 
    myCradle.getBalls()
);

animationSystem.animate();