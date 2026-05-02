import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class EquipmentType(str, enum.Enum):
    weapon = "Arma"
    radio = "Rádio HT"
    vest = "Colete"
    handcuffs = "Algemas"
    other = "Outros"


class EquipmentStatus(str, enum.Enum):
    active = "Ativo"
    maintenance = "Em Manutenção"
    decommissioned = "Desativado"


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(SAEnum(EquipmentType), nullable=False)
    description = Column(String(300), nullable=False)
    serial_number = Column(String(100), unique=True, nullable=True)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    status = Column(SAEnum(EquipmentStatus), default=EquipmentStatus.active, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    custodies = relationship("EquipmentCustody", back_populates="equipment")


class EquipmentCustody(Base):
    __tablename__ = "equipment_custodies"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    withdrawn_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    returned_at = Column(DateTime, nullable=True)
    condition_on_withdrawal = Column(String(300), nullable=True)
    condition_on_return = Column(String(300), nullable=True)
    notes = Column(Text, nullable=True)

    equipment = relationship("Equipment", back_populates="custodies")


class ServiceScale(Base):
    __tablename__ = "service_scales"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    scale_type = Column(String(50), nullable=False)  # 12x36, 24x72, expedient
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    assignments = relationship(
        "ScaleAssignment", back_populates="scale", cascade="all, delete-orphan"
    )


class ScaleAssignment(Base):
    __tablename__ = "scale_assignments"

    id = Column(Integer, primary_key=True, index=True)
    scale_id = Column(Integer, ForeignKey("service_scales.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shift_start = Column(DateTime, nullable=False)
    shift_end = Column(DateTime, nullable=False)
    role_in_shift = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    scale = relationship("ServiceScale", back_populates="assignments")
