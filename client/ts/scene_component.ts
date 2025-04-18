import * as THREE from 'three';

import { game } from './game.js'
import { RenderCustom } from './render_custom.js'

export enum SceneComponentType {
	UNKNOWN = 0,
	GAME_OVERLAY = 1,
	LIGHTING = 2,
	WEATHER = 3,
	PARTICLES = 4,
}

export class SceneComponent {
	protected _scene : THREE.Scene;

	private _nextId : number;

	private _objects : Map<number, THREE.Object3D>;
	private _customObjects : Map<number, RenderCustom>;

	private _timestep : number;
	private _lastUpdate : number;

	constructor() {
		this._scene = new THREE.Scene();

		this._nextId = 1;
		this._objects = new Map<number, THREE.Object3D>();
		this._customObjects = new Map<number, RenderCustom>();

		this._timestep = 0;
		this._lastUpdate = Date.now();
	}

	scene() : THREE.Scene { return this._scene; }
	reset() : void {}
	timestep() : number { return this._timestep * game.updateSpeed(); }
	postCamera() : boolean { return false; }

	addObject(object : THREE.Object3D) : void {
		this.addObjectTemp(object, -1);
	}

	addObjectTemp(object : THREE.Object3D, ttl : number, onDelete? : (object : THREE.Object3D) => void) : void {
		this._scene.add(object);

		if (ttl > 0) {
			setTimeout(() => {
				this.deleteObject(object, onDelete);
			}, ttl);
		}
	}

	deleteObject(object : THREE.Object3D, onDelete? : (object : THREE.Object3D) => void) {
		this._scene.remove(object);
		onDelete(object);
	}

	addCustom(custom : RenderCustom) : void {
		this.addCustomTemp(custom, -1, () => {});
	}

	addCustomTemp(custom : RenderCustom, ttl : number, onDelete? : (object : THREE.Object3D) => void) : void {
		const id = custom.id();
		custom.onMeshLoad(() => {
			this._customObjects.set(id, custom);
			this._scene.add(custom.mesh());

			if (ttl > 0) {
				setTimeout(() => {
					this.deleteCustom(custom, onDelete);
				}, ttl);
			}
		});
	}

	deleteCustom(custom : RenderCustom, onDelete? : (object : THREE.Object3D) => void) {
		this._customObjects.delete(custom.id());
		this._scene.remove(custom.mesh());
		onDelete(custom.mesh());
	}

	update() : void {
		this._customObjects.forEach((custom, id) => {
			custom.update();
		});

		this._timestep = (Date.now() - this._lastUpdate) / 1000;
		this._lastUpdate = Date.now();
	}

	protected nextId() : number {
		this._nextId++;
		return this._nextId - 1;
	}
}