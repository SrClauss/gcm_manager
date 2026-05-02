from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.occurrence import OccurrenceStatus, OccurrenceType, PersonCondition, SeizureType


class PersonInvolvedCreate(BaseModel):
    condition: PersonCondition
    full_name: str = Field(..., max_length=200)
    dob: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class PersonInvolvedResponse(PersonInvolvedCreate):
    id: int
    document_photo_url: Optional[str] = None

    model_config = {"from_attributes": True}


class SeizureCreate(BaseModel):
    type: SeizureType
    description: str = Field(..., max_length=500)
    quantity: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    destination: Optional[str] = None


class SeizureResponse(SeizureCreate):
    id: int
    photo_url: Optional[str] = None

    model_config = {"from_attributes": True}


class VehicleInvolvedCreate(BaseModel):
    plate: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    notes: Optional[str] = None


class VehicleInvolvedResponse(VehicleInvolvedCreate):
    id: int

    model_config = {"from_attributes": True}


class OccurrenceCreate(BaseModel):
    nature: str = Field(..., max_length=200)
    date_time: datetime
    type: OccurrenceType

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    street: Optional[str] = None
    district: Optional[str] = None
    number: Optional[str] = None
    zip_code: Optional[str] = None
    reference_point: Optional[str] = None
    city: Optional[str] = None

    commander_id: Optional[int] = None
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    auxiliary_ids: List[int] = []

    narrative: Optional[str] = None
    persons_involved: List[PersonInvolvedCreate] = []
    seizures: List[SeizureCreate] = []
    vehicles_involved: List[VehicleInvolvedCreate] = []


class OccurrenceUpdate(BaseModel):
    nature: Optional[str] = None
    status: Optional[OccurrenceStatus] = None
    narrative: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    street: Optional[str] = None
    district: Optional[str] = None
    number: Optional[str] = None
    reference_point: Optional[str] = None


class OccurrenceResponse(BaseModel):
    id: int
    code: str
    nature: str
    date_time: datetime
    type: OccurrenceType
    status: OccurrenceStatus
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    street: Optional[str] = None
    district: Optional[str] = None
    number: Optional[str] = None
    reference_point: Optional[str] = None
    city: Optional[str] = None
    commander_id: Optional[int] = None
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    narrative: Optional[str] = None
    sketch_url: Optional[str] = None
    persons_involved: List[PersonInvolvedResponse] = []
    seizures: List[SeizureResponse] = []
    vehicles_involved: List[VehicleInvolvedResponse] = []
    created_by_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OccurrenceListItem(BaseModel):
    id: int
    code: str
    nature: str
    date_time: datetime
    type: OccurrenceType
    status: OccurrenceStatus
    street: Optional[str] = None
    district: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
