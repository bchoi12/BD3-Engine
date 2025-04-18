import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { Water } from 'three/examples/jsm/objects/Water.js';

import { game } from './game.js'
import { loader, Texture } from './loader.js'
import { options } from './options.js'
import { Range } from './range.js'
import { renderer } from './renderer.js'
import { SceneComponent, SceneComponentType } from './scene_component.js'
import { MathUtil, Util } from './util.js'

// TODO: rename background
export class Lighting extends SceneComponent {

	private readonly _shadowMapWidth = 1024;
	private readonly _shadowMapHeight = 1024;
	private readonly _shadowBias = -0.001;

	private readonly _sunHeightAngle = new Range(5 * Math.PI / 16, Math.PI / 2 - 0.1);
	private readonly _turbidity = new Range(5, 0);
	private readonly _rayleigh = new Range(0.12, 0);
	private readonly _mieCoefficient = new Range(0.002, 0.005);
	private readonly _mieDirectionalG = new Range(0.99, 1);
	private readonly _sunLightIntensity = new Range(1.5, 0.8);
	private readonly _hemisphereLightIntensity = new Range(1.2, 0.7);
	private readonly _hemisphereLightColor = new Range(1.0, 0.3);

	private _fog : THREE.Fog;
	private _sky : Sky;
	private _water : Water;

	private _sunPos : THREE.Vector3;
	private _sunLight : THREE.DirectionalLight;
	private _sunLightOffset : THREE.Vector3;
	private _hemisphereLight : THREE.HemisphereLight;

	private _skyTime : number;

	constructor() {
		super();

		this._sky = new Sky();
		this._sky.scale.setScalar(4000);
		this.addObject(this._sky);

		this._water = new Water(new THREE.PlaneGeometry(4000, 2000), {
			textureWidth: 512,
			textureHeight: 512,
			waterNormals: loader.loadTexture(Texture.WATER_NORMALS, (texture) => {
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
			}),
			sunColor: 0xfdfbfd,
			waterColor: 0x199cff,
			distortionScale: 1,
			fog: true,
		});
 		this._water.material.uniforms['size'].value = 1000
		this._water.rotation.x = - Math.PI / 2;
		this._water.position.y = -15;
		this._water.position.z = -1000;

		const sandDepth = 30;
		const sand = new THREE.Mesh(new THREE.PlaneGeometry(4000, sandDepth), new THREE.MeshLambertMaterial({
			map: loader.loadTexture(Texture.SAND, (texture) => {
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
				texture.repeat.set(10, 10);
			}),
		}));
		sand.rotation.copy(this._water.rotation);
		sand.position.y = this._water.position.y;
		this._water.position.z -= sandDepth / 2;

		this.addObject(sand);
		this.addObject(this._water);

		this._sunPos = new THREE.Vector3();
		this._sunLight = new THREE.DirectionalLight(0xfdfbfd, 0);
		if (options.enableShadows) {
			this._sunLight.castShadow = true;
		}

		const side = 30;
		this._sunLight.shadow.camera = new THREE.OrthographicCamera(-side, side, side, -side, 0.1, 300 );
		this._sunLight.shadow.mapSize.width = this._shadowMapWidth;
		this._sunLight.shadow.mapSize.height = this._shadowMapHeight;
		this._sunLight.shadow.bias = this._shadowBias;
		this.addObject(this._sunLight);
		this.addObject(this._sunLight.target);
	
		this._hemisphereLight = new THREE.HemisphereLight(0xfdfbfd, 0x333333, 0);
		this.addObject(this._hemisphereLight);

		this.updateTimeOfDay(0);
	}

	override update() : void {
		super.update();

		if (!Util.defined(this._skyTime) || Math.abs(game.timeOfDay() - this._skyTime) > .01) {
			this._skyTime = game.timeOfDay();
			this.updateTimeOfDay(this._skyTime);
		}

		this._sunLightOffset = this._sunPos.clone();
		// TODO: put this closer and tweak shadow bias or something
		this._sunLightOffset.multiplyScalar(86);
		this._sunLightOffset.add(renderer.cameraTarget());
		this._sunLight.position.copy(this._sunLightOffset);
		this._sunLight.target.position.copy(renderer.cameraTarget());

		this._water.material.uniforms['time'].value -= 15 * this.timestep();
	}

	private updateTimeOfDay(timeOfDay : number) : void {
		this._sunPos.setFromSphericalCoords(1, this._sunHeightAngle.lerp(timeOfDay),  -0.025 * Math.PI);

		let uniforms = this._sky.material.uniforms;
		uniforms['sunPosition'].value.copy(this._sunPos);
		uniforms['turbidity'].value = this._turbidity.lerp(timeOfDay);
		uniforms['rayleigh'].value = this._rayleigh.lerp(timeOfDay);
		uniforms['mieCoefficient'].value = this._mieCoefficient.lerp(timeOfDay);
		uniforms['mieDirectionalG'].value = this._mieDirectionalG.lerp(timeOfDay);

		this._water.material.uniforms['sunDirection'].value.copy(this._sunPos).normalize();
		this._water.material.uniforms['sunColor'].value = new THREE.Color(0xffffff);

		this._sunLight.intensity = this._sunLightIntensity.lerp(timeOfDay);

		this._hemisphereLight.intensity = this._hemisphereLightIntensity.lerp(timeOfDay);
		const color = this._hemisphereLightColor.lerp(timeOfDay);
		this._hemisphereLight.color = new THREE.Color(color, color, color);

		this._skyTime = timeOfDay;
	}
}