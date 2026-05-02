from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.fleet import ChecklistType, VehicleStatus


class VehicleCreate(BaseModel):
    plate: str = Field(..., max_length=10)
    brand: str = Field(..., max_length=100)
    model: str = Field(..., max_length=100)
    year: Optional[int] = None
    color: Optional[str] = None
    prefix: Optional[str] = None
    notes: Optional[str] = None


class VehicleUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    prefix: Optional[str] = None
    status: Optional[VehicleStatus] = None
    notes: Optional[str] = None


class VehicleResponse(VehicleCreate):
    id: int
    status: VehicleStatus
    current_km: int
    created_at: datetime

    model_config = {"from_attributes": True}


class VehicleChecklistCreate(BaseModel):
    vehicle_id: int
    checklist_type: ChecklistType
    km_reading: int
    siren_ok: Optional[bool] = None
    lights_ok: Optional[bool] = None
    oil_level_ok: Optional[bool] = None
    body_ok: Optional[bool] = None
    tires_ok: Optional[bool] = None
    trunk_ok: Optional[bool] = None
    notes: Optional[str] = None


class VehicleChecklistResponse(VehicleChecklistCreate):
    id: int
    agent_id: int
    is_blocked: bool
    block_reason: Optional[str] = None
    date_time: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
