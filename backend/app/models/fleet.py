import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


class VehicleStatus(str, enum.Enum):
    available = "Disponível"
    in_use = "Em Uso"
    maintenance = "Em Manutenção"
    blocked = "Bloqueado"


class ChecklistType(str, enum.Enum):
    departure = "Saída"
    return_ = "Retorno"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String(10), unique=True, index=True, nullable=False)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=True)
    color = Column(String(50), nullable=True)
    prefix = Column(String(20), nullable=True)
    status = Column(SAEnum(VehicleStatus), default=VehicleStatus.available, nullable=False)
    current_km = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    checklists = relationship("VehicleChecklist", back_populates="vehicle")


class VehicleChecklist(Base):
    __tablename__ = "vehicle_checklists"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    checklist_type = Column(SAEnum(ChecklistType), nullable=False)
    km_reading = Column(Integer, nullable=False)
    date_time = Column(DateTime, nullable=False, default=datetime.utcnow)

    siren_ok = Column(Boolean, nullable=True)
    lights_ok = Column(Boolean, nullable=True)
    oil_level_ok = Column(Boolean, nullable=True)
    body_ok = Column(Boolean, nullable=True)
    tires_ok = Column(Boolean, nullable=True)
    trunk_ok = Column(Boolean, nullable=True)

    is_blocked = Column(Boolean, default=False)
    block_reason = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="checklists")
