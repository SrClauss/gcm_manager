import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Enum as SAEnum, Integer, String

from app.core.database import Base


class UserRole(str, enum.Enum):
    agent = "agent"
    inspector = "inspector"
    dispatcher = "dispatcher"
    commander = "commander"


class UserRank(str, enum.Enum):
    gcm = "GCM"
    sub_inspector = "Sub-Inspetor"
    inspector = "Inspetor"
    sub_commander = "Sub-Comandante"
    commander = "Comandante"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    badge_number = Column(String(20), unique=True, index=True, nullable=False)
    war_name = Column(String(100), nullable=False)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=True)
    hashed_password = Column(String(200), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.agent, nullable=False)
    rank = Column(SAEnum(UserRank), default=UserRank.gcm, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    weapon_carry = Column(Boolean, default=False)
    driver_license = Column(String(20), nullable=True)
    driver_license_expiry = Column(Date, nullable=True)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
