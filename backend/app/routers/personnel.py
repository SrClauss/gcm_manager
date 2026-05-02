from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models.personnel import Equipment, EquipmentCustody, ScaleAssignment, ServiceScale
from app.models.user import User
from app.schemas.personnel import (
    EquipmentCreate,
    EquipmentCustodyCreate,
    EquipmentCustodyResponse,
    EquipmentCustodyReturn,
    EquipmentResponse,
    ScaleAssignmentCreate,
    ScaleAssignmentResponse,
    ServiceScaleCreate,
    ServiceScaleResponse,
)
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


@router.get("/agents", response_model=List[UserResponse])
async def list_agents(
    role: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(User).order_by(User.war_name)
    filters = []
    if role:
        filters.append(User.role == role)
    if is_active is not None:
        filters.append(User.is_active == is_active)
    if filters:
        query = query.where(and_(*filters))
    result = await db.execute(query)
    return [UserResponse.model_validate(u) for u in result.scalars()]


@router.get("/agents/{agent_id}", response_model=UserResponse)
async def get_agent(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == agent_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Agente não encontrado")
    return UserResponse.model_validate(user)


@router.patch("/agents/{agent_id}", response_model=UserResponse)
async def update_agent(
    agent_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["inspector", "commander"] and current_user.id != agent_id:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    result = await db.execute(select(User).where(User.id == agent_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Agente não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/license-alerts")
async def get_license_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["inspector", "commander"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    today = date.today()
    alert_cutoff = today + timedelta(days=30)

    result = await db.execute(
        select(User).where(
            and_(
                User.driver_license_expiry.isnot(None),
                User.driver_license_expiry <= alert_cutoff,
                User.is_active == True,
            )
        )
    )
    agents = result.scalars().all()
    return [
        {
            "id": u.id,
            "badge_number": u.badge_number,
            "war_name": u.war_name,
            "driver_license": u.driver_license,
            "driver_license_expiry": str(u.driver_license_expiry),
            "days_until_expiry": (u.driver_license_expiry - today).days,
        }
        for u in agents
    ]


# ── Equipment ──────────────────────────────────────────────────────────────


@router.post("/equipment", response_model=EquipmentResponse, status_code=201)
async def create_equipment(
    data: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["inspector", "commander"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    equipment = Equipment(**data.model_dump())
    db.add(equipment)
    await db.flush()
    await db.refresh(equipment)
    return EquipmentResponse.model_validate(equipment)


@router.get("/equipment", response_model=List[EquipmentResponse])
async def list_equipment(
    equipment_type: Optional[str] = Query(None, alias="type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Equipment).order_by(Equipment.description)
    if equipment_type:
        query = query.where(Equipment.type == equipment_type)
    result = await db.execute(query)
    return [EquipmentResponse.model_validate(e) for e in result.scalars()]


@router.post("/equipment-custody", response_model=EquipmentCustodyResponse, status_code=201)
async def withdraw_equipment(
    data: EquipmentCustodyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    custody = EquipmentCustody(
        equipment_id=data.equipment_id,
        agent_id=data.agent_id,
        inspector_id=current_user.id,
        condition_on_withdrawal=data.condition_on_withdrawal,
        notes=data.notes,
    )
    db.add(custody)
    await db.flush()
    await db.refresh(custody)
    return EquipmentCustodyResponse.model_validate(custody)


@router.patch("/equipment-custody/{custody_id}/return", response_model=EquipmentCustodyResponse)
async def return_equipment(
    custody_id: int,
    data: EquipmentCustodyReturn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EquipmentCustody).where(EquipmentCustody.id == custody_id)
    )
    custody = result.scalar_one_or_none()
    if not custody:
        raise HTTPException(status_code=404, detail="Custódia não encontrada")

    custody.returned_at = datetime.utcnow()
    custody.condition_on_return = data.condition_on_return
    if data.notes:
        custody.notes = (custody.notes or "") + f" | Retorno: {data.notes}"

    db.add(custody)
    await db.flush()
    await db.refresh(custody)
    return EquipmentCustodyResponse.model_validate(custody)


@router.get("/equipment-custody", response_model=List[EquipmentCustodyResponse])
async def list_custody(
    agent_id: Optional[int] = None,
    open_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(EquipmentCustody).order_by(EquipmentCustody.withdrawn_at.desc())
    filters = []
    if agent_id:
        filters.append(EquipmentCustody.agent_id == agent_id)
    if open_only:
        filters.append(EquipmentCustody.returned_at.is_(None))
    if filters:
        query = query.where(and_(*filters))
    result = await db.execute(query)
    return [EquipmentCustodyResponse.model_validate(c) for c in result.scalars()]


# ── Service Scales ──────────────────────────────────────────────────────────


@router.post("/scales", response_model=ServiceScaleResponse, status_code=201)
async def create_scale(
    data: ServiceScaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["inspector", "commander"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    scale = ServiceScale(**data.model_dump(), created_by_id=current_user.id)
    db.add(scale)
    await db.flush()

    result = await db.execute(
        select(ServiceScale)
        .options(selectinload(ServiceScale.assignments))
        .where(ServiceScale.id == scale.id)
    )
    return ServiceScaleResponse.model_validate(result.scalar_one())


@router.get("/scales", response_model=List[ServiceScaleResponse])
async def list_scales(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ServiceScale)
        .options(selectinload(ServiceScale.assignments))
        .order_by(ServiceScale.start_date.desc())
    )
    return [ServiceScaleResponse.model_validate(s) for s in result.scalars()]


@router.post("/scales/{scale_id}/assignments", response_model=ScaleAssignmentResponse, status_code=201)
async def add_assignment(
    scale_id: int,
    data: ScaleAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["inspector", "commander"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    assignment = ScaleAssignment(**data.model_dump())
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)
    return ScaleAssignmentResponse.model_validate(assignment)
