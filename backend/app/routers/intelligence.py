from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.fleet import Vehicle
from app.models.occurrence import Occurrence, OccurrenceType
from app.models.user import User

router = APIRouter()


@router.get("/stats/overview")
async def get_overview_stats(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["dispatcher", "commander", "inspector"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    filters = []
    if date_from:
        filters.append(Occurrence.date_time >= date_from)
    if date_to:
        filters.append(Occurrence.date_time <= date_to)

    base_query = select(func.count(Occurrence.id))
    if filters:
        base_query = base_query.where(and_(*filters))
    total = (await db.execute(base_query)).scalar() or 0

    type_q = select(Occurrence.type, func.count(Occurrence.id).label("count")).group_by(
        Occurrence.type
    )
    if filters:
        type_q = type_q.where(and_(*filters))
    by_type = [
        {"type": row.type, "count": row.count} for row in (await db.execute(type_q)).all()
    ]

    status_q = select(
        Occurrence.status, func.count(Occurrence.id).label("count")
    ).group_by(Occurrence.status)
    if filters:
        status_q = status_q.where(and_(*filters))
    by_status = [
        {"status": row.status, "count": row.count} for row in (await db.execute(status_q)).all()
    ]

    active_vehicles = (
        await db.execute(
            select(func.count(Vehicle.id)).where(Vehicle.status == "Em Uso")
        )
    ).scalar() or 0

    return {
        "total_occurrences": total,
        "by_type": by_type,
        "by_status": by_status,
        "active_vehicles": active_vehicles,
    }


@router.get("/crime-map")
async def get_crime_map_data(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    occurrence_type: Optional[OccurrenceType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["dispatcher", "commander", "inspector"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    query = select(
        Occurrence.id,
        Occurrence.code,
        Occurrence.type,
        Occurrence.nature,
        Occurrence.latitude,
        Occurrence.longitude,
        Occurrence.street,
        Occurrence.district,
        Occurrence.date_time,
    ).where(
        and_(
            Occurrence.latitude.isnot(None),
            Occurrence.longitude.isnot(None),
        )
    )

    if date_from:
        query = query.where(Occurrence.date_time >= date_from)
    if date_to:
        query = query.where(Occurrence.date_time <= date_to)
    if occurrence_type:
        query = query.where(Occurrence.type == occurrence_type)

    rows = (await db.execute(query)).all()
    points = [
        {
            "id": r.id,
            "code": r.code,
            "type": r.type,
            "nature": r.nature,
            "lat": r.latitude,
            "lng": r.longitude,
            "address": f"{r.street or ''} {r.district or ''}".strip(),
            "date": r.date_time.isoformat(),
        }
        for r in rows
    ]
    return {"points": points, "total": len(points)}


@router.get("/vehicles/positions")
async def get_vehicle_positions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["dispatcher", "commander"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    result = await db.execute(select(Vehicle).where(Vehicle.status == "Em Uso"))
    vehicles = result.scalars().all()

    return {
        "vehicles": [
            {
                "id": v.id,
                "plate": v.plate,
                "prefix": v.prefix,
                "model": f"{v.brand} {v.model}",
                "status": v.status,
                "current_km": v.current_km,
            }
            for v in vehicles
        ]
    }


@router.get("/reports/by-period")
async def get_reports_by_period(
    date_from: datetime,
    date_to: datetime,
    group_by: str = Query("day", pattern="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["commander", "inspector"]:
        raise HTTPException(status_code=403, detail="Permissão insuficiente")

    result = await db.execute(
        select(
            func.date_trunc(group_by, Occurrence.date_time).label("period"),
            func.count(Occurrence.id).label("count"),
        )
        .where(
            and_(
                Occurrence.date_time >= date_from,
                Occurrence.date_time <= date_to,
            )
        )
        .group_by("period")
        .order_by("period")
    )

    return [{"period": row.period.isoformat(), "count": row.count} for row in result.all()]
