import * as THREE from 'three';

import { game } from './game.js'
import { Message } from './message.js'
import { RenderMesh } from './render_mesh.js'
import { renderer } from './renderer.js'
import { SpacedId } from './spaced_id.js'
import { SpecialName } from './special_name.js'
import { Util } from './util.js'

export class RenderObject extends RenderMesh {
	private _space : number;
	private _id : number;
	private _sid : SpacedId;
	private _msg : Message;
	private _initialized : boolean;
	private _initializeTime : number;
	private _deleted : boolean;

	private _autoUpdatePos : boolean;
	private _timestep : number;
	private _lastUpdate : number;
	private _wasmLastSeqNum : number;

	private _pos : THREE.Vector2;
	private _pos3 : THREE.Vector3;
	private _dim : THREE.Vector2;
	private _dim3 : THREE.Vector3;
	private _vel : THREE.Vector2;
	private _acc : THREE.Vector2;
	private _dir : THREE.Vector2;
	private _owner : SpacedId;
	private _target : SpacedId;

	constructor(space : number, id : number) {
		super();

		this._space = space;
		this._id = id;
		this._sid = new SpacedId(space, id);
		this._msg = new Message();
		this._initialized = false;
		this._deleted = false;

		this._autoUpdatePos = true;
		this._timestep = 0;
		this._lastUpdate = Date.now();
		this._wasmLastSeqNum = 0;
	}

	override setMesh(mesh : THREE.Object3D) : void {
		super.setMesh(mesh);

		if (this.hasPos() && this._autoUpdatePos) {
			const pos = this.pos();
			mesh.position.x = pos.x;
			mesh.position.y = pos.y;
		}
		mesh.name = new SpacedId(this._space, this._id).toString();
	}

	space() : number { return this._space; }
	id() : number { return this._id; }
	spacedId() : SpacedId { return this._sid; }
	specialName() : SpecialName {
		let text;
		if (this.hasName()) {
			text = this.name();
		} else {
			text = this.spacedId().toString();
		}

		let color;
		if (this.hasColor()) {
			color = Util.colorString(this.color());
		} else {
			color = "#FFFFFF";
		}
		return {
			text: text,
			color: color,
		}
	}
	msg() : Message { return this._msg; }
	data() : { [k: string]: any } { return this._msg.data(); }
	lastSeqNum() : number { return this._msg.lastSeqNum(); }

	initializeTime() : number { return this._initializeTime; }
	timestep() : number { return this._timestep * game.updateSpeed(); }
	ready() : boolean { return this._msg.has(posProp) && this._msg.has(dimProp); }
	initialized() : boolean { return this._initialized; }
	deleted() : boolean { return this.attribute(deletedAttribute); }

	initialize() : void {
		if (this.initialized()) {
			console.error("Double initialization of object " + new SpacedId(this.space(), this.id()).toString())
			return;
		}

		wasmAdd(this.space(), this.id(), this.data());
		this._wasmLastSeqNum = this.msg().lastSeqNum();
		this._initialized = true;
		this._initializeTime = Date.now();
	}

	setData(msg : { [k: string]: any }, seqNum? : number) : void {
		this._msg.setData(msg, seqNum);
	}

	snapshotWasm() : void {
		if (this.msg().lastSeqNum() > this._wasmLastSeqNum) {
			wasmSetData(this.space(), this.id(), this.data());
			this._wasmLastSeqNum = this.msg().lastSeqNum();
		}
	}

	update() : void {
		if (!this.hasMesh() || !this.hasPos()) {
			return;
		}

		if (this._autoUpdatePos) {
			let mesh = this.mesh();
			const pos = this.pos3();
			mesh.position.x = pos.x;
			mesh.position.y = pos.y;

			if (this.hasPosZ()) {
				mesh.position.z = pos.z;
			}
		}

		this._timestep = (Date.now() - this._lastUpdate) / 1000;
		this._lastUpdate = Date.now();
	}

	delete() : void {
		if (this.hasMesh() && Util.defined(this.mesh().parent)) {
			this.mesh().parent.remove(this.mesh());
		}

		wasmDelete(this.space(), this.id());
		this._deleted = true;
	}

	seqNum(prop : number) : number {
		return this._msg.seqNum(prop);
	}

	bbox(buffer? : number) : THREE.Box2 {
		const pos = this.pos();
		const dim = this.dim();
		const buf = Util.defined(buffer) ? buffer : 0
		return new THREE.Box2(
			new THREE.Vector2(pos.x - dim.x / 2 - buf, pos.y - dim.y / 2 - buf),
			new THREE.Vector2(pos.x + dim.x / 2 + buf, pos.y + dim.y / 2 + buf),
		)
	}

	hasAttributes() : boolean { return this._msg.has(attributesProp); }
	attributes() : Map<number, number> {
		if (this.hasAttributes()) {
			return this._msg.get(attributesProp);
		}
		return new Map<number, number>();
	}
	hasAttribute(attribute : number) : boolean { return this.hasAttributes() && this.attributes().has(attribute); }
	attribute(attribute : number) : boolean {
		if (this.hasAttribute(attribute)) {
			return this.attributes().get(attribute) === 1;
		}
		return false;
	}

	hasByteAttributes() : boolean { return this._msg.has(byteAttributesProp); }
	byteAttributes() : Map<number, number> {
		if (this.hasByteAttributes()) {
			return this._msg.get(byteAttributesProp);
		}
		return new Map<number, number>();
	}
	hasByteAttribute(attribute : number) : boolean { return this.hasByteAttributes() && this.byteAttributes().has(attribute); }
	byteAttribute(attribute : number) : number {
		if (this.hasByteAttribute(attribute)) {
			return this.byteAttributes().get(attribute);
		}
		return 0;
	}

	hasIntAttributes() : boolean { return this._msg.has(intAttributesProp); }
	intAttributes() : Map<number, number> {
		if (this.hasIntAttributes()) {
			return this._msg.get(intAttributesProp);
		}
		return new Map<number, number>();
	}
	hasIntAttribute(attribute : number) : boolean { return this.hasIntAttributes() && this.intAttributes().has(attribute); }
	intAttribute(attribute : number) : number {
		if (this.hasIntAttribute(attribute)) {
			return this.intAttributes().get(attribute);
		}
		return 0;
	}

	hasFloatAttributes() : boolean { return this._msg.has(floatAttributesProp); }
	floatAttributes() : Map<number, number> {
		if (this.hasFloatAttributes()) {
			return this._msg.get(floatAttributesProp);
		}
		return new Map<number, number>();
	}
	hasFloatAttribute(attribute : number) : boolean { return this.hasFloatAttributes() && this.floatAttributes().has(attribute); }
	floatAttribute(attribute : number) : number {
		if (this.hasFloatAttribute(attribute)) {
			return this.floatAttributes().get(attribute);
		}
		return 0;
	}

	hasColor() : boolean { return this.hasIntAttribute(colorIntAttribute); }
	color() : number {
		if (this.hasColor()) {
			return this.intAttribute(colorIntAttribute);
		}
		return 0;
	}

	hasSecondaryColor() : boolean { return this.hasIntAttribute(secondaryColorIntAttribute); }
	secondaryColor() : number {
		if (this.hasSecondaryColor()) {
			return this.intAttribute(secondaryColorIntAttribute);
		}
		return 0;
	}

	hasDimZ() : boolean { return this.hasFloatAttribute(dimZFloatAttribute); }
	dimZ() : number {
		if (this.hasDimZ()) {
			return this.floatAttribute(dimZFloatAttribute);
		}
		return 0;
	}

	hasPosZ() : boolean { return this.hasFloatAttribute(posZFloatAttribute); }
	posZ() : number {
		if (this.hasPosZ()) {
			return this.floatAttribute(posZFloatAttribute);
		}
		return 0;
	}

	hasName() : boolean { return this._msg.has(nameProp); }
	name() : string {
		if (this.hasName()) {
			return this._msg.get(nameProp);
		}
		return "";
	}

	hasPos() : boolean { return this._msg.has(posProp); }
	pos() : THREE.Vector2 {
		if (!Util.defined(this._pos)) {
			this._pos = new THREE.Vector2();
		}
		if (this.hasPos()) {
			this._pos.set(this._msg.get(posProp).X, this._msg.get(posProp).Y);
		}
		return this._pos;
	}
	pos3() : THREE.Vector3 {
		if (!Util.defined(this._pos3)) {
			this._pos3 = new THREE.Vector3();
		}
		if (this.hasPos()) {
			this._pos3.set(this._msg.get(posProp).X, this._msg.get(posProp).Y, this.hasPosZ() ? this.posZ() : (this.hasMesh() ? this.mesh().position.z : 0));
		}
		return this._pos3;
	}

	hasDim() : boolean { return this._msg.has(dimProp); }
	dim() : THREE.Vector2 {
		if (!Util.defined(this._dim)) {
			this._dim = new THREE.Vector2();
		}
		if (this.hasDim()) {
			this._dim.set(this._msg.get(dimProp).X, this._msg.get(dimProp).Y);
		}
		return this._dim;
	}
	dim3() : THREE.Vector3 {
		if (!Util.defined(this._dim3)) {
			this._dim3 = new THREE.Vector3();
		}
		if (this.hasDim()) {
			this._dim3.set(this._msg.get(dimProp).X, this._msg.get(dimProp).Y, this.dimZ());
		}
		return this._dim3;
	}

	hasVel() : boolean { return this._msg.has(velProp); }
	vel() : THREE.Vector2 {
		if (!Util.defined(this._vel)) {
			this._vel = new THREE.Vector2();
		}
		if (this.hasVel()) {
			this._vel.set(this._msg.get(velProp).X, this._msg.get(velProp).Y);
		}
		return this._vel;
	}

	hasAcc() : boolean { return this._msg.has(accProp); }
	acc() : THREE.Vector2 {
		if (!Util.defined(this._acc)) {
			this._acc = new THREE.Vector2();
		}
		if (this.hasAcc()) {
			this._acc.set(this._msg.get(accProp).X, this._msg.get(accProp).Y);
		}
		return this._acc;
	}

	hasDir() : boolean { return this._msg.has(dirProp); }
	dir() : THREE.Vector2 {
		if (!Util.defined(this._dir)) {
			this._dir = new THREE.Vector2();
		}
		if (this.hasDir()) {
			this._dir.set(this._msg.get(dirProp).X, this._msg.get(dirProp).Y);
		}
		return this._dir;
	}

	hasOwner() : boolean { return this._msg.has(ownerProp); }
	owner() : SpacedId {
		if (!Util.defined(this._owner)) {
			this._owner = new SpacedId(0, 0);
		}
		if (this.hasOwner()) {
			this._owner.setSpace(this._msg.get(ownerProp).S);
			this._owner.setId(this._msg.get(ownerProp).Id);
		}
		return this._owner;
	}

	hasTarget() : boolean { return this._msg.has(targetProp); }
	target() : SpacedId {
		if (!Util.defined(this._target)) {
			this._target = new SpacedId(0, 0);
		}

		if (this.hasTarget()) {
			this._target.setSpace(this._msg.get(targetProp).S);
			this._target.setId(this._msg.get(targetProp).Id);
		}
		return this._target;
	}

	protected disableAutoUpdatePos() {
		this._autoUpdatePos = false;
	}
}