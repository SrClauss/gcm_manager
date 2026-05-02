from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.patrol_report import PatrolReportStatus, PropertyType


class SchoolCrossingCreate(BaseModel):
    location: str
    start_time: datetime
    end_time: Optional[datetime] = None
    observation: Optional[str] = None


class SchoolCrossingResponse(SchoolCrossingCreate):
    id: int

    model_config = {"from_attributes": True}


class PropertyRoundCreate(BaseModel):
    property_name: str
    property_type: PropertyType
    round_time: datetime
    local_contact: Optional[str] = None
    observation: Optional[str] = None


class PropertyRoundResponse(PropertyRoundCreate):
    id: int

    model_config = {"from_attributes": True}


class ApproachedPersonCreate(BaseModel):
    full_name: str
    dob: Optional[str] = None
    cpf: Optional[str] = None
    location: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class ApproachedPersonResponse(ApproachedPersonCreate):
    id: int

    model_config = {"from_attributes": True}


class SearchedVehicleCreate(BaseModel):
    plate: str
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    driver_name: Optional[str] = None
    location: Optional[str] = None
    result: Optional[str] = None
    notes: Optional[str] = None


class SearchedVehicleResponse(SearchedVehicleCreate):
    id: int

    model_config = {"from_attributes": True}


class PatrolReportCreate(BaseModel):
    date: datetime
    shift_open: datetime
    commander_id: Optional[int] = None
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    sector: Optional[str] = None
    km_initial: Optional[int] = None
    auxiliary_ids: List[int] = []


class PatrolReportUpdate(BaseModel):
    shift_close: Optional[datetime] = None
    km_final: Optional[int] = None
    observations: Optional[str] = None
    status: Optional[PatrolReportStatus] = None


class PatrolReportResponse(BaseModel):
    id: int
    date: datetime
    shift_open: datetime
    shift_close: Optional[datetime] = None
    status: PatrolReportStatus
    commander_id: Optional[int] = None
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    sector: Optional[str] = None
    km_initial: Optional[int] = None
    km_final: Optional[int] = None
    observations: Optional[str] = None
    school_crossings: List[SchoolCrossingResponse] = []
    property_rounds: List[PropertyRoundResponse] = []
    approached_persons: List[ApproachedPersonResponse] = []
    searched_vehicles: List[SearchedVehicleResponse] = []
    created_by_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
