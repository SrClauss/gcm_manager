from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.personnel import EquipmentStatus, EquipmentType


class EquipmentCreate(BaseModel):
    type: EquipmentType
    description: str
    serial_number: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    notes: Optional[str] = None


class EquipmentResponse(EquipmentCreate):
    id: int
    status: EquipmentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class EquipmentCustodyCreate(BaseModel):
    equipment_id: int
    agent_id: int
    condition_on_withdrawal: Optional[str] = None
    notes: Optional[str] = None


class EquipmentCustodyReturn(BaseModel):
    condition_on_return: Optional[str] = None
    notes: Optional[str] = None


class EquipmentCustodyResponse(BaseModel):
    id: int
    equipment_id: int
    agent_id: int
    inspector_id: Optional[int] = None
    withdrawn_at: datetime
    returned_at: Optional[datetime] = None
    condition_on_withdrawal: Optional[str] = None
    condition_on_return: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class ServiceScaleCreate(BaseModel):
    name: str
    scale_type: str
    start_date: datetime
    end_date: Optional[datetime] = None


class ScaleAssignmentCreate(BaseModel):
    scale_id: int
    user_id: int
    shift_start: datetime
    shift_end: datetime
    role_in_shift: Optional[str] = None
    notes: Optional[str] = None


class ScaleAssignmentResponse(ScaleAssignmentCreate):
    id: int

    model_config = {"from_attributes": True}


class ServiceScaleResponse(ServiceScaleCreate):
    id: int
    created_by_id: int
    assignments: List[ScaleAssignmentResponse] = []

    model_config = {"from_attributes": True}
