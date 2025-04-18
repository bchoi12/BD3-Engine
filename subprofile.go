package main

type SubProfile struct {
	Profile
	offset Vec2
	dirOffset Vec2
}

func NewSubProfile(profile Profile) *SubProfile {
	return &SubProfile {
		Profile: profile,
		offset: NewVec2(0, 0),
		dirOffset: NewVec2(1, 0),
	}
}

func (sp *SubProfile) SetPos(pos Vec2) {
	pos.Add(sp.offset, 1.0)
	sp.Profile.SetPos(pos)
}

func (sp *SubProfile) SetDir(dir Vec2) {
	angle := NormalizeAngle(dir.Angle() + sp.dirOffset.Angle())
	sp.Profile.SetDir(NewVec2FromAngle(angle))
}

func (sp *SubProfile) SetOffset(offset Vec2) { sp.offset = offset } 
func (sp *SubProfile) SetDirOffset(dirOffset Vec2) { sp.dirOffset = dirOffset }

func (sp SubProfile) GetInitData() Data {
	data := NewData()
	data.Set(posProp, sp.Pos())
	data.Set(dimProp, sp.Dim())
	return data
}
func (sp SubProfile) GetData() Data {
	data := NewData()
	data.Set(posProp, sp.Pos())
	data.Set(dirProp, sp.Dir())
	return data
}
func (sp SubProfile) GetUpdates() Data {
	return NewData()
}
func (sp *SubProfile) SetData(data Data) {
	if data.Has(posProp) {
		sp.SetPos(data.Get(posProp).(Vec2))
	}
	if data.Has(dirProp) {
		sp.SetDir(data.Get(dirProp).(Vec2))
	}
}