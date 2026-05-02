from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.patrol_report import (
    ApproachedPerson,
    PatrolAuxiliary,
    PatrolReport,
    PatrolReportStatus,
    PropertyRound,
    SchoolCrossing,
    SearchedVehicle,
)
from app.models.user import User
from app.schemas.patrol_report import (
    ApproachedPersonCreate,
    ApproachedPersonResponse,
    PatrolReportCreate,
    PatrolReportResponse,
    PatrolReportUpdate,
    PropertyRoundCreate,
    PropertyRoundResponse,
    SchoolCrossingCreate,
    SchoolCrossingResponse,
    SearchedVehicleCreate,
    SearchedVehicleResponse,
)

router = APIRouter()

_LOAD_OPTIONS = [
    selectinload(PatrolReport.school_crossings),
    selectinload(PatrolReport.property_rounds),
    selectinload(PatrolReport.approached_persons),
    selectinload(PatrolReport.searched_vehicles),
    selectinload(PatrolReport.auxiliaries),
]


@router.post("/", response_model=PatrolReportResponse, status_code=201)
async def create_patrol_report(
    data: PatrolReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = PatrolReport(
        date=data.date,
        shift_open=data.shift_open,
        commander_id=data.commander_id,
        driver_id=data.driver_id,
        vehicle_id=data.vehicle_id,
        sector=data.sector,
        km_initial=data.km_initial,
        created_by_id=current_user.id,
    )
    db.add(report)
    await db.flush()

    for uid in data.auxiliary_ids:
        db.add(PatrolAuxiliary(patrol_report_id=report.id, user_id=uid))

    await db.flush()
    result = await db.execute(
        select(PatrolReport).options(*_LOAD_OPTIONS).where(PatrolReport.id == report.id)
    )
    return PatrolReportResponse.model_validate(result.scalar_one())


@router.get("/", response_model=List[PatrolReportResponse])
async def list_patrol_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    report_status: Optional[PatrolReportStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = []
    if report_status:
        filters.append(PatrolReport.status == report_status)
    if current_user.role == "agent":
        filters.append(PatrolReport.created_by_id == current_user.id)

    query = (
        select(PatrolReport)
        .options(*_LOAD_OPTIONS)
        .order_by(PatrolReport.created_at.desc())
    )
    if filters:
        query = query.where(and_(*filters))
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return [PatrolReportResponse.model_validate(r) for r in result.scalars()]


@router.get("/{report_id}", response_model=PatrolReportResponse)
async def get_patrol_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PatrolReport)
        .options(*_LOAD_OPTIONS)
        .where(PatrolReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    return PatrolReportResponse.model_validate(report)


@router.patch("/{report_id}", response_model=PatrolReportResponse)
async def update_patrol_report(
    report_id: int,
    data: PatrolReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PatrolReport)
        .options(*_LOAD_OPTIONS)
        .where(PatrolReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(report, key, value)

    db.add(report)
    await db.flush()
    await db.refresh(report)
    return PatrolReportResponse.model_validate(report)


@router.post("/{report_id}/school-crossings", response_model=SchoolCrossingResponse, status_code=201)
async def add_school_crossing(
    report_id: int,
    data: SchoolCrossingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = SchoolCrossing(patrol_report_id=report_id, **data.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return SchoolCrossingResponse.model_validate(obj)


@router.post("/{report_id}/property-rounds", response_model=PropertyRoundResponse, status_code=201)
async def add_property_round(
    report_id: int,
    data: PropertyRoundCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = PropertyRound(patrol_report_id=report_id, **data.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return PropertyRoundResponse.model_validate(obj)


@router.post("/{report_id}/approached-persons", response_model=ApproachedPersonResponse, status_code=201)
async def add_approached_person(
    report_id: int,
    data: ApproachedPersonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = ApproachedPerson(patrol_report_id=report_id, **data.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return ApproachedPersonResponse.model_validate(obj)


@router.post("/{report_id}/searched-vehicles", response_model=SearchedVehicleResponse, status_code=201)
async def add_searched_vehicle(
    report_id: int,
    data: SearchedVehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = SearchedVehicle(patrol_report_id=report_id, **data.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return SearchedVehicleResponse.model_validate(obj)
