import * as THREE from 'three';
import { Gyroscope } from 'three/examples/jsm/misc/Gyroscope.js'

import { game } from './game.js'
import { RenderProjectile } from './render_projectile.js'
import { MathUtil } from './util.js'

export class RenderGrapplingHook extends RenderProjectile {
	private static readonly metalMaterial = new THREE.MeshPhongMaterial({ color: 0x5b5b5b })
	private static readonly lineMaterial = new THREE.LineBasicMaterial({color: 0x000000});
	private static readonly prismGeometry = new THREE.ExtrudeGeometry(new THREE.Shape([
		new THREE.Vector2(-0.06, 0),
		new THREE.Vector2(-0.1, 0),
		new THREE.Vector2(0, 0.2),
		new THREE.Vector2(0.1, 0),
		new THREE.Vector2(0.06, 0),
		new THREE.Vector2(0, 0.06),
	]), { depth: 0.2, bevelEnabled: false });

	private _ropeGeometry : THREE.BufferGeometry;

	constructor(space : number, id : number) {
		super(space, id);
	}

	override initialize() : void {
		super.initialize();

		let group = new THREE.Group();

		this._ropeGeometry = new THREE.BufferGeometry();
		let ropeLine = new THREE.Line(this._ropeGeometry, RenderGrapplingHook.lineMaterial);
		ropeLine.frustumCulled = false;
		const gyro = new Gyroscope();
		gyro.add(ropeLine);
		group.add(gyro);

		const dim = this.dim();
		for (let i = 0; i < 4; ++i) {
			const prismMesh = new THREE.Mesh(RenderGrapplingHook.prismGeometry, RenderGrapplingHook.metalMaterial);
			prismMesh.rotation.z = i * Math.PI / 2;
			group.add(prismMesh)
		}

		group.rotation.z = Math.random() * Math.PI;
		this.setMesh(group);
	}

	override update() : void {
		super.update();

		if (!this.hasMesh()) {
			return;
		}

		const owner = this.owner();
		let points = [];
		if (owner.valid() && game.sceneMap().has(owner.space(), owner.id())) {
			const player = game.sceneMap().get(owner.space(), owner.id());
			const offset = player.pos3().sub(this.pos3());
			points = [
				new THREE.Vector3(),
				offset,
			];
		}
		this._ropeGeometry.setFromPoints(points);

		const mesh = this.mesh();
		const attached = this.attribute(attachedAttribute);
		if (!attached) {
			const vel = this.vel();
			mesh.rotation.z -= MathUtil.signPos(vel.x) * this.timestep() * 15;

			const factor = Math.sin(mesh.rotation.z);
			mesh.rotation.x = factor * 0.05;
			mesh.rotation.y = factor * 0.05;
		}
	}
}

