from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.fleet import ChecklistType, Vehicle, VehicleChecklist, VehicleStatus
from app.models.user import User
from app.schemas.fleet import (
    VehicleChecklistCreate,
    VehicleChecklistResponse,
    VehicleCreate,
    VehicleResponse,
    VehicleUpdate,
)

router = APIRouter()


@router.post("/vehicles", response_model=VehicleResponse, status_code=201)
async def create_vehicle(
    data: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["inspector", "commander"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    vehicle = Vehicle(**data.model_dump())
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return VehicleResponse.model_validate(vehicle)


@router.get("/vehicles", response_model=List[VehicleResponse])
async def list_vehicles(
    vehicle_status: Optional[VehicleStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Vehicle).order_by(Vehicle.plate)
    if vehicle_status:
        query = query.where(Vehicle.status == vehicle_status)
    result = await db.execute(query)
    return [VehicleResponse.model_validate(v) for v in result.scalars()]


@router.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return VehicleResponse.model_validate(vehicle)


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["inspector", "commander"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, key, value)

    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return VehicleResponse.model_validate(vehicle)


@router.post("/checklists", response_model=VehicleChecklistResponse, status_code=201)
async def create_checklist(
    data: VehicleChecklistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == data.vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    critical_issues = []
    if data.siren_ok is False:
        critical_issues.append("Sirene")
    if data.lights_ok is False:
        critical_issues.append("Luzes/Giroflex")
    if data.tires_ok is False:
        critical_issues.append("Pneus")
    if data.oil_level_ok is False:
        critical_issues.append("Nível de Óleo")

    is_blocked = len(critical_issues) > 0
    block_reason = f"Problemas críticos: {', '.join(critical_issues)}" if critical_issues else None

    checklist = VehicleChecklist(
        vehicle_id=data.vehicle_id,
        agent_id=current_user.id,
        checklist_type=data.checklist_type,
        km_reading=data.km_reading,
        siren_ok=data.siren_ok,
        lights_ok=data.lights_ok,
        oil_level_ok=data.oil_level_ok,
        body_ok=data.body_ok,
        tires_ok=data.tires_ok,
        trunk_ok=data.trunk_ok,
        notes=data.notes,
        is_blocked=is_blocked,
        block_reason=block_reason,
    )
    db.add(checklist)

    if is_blocked and data.checklist_type == ChecklistType.departure:
        vehicle.status = VehicleStatus.blocked
    elif data.checklist_type == ChecklistType.departure and not is_blocked:
        vehicle.status = VehicleStatus.in_use
        vehicle.current_km = data.km_reading
    elif data.checklist_type == ChecklistType.return_:
        vehicle.status = VehicleStatus.available
        vehicle.current_km = data.km_reading

    db.add(vehicle)
    await db.flush()
    await db.refresh(checklist)
    return VehicleChecklistResponse.model_validate(checklist)


@router.get("/checklists", response_model=List[VehicleChecklistResponse])
async def list_checklists(
    vehicle_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(VehicleChecklist)
        .order_by(VehicleChecklist.created_at.desc())
        .limit(limit)
    )
    if vehicle_id:
        query = query.where(VehicleChecklist.vehicle_id == vehicle_id)
    if current_user.role == "agent":
        query = query.where(VehicleChecklist.agent_id == current_user.id)

    result = await db.execute(query)
    return [VehicleChecklistResponse.model_validate(c) for c in result.scalars()]
