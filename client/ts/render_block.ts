import * as THREE from 'three';

import { Cardinal } from './cardinal.js'
import { game } from './game.js'
import { loader, Model } from './loader.js'
import { options } from './options.js'
import { RenderObject } from './render_object.js'
import { RenderPlayer } from './render_player.js'
import { renderer } from './renderer.js'
import { Util } from './util.js'

export class RenderBlock extends RenderObject {
	private readonly _boxBuffer = -0.2;
	private readonly _minOpacity = 0.05;

	private _inside : boolean;
	private _bbox : THREE.Box2;
	private _windows : THREE.Object3D;
	private _frontMaterials : Map<THREE.Material, number>;

	constructor(space : number, id : number) {
		super(space, id);
		this.disableAutoUpdatePos();
		this._inside = false;
		this._frontMaterials = new Map<THREE.Material, number>();
	}

	override ready() : boolean {
		return super.ready() && this.hasByteAttribute(typeByteAttribute);
	}

	override update() : void {
		super.update();

		if (!this.hasMesh() || this._frontMaterials.size === 0 || !Util.defined(this._bbox)) {
			return;
		}

		const object = renderer.cameraObject();
		if (Util.defined(object)) {
			this._inside = this.containsObject(object);
		}

		this._frontMaterials.forEach((opacity, mat) => {
			if (options.enableEffects) {
				mat.visible = true;
				mat.opacity = Math.min(opacity, Math.max(this._minOpacity, mat.opacity + this.timestep() * (this._inside ? -5 : 5)));
				if (this._inside && !mat.transparent) {
					mat.transparent = true;
				}
			} else {
				mat.visible = !this._inside;
				mat.opacity = opacity;
			}
		});

		if (Util.defined(this._windows)) {
			this._windows.visible = !this._inside;
		}
	}

	inside() : boolean {
		return this._inside;
	}

	containsObject(object : RenderObject) {
		if (!Util.defined(this._bbox)) {
			return false;
		}
		return this.contains(object.pos()) || this._bbox.intersectsBox(object.bbox());
	}

	contains(pos : THREE.Vector2) {
		if (!Util.defined(this._bbox)) {
			return false;
		}
		return this._bbox.containsPoint(pos);
	}

	protected loadMesh(model : Model, cb? : (mesh : THREE.Object3D) => void) : void {
		const opening = new Cardinal(this.byteAttribute(openingByteAttribute));
		loader.load(model, (mesh : THREE.Object3D) => {
			mesh.traverse((child) => {
				// @ts-ignore
				let material = child.material;
				if (material) {
					if (!material.visible) {
						return;
					}

					const name = material.name.toLowerCase();
					const components = new Set(name.split("-"));
					if (components.has("front")) {
						this._frontMaterials.set(material, Util.defined(material.opacity) ? material.opacity : 1);
					}

					if (components.has("base") && this.hasIntAttribute(colorIntAttribute)) {
						material.color = new THREE.Color(this.intAttribute(colorIntAttribute));
					} else if (components.has("secondary") && this.hasIntAttribute(secondaryColorIntAttribute)) {
						material.color = new THREE.Color(this.intAttribute(secondaryColorIntAttribute));
					}

					if (components.has("back")) {
						material.color.r *= 0.8;
						material.color.g *= 0.8;
						material.color.b *= 0.8;
					}
				}

				const name = child.name;
				const components = new Set(name.split("-"));
				if (components.has("opening") && this.hasByteAttribute(openingByteAttribute)) {
					if (opening.getCardinals(components).length > 0) {
						child.visible = false;
					}
				}

				if (components.has("windows")) {
					this._windows = child;
				}

				if (components.has("random")) {
					let valid = Math.random() < 0.5;
					if (valid && opening.getCardinals(components).length > 0) {
						valid = false;
					}

					if (valid) {
						let random = mesh.getObjectByName(name);
						loader.load(Math.random() < 0.66 ? Model.BEACH_BALL : Model.POTTED_TREE, (thing) => {
							thing.position.copy(random.position);
							mesh.add(thing);
						});
					}
				}

			});

			mesh.position.copy(this.pos3());
			mesh.position.y -= this.dim().y / 2;

			if (Util.defined(cb)) {
				cb(mesh);
			}

			this.setMesh(mesh);

			if (this._frontMaterials.size > 0) {
				const pos = this.pos();
				const dim = this.dim();

				let bottomLeft = new THREE.Vector2(pos.x - dim.x/2 - this._boxBuffer, pos.y - dim.y/2 - this._boxBuffer);
				let topRight = new THREE.Vector2(pos.x + dim.x/2 + this._boxBuffer, pos.y + dim.y/2 + this._boxBuffer);

				if (opening.anyBottom()) {
					bottomLeft.y -= dim.y;
				}
				if (opening.anyTop()) {
					topRight.y += dim.y;
				}

				this._bbox = new THREE.Box2(bottomLeft, topRight);
			}
		});
	}
}