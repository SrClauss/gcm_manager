from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.user import UserRank, UserRole


class UserBase(BaseModel):
    badge_number: str = Field(..., max_length=20)
    war_name: str = Field(..., max_length=100)
    full_name: str = Field(..., max_length=200)
    email: Optional[str] = None
    role: UserRole = UserRole.agent
    rank: UserRank = UserRank.gcm
    weapon_carry: bool = False
    driver_license: Optional[str] = None
    driver_license_expiry: Optional[date] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    war_name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    rank: Optional[UserRank] = None
    weapon_carry: Optional[bool] = None
    driver_license: Optional[str] = None
    driver_license_expiry: Optional[date] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    photo_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id: int
    badge_number: str
    war_name: str
    rank: UserRank
    role: UserRole

    model_config = {"from_attributes": True}
