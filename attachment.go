package main

import (
	"time"
)

type ConnectionType uint8
const (
	unknownConnectionType ConnectionType = iota
	offsetConnectionType
	attractConnectionType
)

type Connection struct {
	connectionType ConnectionType
	offset Vec2

	attractFactor float64
	distance float64
}

func NewOffsetConnection(offset Vec2) Connection {
	return Connection {
		connectionType: offsetConnectionType,
		offset: offset,
	}
}

func NewAttractConnection(attract float64) Connection {
	return Connection {
		connectionType: attractConnectionType,
		attractFactor: attract,
		distance: 0,
	}
}

func (c Connection) GetType() ConnectionType {
	return c.connectionType
}

func (c *Connection) SetOffset(offset Vec2) {
	c.offset = offset
}

func (c *Connection) SetDistance(distance float64) {
	c.distance = distance
}

func (c Connection) GetOffset() Vec2 { return c.offset }
func (c Connection) GetAttractFactor() float64 { return c.attractFactor }
func (c Connection) GetDistance() float64 { return c.distance }

type Attachment struct {
	connections map[SpacedId]Connection
	sid SpacedId
}

func NewAttachment(sid SpacedId) Attachment {
	return Attachment {
		connections: make(map[SpacedId]Connection),
		sid: sid,
	}
}

func (a *Attachment) AddConnection(parent SpacedId, connection Connection) {
	a.connections[parent] = connection
}

func (a Attachment) GetConnections() map[SpacedId]Connection {
	return a.connections
}

func (a *Attachment) removeConnection(parent SpacedId) {
	delete(a.connections, parent)
}

func (a *Attachment) PreUpdate(grid *Grid, now time.Time) {
	self := grid.Get(a.sid)
	if self == nil {
		return
	}

	for parentId, connection := range(a.connections) {
		parent := grid.Get(parentId)

		if parent == nil {
			a.removeConnection(parentId)

			if len(a.connections) == 0 {
				self.RemoveAttribute(attachedAttribute)
			}
			continue
		}

		if connection.GetType() == attractConnectionType {
			force := parent.Pos()
			force.Add(connection.GetOffset(), 1.0)
			force.Sub(self.Pos(), 1.0)

			forceLen := force.Len() - connection.GetDistance()
			force.Normalize()
			force.Scale(connection.attractFactor)

			smoothingDistance := connection.attractFactor
			if forceLen < smoothingDistance {
				force.Scale(forceLen / smoothingDistance)
				force.Scale(forceLen / smoothingDistance)
			}
			self.AddForce(force)
		}

		if !self.HasAttribute(attachedAttribute) {
			self.AddAttribute(attachedAttribute)
		}
	}
}

func (a *Attachment) PostUpdate(grid *Grid, now time.Time) {
	// TODO: refactor so code is not duplicated
	self := grid.Get(a.sid)
	if self == nil {
		return
	}

	for parentId, connection := range(a.connections) {
		parent := grid.Get(parentId)

		if parent == nil {
			a.removeConnection(parentId)

			if len(a.connections) == 0 {
				self.RemoveAttribute(attachedAttribute)
			}
			continue
		}

		if connection.GetType() == offsetConnectionType {
			pos := parent.Pos()
			pos.Add(connection.GetOffset(), 1.0)
			self.SetPos(pos)
			self.SetVel(parent.Vel())
			grid.Upsert(self)
		}

		if !self.HasAttribute(attachedAttribute) {
			self.AddAttribute(attachedAttribute)
		}
	}
}