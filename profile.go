package main

import (
	"math"
)

const (
	zeroVelEpsilon float64 = 1e-6
	overlapEpsilon float64 = 0.01
)

type ProfileKey uint8
type Profile interface {
	DataMethods

	Pos() Vec2
	SetPos(pos Vec2)
	Dim() Vec2
	SetDim(dim Vec2)
	Vel() Vec2
	SetVel(vel Vec2)
	Acc() Vec2
	SetAcc(acc Vec2)
	Jerk() Vec2
	SetJerk(jerk Vec2)
	Dir() Vec2
	SetDir(dir Vec2)

	ExtVel() Vec2
	SetExtVel(extVel Vec2)
	TotalVel() Vec2
	AddForce(force Vec2)
	ApplyForces() Vec2
	Stop()

	AddSubProfile(key ProfileKey, subProfile SubProfile)
	GetSubProfile(key ProfileKey) SubProfile

	Offset(other Profile) Vec2
	DistSqr(other Profile) float64
	Dist(other Profile) float64
	DistX(other Profile) float64
	DistY(other Profile) float64

	PosAdjustment(other Profile) Vec2
	posAdjustmentX(other Profile) (float64, float64)
	posAdjustmentY(other Profile) (float64, float64)

	Contains(point Vec2) ContainResults
	Intersects(line Line) IntersectResults

	GetOverlapOptions() ColliderOptions
	SetOverlapOptions(options ColliderOptions)
	GetSnapOptions() ColliderOptions
	SetSnapOptions(options ColliderOptions)

	OverlapProfile(profile Profile) CollideResult
	Snap(nearbyObjects ObjectHeap) SnapResults

	Stick(result CollideResult)

	getIgnored() map[SpacedId]bool
	updateIgnored(ignored map[SpacedId]bool) 
}

type BaseProfile struct {
	pos, vel, acc, jerk, dir, dim Vec2
	posFlag, velFlag, accFlag, jerkFlag, dirFlag, dimFlag *Flag
	extVel Vec2
	forces []Vec2

	subProfiles map[ProfileKey]SubProfile
	ignoredColliders map[SpacedId]bool
	overlapOptions, snapOptions ColliderOptions
}

func NewBaseProfile(init Init) BaseProfile {
	bp := BaseProfile {
		pos: init.InitPos(),
		posFlag: NewFlag(),
		vel: NewVec2(0, 0),
		velFlag: NewFlag(),
		acc: NewVec2(0, 0),
		accFlag: NewFlag(),
		jerk: NewVec2(0, 0),
		jerkFlag: NewFlag(),
		dir: init.InitDir(),
		dirFlag: NewFlag(),
		dim: init.InitDim(),
		dimFlag: NewFlag(),
		extVel: NewVec2(0, 0),
		forces: make([]Vec2, 0),

		subProfiles: make(map[ProfileKey]SubProfile),
		ignoredColliders: make(map[SpacedId]bool),
		overlapOptions: NewColliderOptions(),
		snapOptions: NewColliderOptions(),
	}
	return bp
}

func (bp BaseProfile) Dim() Vec2 { return bp.dim }
func (bp *BaseProfile) SetDim(dim Vec2) {
	if bp.dim.ApproxEq(dim) {
		return
	}

	bp.dim = dim
	bp.dimFlag.Reset(true)
}
func (bp BaseProfile) Pos() Vec2 { return bp.pos }
func (bp *BaseProfile) SetPos(pos Vec2) {
	if bp.pos.ApproxEq(pos) {
		return
	}

	bp.pos = pos
	for _, sp := range(bp.subProfiles) {
		sp.SetPos(pos)
	}
	bp.posFlag.Reset(true)
}
func (bp BaseProfile) Vel() Vec2 { return bp.vel }
func (bp *BaseProfile) SetVel(vel Vec2) {
	if bp.vel.ApproxEq(vel) {
		return
	}

	bp.vel = vel
	for _, sp := range(bp.subProfiles) {
		sp.SetVel(vel)
	}
	bp.velFlag.Reset(true)
}

func (bp BaseProfile) Acc() Vec2 { return bp.acc }
func (bp *BaseProfile) SetAcc(acc Vec2) {
	if bp.acc.ApproxEq(acc) {
		return
	}

	bp.acc = acc
	for _, sp := range(bp.subProfiles) {
		sp.SetAcc(acc)
	}
	bp.accFlag.Reset(true)
}
func (bp BaseProfile) Jerk() Vec2 { return bp.jerk }
func (bp *BaseProfile) SetJerk(jerk Vec2) {
	if bp.jerk.ApproxEq(jerk) {
		return
	}

	bp.jerk = jerk
	for _, sp := range(bp.subProfiles) {
		sp.SetJerk(jerk)
	}
	bp.jerkFlag.Reset(true)
}

func (bp BaseProfile) Dir() Vec2 { return bp.dir }
func (bp *BaseProfile) SetDir(dir Vec2) {
	if bp.dir.ApproxEq(dir) {
		return
	}

	bp.dir = dir
	for _, sp := range(bp.subProfiles) {
		sp.SetDir(dir)
	}
	bp.dirFlag.Reset(true)
}

func (bp BaseProfile) ExtVel() Vec2 { return bp.extVel }
func (bp *BaseProfile) SetExtVel(extVel Vec2) {
	if bp.extVel.ApproxEq(extVel) {
		return
	}

	bp.extVel = extVel
	for _, sp := range(bp.subProfiles) {
		sp.SetDir(extVel)
	}
}
func (bp BaseProfile) TotalVel() Vec2 {
	tvel := bp.Vel()
	tvel.Add(bp.ExtVel(), 1.0)
	return tvel
}

func (bp *BaseProfile) AddForce(force Vec2) {
	if force.IsZero() {
		return
	}

	bp.forces = append(bp.forces, force)
}

func (bp BaseProfile) HasForces() bool {
	return len(bp.forces) > 0
}

func (bp *BaseProfile) ApplyForces() Vec2 {
	totalForce := NewVec2(0, 0)
	if len(bp.forces) == 0 {
		return totalForce
	}
	for _, force := range(bp.forces) {
		totalForce.Add(force, 1.0)
	}
	bp.forces = make([]Vec2, 0)

	vel := bp.Vel()
	vel.Add(totalForce, 1.0)
	bp.SetVel(vel)

	return totalForce
}

func (bp *BaseProfile) Stop() {
	bp.SetVel(NewVec2(0, 0))
	bp.SetAcc(NewVec2(0, 0))
	bp.SetJerk(NewVec2(0, 0))
}

func (bp BaseProfile) GetData() Data {
	data := NewData()

	if bp.dirFlag.Has() {
		data.Set(dirProp, bp.Dir())
	}
	if flag, ok := bp.dimFlag.Pop(); ok && flag {
		data.Set(dimProp, bp.Dim())
	}

	if !bp.velFlag.Has() {
		return data
	}

	if bp.posFlag.Has() {
		data.Set(posProp, bp.Pos())
	}
	if bp.velFlag.Has() {
		data.Set(velProp, bp.Vel())
	}
	if bp.accFlag.Has() {
		data.Set(accProp, bp.Acc())
	}
	if bp.jerkFlag.Has() {
		data.Set(jerkProp, bp.Jerk())
	}

	return data
}

func (bp BaseProfile) GetInitData() Data {
	return NewData()
}

func (bp BaseProfile) GetUpdates() Data {
	data := NewData()
	if flag, ok := bp.dimFlag.GetOnce(); ok && flag {
		data.Set(dimProp, bp.dim)
	}
	return data
}

func (bp *BaseProfile) SetData(data Data) {
	if data.Size() == 0 {
		return
	}

	if data.Has(posProp) {
		bp.SetPos(data.Get(posProp).(Vec2))
	}
	if data.Has(velProp) {
		bp.SetVel(data.Get(velProp).(Vec2))
	}
	if data.Has(accProp) {
		bp.SetAcc(data.Get(accProp).(Vec2))
	}
	if data.Has(jerkProp) {
		bp.SetJerk(data.Get(jerkProp).(Vec2))
	}
	if data.Has(dirProp) {
		bp.SetDir(data.Get(dirProp).(Vec2))
	}
	if data.Has(dimProp) {
		bp.SetDim(data.Get(dimProp).(Vec2))
	}
}

func (bp *BaseProfile) AddSubProfile(key ProfileKey, subProfile SubProfile) { bp.subProfiles[key] = subProfile }
func (bp BaseProfile) GetSubProfile(key ProfileKey) SubProfile { return bp.subProfiles[key] }

func (bp BaseProfile) PosAdjustment(other Profile) Vec2 {
	ox, _ := bp.posAdjustmentX(other)
	oy, _ := bp.posAdjustmentY(other)
	return NewVec2(ox, oy)
}

func (bp BaseProfile) posAdjustmentX(other Profile) (float64, float64) {
	overlap := bp.Dim().X / 2 + other.Dim().X / 2 - bp.DistX(other)
	if overlap <= 0 {
		return 0, 0
	}

	relativePos := FSign(bp.Pos().X - other.Pos().X)
	relativeVel := FSign(bp.Vel().X - other.Vel().X)
	reverseDist := Max(bp.Dim().X, other.Dim().X) + bp.Dim().X / 2 + other.Dim().X / 2
	if relativePos == relativeVel {
		overlap = reverseDist - overlap
	}
	reverseOverlap := reverseDist - overlap

	return FSignPos(-relativeVel) * overlap, FSignPos(relativeVel) * reverseOverlap
}
func (bp BaseProfile) posAdjustmentY(other Profile) (float64, float64) {
	overlap := bp.Dim().Y / 2 + other.Dim().Y / 2 - bp.DistY(other)
	if overlap <= 0 {
		return 0, 0
	}

	relativePos := FSign(bp.Pos().Y - other.Pos().Y)
	relativeVel := FSign(bp.Vel().Y - other.Vel().Y)
	reverseDist := Max(bp.Dim().Y, other.Dim().Y) + bp.Dim().Y / 2 + other.Dim().Y / 2
	if relativePos == relativeVel {
		overlap = reverseDist - overlap
	}
	reverseOverlap := reverseDist - overlap

	return FSignPos(-relativeVel) * overlap, FSignPos(relativeVel) * reverseOverlap
}

func (bp BaseProfile) Offset(other Profile) Vec2 {
	offset := bp.Pos()
	offset.Sub(other.Pos(), 1.0)
	return offset
}

func (bp BaseProfile) DistSqr(other Profile) float64 {
	x := bp.DistX(other)
	y := bp.DistY(other)
	return x * x + y * y
}
func (bp BaseProfile) Dist(other Profile) float64 {
	return math.Sqrt(bp.DistSqr(other))
}
func (bp BaseProfile) DistX(other Profile) float64 {
	return Abs(other.Pos().X - bp.Pos().X)
}
func (bp BaseProfile) DistY(other Profile) float64 {
	return Abs(other.Pos().Y - bp.Pos().Y)
}

func (bp BaseProfile) Contains(point Vec2) ContainResults {
	results := NewContainResults()
	for _, sp := range(bp.subProfiles) {
		results.Merge(sp.Contains(point))
	}
	return results
}

func (bp BaseProfile) Intersects(line Line) IntersectResults {
	results := NewIntersectResults()
	for _, sp := range(bp.subProfiles) {
		results.Merge(sp.Intersects(line))
	}
	return results
}

func (bp BaseProfile) GetOverlapOptions() ColliderOptions { return bp.overlapOptions }
func (bp *BaseProfile) SetOverlapOptions(options ColliderOptions) {
	for _, sp := range(bp.subProfiles) {
		sp.SetOverlapOptions(options)
	}
	bp.overlapOptions = options
}

func (bp BaseProfile) OverlapProfile(profile Profile) CollideResult {
	result := NewCollideResult()
	for _, sp := range(bp.subProfiles) {
		result.Merge(sp.OverlapProfile(profile))
	}
	return result
}

func (bp BaseProfile) GetSnapOptions() ColliderOptions { return bp.snapOptions }
func (bp *BaseProfile) SetSnapOptions(options ColliderOptions) {
	for _, sp := range(bp.subProfiles) {
		sp.SetSnapOptions(options)
	}
	bp.snapOptions = options
}

func (bp *BaseProfile) Snap(nearbyObjects ObjectHeap) SnapResults {
	results := NewSnapResults()
	ignored := make(map[SpacedId]bool)

	for len(nearbyObjects) > 0 {
		object := PopObject(&nearbyObjects)	
		collideResult := bp.snapObject(object)

		if collideResult.GetIgnored() {
			ignored[object.GetSpacedId()] = true
		} else if collideResult.GetHit() {
			pos := bp.Pos()
			pos.Add(collideResult.GetPosAdjustment(), 1.0)
			bp.SetPos(pos)
		}
		results.AddCollideResult(object.GetSpacedId(), collideResult)
	}

	if results.snap {
		vel := bp.Vel()
		if results.posAdjustment.X > 0 {
			vel.X = Max(0, vel.X)
		} else if results.posAdjustment.X < 0 {
			vel.X = Min(0, vel.X)
		}
		if results.posAdjustment.Y > 0 {
			vel.Y = Max(0, vel.Y)
		} else if results.posAdjustment.Y < 0 {
			vel.Y = Min(0, vel.Y)
		}

		force := results.force
		extVel := results.force
		if force.Y < 0 {
			extVel.Y = 0
			force.X = 0
			bp.AddForce(force)
		}
		bp.SetExtVel(extVel)
		bp.SetVel(vel)
	} else {
		bp.SetExtVel(NewVec2(0, 0))
	}

	bp.updateIgnored(ignored)
	return results
}

func (bp BaseProfile) getIgnored() map[SpacedId]bool {
	return bp.ignoredColliders
}
func (bp *BaseProfile) updateIgnored(ignored map[SpacedId]bool) {
	bp.ignoredColliders = ignored
}

// TODO: move to Object?
func (bp BaseProfile) snapObject(other Object) CollideResult {
	result := NewCollideResult()
	posAdj := bp.PosAdjustment(other)
	ignored := bp.getIgnored()

	if !bp.GetSnapOptions().Evaluate(other) || posAdj.Area() <= 0 {
		return result
	}

	if _, ok := ignored[other.GetSpacedId()]; ok {
		result.SetIgnored(true)
		return result
	}

	// Figure out collision direction
	// relativePos := NewVec2(bp.Pos().X - other.Pos().X, bp.Pos().Y - other.Pos().Y)
	relativeVel := NewVec2(bp.TotalVel().X - other.TotalVel().X, bp.TotalVel().Y - other.TotalVel().Y)
	collisionFlag := NewVec2(1, 1)

	// Check for tiny collisions that we can ignore
	if collisionFlag.X != 0 && collisionFlag.Y != 0 {
		if Abs(posAdj.Y) < overlapEpsilon {
			collisionFlag.X = 0
		}
		if Abs(posAdj.X) < overlapEpsilon {
			collisionFlag.Y = 0
		}
	}

	// Zero out adjustments according to relative velocity.
	if collisionFlag.X != 0 && collisionFlag.Y != 0 {
		if Abs(relativeVel.X) < zeroVelEpsilon && Abs(relativeVel.Y) > zeroVelEpsilon {
			collisionFlag.X = 0
		} else if Abs(relativeVel.Y) < zeroVelEpsilon && Abs(relativeVel.X) > zeroVelEpsilon {
			collisionFlag.Y = 0
		} else if Abs(relativeVel.X) < zeroVelEpsilon && Abs(relativeVel.Y) < zeroVelEpsilon {
			// somehow stopped inside the object
			if Abs(posAdj.X) >= Abs(posAdj.Y) {
				collisionFlag.X = 0
			} else {
				collisionFlag.Y = 0
			}
		}
	}

	// If collision happens in both X, Y compute which overlap is greater based on velocity.
	if collisionFlag.X != 0 && collisionFlag.Y != 0 {
		tx := Abs(posAdj.X / relativeVel.X)
		ty := Abs(posAdj.Y / relativeVel.Y)

		if tx > ty {
			collisionFlag.X = 0
		} else if ty > tx {
			collisionFlag.Y = 0
		}
	}

	// Special treatment for other object types
	if other.HasAttribute(stairAttribute) && collisionFlag.X != 0 {
		collisionFlag.X = 0
		collisionFlag.Y = 1

		oy, oyReverse := bp.posAdjustmentY(other)
		posAdj.Y = Max(oy, oyReverse)
		// Smooth ascent
		posAdj.Y = Min(posAdj.Y, 0.2)
	}

	// Adjust platform collision at the end after we've determined collision direction.
	if other.HasAttribute(platformAttribute) {
		collisionFlag.X = 0
		if posAdj.Y < 0 {
			collisionFlag.Y = 0
		}
	}

	// Have overlap, but no pos adjustment for some reason.
	if collisionFlag.IsZero() {
		if other.HasAttribute(platformAttribute) {
			result.SetIgnored(true)
		}
		return result
	}

	// Collision
	posAdj.X *= collisionFlag.X
	posAdj.Y *= collisionFlag.Y
	if posAdj.IsZero() {
		return result
	}

	result.SetHit(true)
	result.SetPosAdjustment(posAdj)
	result.SetForce(other.Vel())
	return result
}

func (bp *BaseProfile) Stick(result CollideResult) {
	if !result.hit || result.GetPosAdjustment().IsZero() {
		return
	}

	pos := bp.Pos()
	vel := bp.Vel()
	posAdj := result.GetPosAdjustment()

	if Abs(vel.X) < zeroVelEpsilon {
		posAdj.X = 0
	}
	if Abs(vel.Y) < zeroVelEpsilon {
		posAdj.Y = 0
	}

	if !posAdj.IsZero() {
		collisionTime := NewVec2(Abs(posAdj.X / vel.X), Abs(posAdj.Y / vel.Y))
		if collisionTime.X < collisionTime.Y {
			posAdj.Y = FSign(posAdj.Y) * Abs(vel.Y / vel.X * posAdj.X)		
		} else {
			posAdj.X = FSign(posAdj.X) * Abs(vel.X / vel.Y * posAdj.Y)
		}

		timeLimit := 2 * float64(frameMillis) / 1000
		if collisionTime.X >= timeLimit {
			posAdj.X = 0
		}
		if collisionTime.Y >= timeLimit {
			posAdj.Y = 0
		}
	}

	pos.X += posAdj.X
	pos.Y += posAdj.Y

	bp.SetPos(pos)
}