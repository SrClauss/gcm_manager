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


class PatrolReportStatus(str, enum.Enum):
    open = "Aberto"
    closed = "Encerrado"
    approved = "Aprovado"


class PropertyType(str, enum.Enum):
    school = "Escola"
    park = "Parque"
    health_center = "UBS/UPA"
    other = "Outro"


class PatrolReport(Base):
    __tablename__ = "patrol_reports"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    shift_open = Column(DateTime, nullable=False)
    shift_close = Column(DateTime, nullable=True)
    status = Column(SAEnum(PatrolReportStatus), default=PatrolReportStatus.open, nullable=False)

    commander_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    sector = Column(String(100), nullable=True)

    km_initial = Column(Integer, nullable=True)
    km_final = Column(Integer, nullable=True)
    observations = Column(Text, nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    school_crossings = relationship(
        "SchoolCrossing", back_populates="patrol_report", cascade="all, delete-orphan"
    )
    property_rounds = relationship(
        "PropertyRound", back_populates="patrol_report", cascade="all, delete-orphan"
    )
    approached_persons = relationship(
        "ApproachedPerson", back_populates="patrol_report", cascade="all, delete-orphan"
    )
    searched_vehicles = relationship(
        "SearchedVehicle", back_populates="patrol_report", cascade="all, delete-orphan"
    )
    auxiliaries = relationship(
        "PatrolAuxiliary", back_populates="patrol_report", cascade="all, delete-orphan"
    )


class PatrolAuxiliary(Base):
    __tablename__ = "patrol_auxiliaries"

    id = Column(Integer, primary_key=True)
    patrol_report_id = Column(Integer, ForeignKey("patrol_reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    patrol_report = relationship("PatrolReport", back_populates="auxiliaries")


class SchoolCrossing(Base):
    __tablename__ = "school_crossings"

    id = Column(Integer, primary_key=True, index=True)
    patrol_report_id = Column(Integer, ForeignKey("patrol_reports.id"), nullable=False)
    location = Column(String(300), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    observation = Column(Text, nullable=True)

    patrol_report = relationship("PatrolReport", back_populates="school_crossings")


class PropertyRound(Base):
    __tablename__ = "property_rounds"

    id = Column(Integer, primary_key=True, index=True)
    patrol_report_id = Column(Integer, ForeignKey("patrol_reports.id"), nullable=False)
    property_name = Column(String(300), nullable=False)
    property_type = Column(SAEnum(PropertyType), nullable=False)
    round_time = Column(DateTime, nullable=False)
    local_contact = Column(String(200), nullable=True)
    observation = Column(Text, nullable=True)

    patrol_report = relationship("PatrolReport", back_populates="property_rounds")


class ApproachedPerson(Base):
    __tablename__ = "approached_persons"

    id = Column(Integer, primary_key=True, index=True)
    patrol_report_id = Column(Integer, ForeignKey("patrol_reports.id"), nullable=False)
    full_name = Column(String(200), nullable=False)
    dob = Column(String(10), nullable=True)
    cpf = Column(String(14), nullable=True)
    location = Column(String(300), nullable=True)
    reason = Column(String(300), nullable=True)
    notes = Column(Text, nullable=True)

    patrol_report = relationship("PatrolReport", back_populates="approached_persons")


class SearchedVehicle(Base):
    __tablename__ = "searched_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    patrol_report_id = Column(Integer, ForeignKey("patrol_reports.id"), nullable=False)
    plate = Column(String(10), nullable=False)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    driver_name = Column(String(200), nullable=True)
    location = Column(String(300), nullable=True)
    result = Column(String(300), nullable=True)
    notes = Column(Text, nullable=True)

    patrol_report = relationship("PatrolReport", back_populates="searched_vehicles")
