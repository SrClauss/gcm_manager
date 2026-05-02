import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class OccurrenceType(str, enum.Enum):
    flagrante = "Flagrante"
    suspect_approached = "Suspeito Abordado"
    traffic_accident = "Acidente de Trânsito"
    domestic_violence = "Violência Doméstica"
    theft = "Furto"
    robbery = "Roubo"
    drug_trafficking = "Tráfico de Drogas"
    public_disturbance = "Perturbação da Ordem"
    other = "Outros"


class OccurrenceStatus(str, enum.Enum):
    open = "Aberto"
    in_progress = "Em Andamento"
    closed = "Encerrado"
    referred = "Encaminhado para DP"


class PersonCondition(str, enum.Enum):
    author = "Autor"
    suspect = "Suspeito"
    investigated = "Investigado"
    victim = "Vítima"
    witness = "Testemunha"
    driver = "Condutor"
    passenger = "Passageiro"


class SeizureType(str, enum.Enum):
    object = "Objeto"
    weapon = "Arma"
    drug = "Entorpecente"
    other = "Outros"


class Occurrence(Base):
    __tablename__ = "occurrences"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    nature = Column(String(200), nullable=False)
    date_time = Column(DateTime, nullable=False)
    type = Column(SAEnum(OccurrenceType), nullable=False)
    status = Column(SAEnum(OccurrenceStatus), default=OccurrenceStatus.open, nullable=False)

    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    street = Column(String(300), nullable=True)
    district = Column(String(200), nullable=True)
    number = Column(String(20), nullable=True)
    zip_code = Column(String(10), nullable=True)
    reference_point = Column(String(300), nullable=True)
    city = Column(String(200), nullable=True)

    # Team
    commander_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)

    # Narrative and sketch
    narrative = Column(Text, nullable=True)
    sketch_url = Column(String(500), nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    persons_involved = relationship(
        "PersonInvolved", back_populates="occurrence", cascade="all, delete-orphan"
    )
    seizures = relationship(
        "Seizure", back_populates="occurrence", cascade="all, delete-orphan"
    )
    vehicles_involved = relationship(
        "VehicleInvolved", back_populates="occurrence", cascade="all, delete-orphan"
    )
    auxiliaries = relationship(
        "OccurrenceAuxiliary", back_populates="occurrence", cascade="all, delete-orphan"
    )


class OccurrenceAuxiliary(Base):
    __tablename__ = "occurrence_auxiliaries"

    id = Column(Integer, primary_key=True)
    occurrence_id = Column(Integer, ForeignKey("occurrences.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    occurrence = relationship("Occurrence", back_populates="auxiliaries")


class PersonInvolved(Base):
    __tablename__ = "persons_involved"

    id = Column(Integer, primary_key=True, index=True)
    occurrence_id = Column(Integer, ForeignKey("occurrences.id"), nullable=False)
    condition = Column(SAEnum(PersonCondition), nullable=False)
    full_name = Column(String(200), nullable=False)
    dob = Column(String(10), nullable=True)
    cpf = Column(String(14), nullable=True)
    rg = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(400), nullable=True)
    document_photo_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    occurrence = relationship("Occurrence", back_populates="persons_involved")


class Seizure(Base):
    __tablename__ = "seizures"

    id = Column(Integer, primary_key=True, index=True)
    occurrence_id = Column(Integer, ForeignKey("occurrences.id"), nullable=False)
    type = Column(SAEnum(SeizureType), nullable=False)
    description = Column(String(500), nullable=False)
    quantity = Column(String(100), nullable=True)
    brand = Column(String(200), nullable=True)
    model = Column(String(200), nullable=True)
    serial_number = Column(String(100), nullable=True)
    destination = Column(String(300), nullable=True)
    photo_url = Column(String(500), nullable=True)

    occurrence = relationship("Occurrence", back_populates="seizures")


class VehicleInvolved(Base):
    __tablename__ = "vehicles_involved"

    id = Column(Integer, primary_key=True, index=True)
    occurrence_id = Column(Integer, ForeignKey("occurrences.id"), nullable=False)
    plate = Column(String(10), nullable=True)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    year = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    occurrence = relationship("Occurrence", back_populates="vehicles_involved")
