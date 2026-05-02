import os
import uuid
from datetime import datetime
from typing import List, Optional

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.occurrence import (
    Occurrence,
    OccurrenceAuxiliary,
    OccurrenceStatus,
    OccurrenceType,
    PersonInvolved,
    Seizure,
    VehicleInvolved,
)
from app.models.user import User
from app.schemas.occurrence import (
    OccurrenceCreate,
    OccurrenceListItem,
    OccurrenceResponse,
    OccurrenceUpdate,
)

router = APIRouter()

_IMG_MAGIC: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
    (b"RIFF", "webp"),  # further validated below
]


def _detect_image_ext(data: bytes) -> str:
    """Return a safe file extension detected from magic bytes."""
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return "jpg"

_LOAD_OPTIONS = [
    selectinload(Occurrence.persons_involved),
    selectinload(Occurrence.seizures),
    selectinload(Occurrence.vehicles_involved),
    selectinload(Occurrence.auxiliaries),
]


async def _generate_code(db: AsyncSession) -> str:
    year = datetime.now().year
    result = await db.execute(
        select(func.count(Occurrence.id)).where(
            func.extract("year", Occurrence.created_at) == year
        )
    )
    seq = (result.scalar() or 0) + 1
    return f"TO-{year}-{seq:05d}"


@router.post("/", response_model=OccurrenceResponse, status_code=status.HTTP_201_CREATED)
async def create_occurrence(
    data: OccurrenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    occurrence = Occurrence(
        code=await _generate_code(db),
        nature=data.nature,
        date_time=data.date_time,
        type=data.type,
        latitude=data.latitude,
        longitude=data.longitude,
        street=data.street,
        district=data.district,
        number=data.number,
        zip_code=data.zip_code,
        reference_point=data.reference_point,
        city=data.city,
        commander_id=data.commander_id,
        driver_id=data.driver_id,
        vehicle_id=data.vehicle_id,
        narrative=data.narrative,
        created_by_id=current_user.id,
    )
    db.add(occurrence)
    await db.flush()

    for uid in data.auxiliary_ids:
        db.add(OccurrenceAuxiliary(occurrence_id=occurrence.id, user_id=uid))

    for p in data.persons_involved:
        db.add(PersonInvolved(occurrence_id=occurrence.id, **p.model_dump()))

    for s in data.seizures:
        db.add(Seizure(occurrence_id=occurrence.id, **s.model_dump()))

    for v in data.vehicles_involved:
        db.add(VehicleInvolved(occurrence_id=occurrence.id, **v.model_dump()))

    await db.flush()

    result = await db.execute(
        select(Occurrence).options(*_LOAD_OPTIONS).where(Occurrence.id == occurrence.id)
    )
    return OccurrenceResponse.model_validate(result.scalar_one())


@router.get("/", response_model=List[OccurrenceListItem])
async def list_occurrences(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    occurrence_status: Optional[OccurrenceStatus] = Query(None, alias="status"),
    occurrence_type: Optional[OccurrenceType] = Query(None, alias="type"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = []
    if occurrence_status:
        filters.append(Occurrence.status == occurrence_status)
    if occurrence_type:
        filters.append(Occurrence.type == occurrence_type)
    if date_from:
        filters.append(Occurrence.date_time >= date_from)
    if date_to:
        filters.append(Occurrence.date_time <= date_to)
    if current_user.role == "agent":
        filters.append(Occurrence.created_by_id == current_user.id)

    query = select(Occurrence).order_by(Occurrence.created_at.desc())
    if filters:
        query = query.where(and_(*filters))
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return [OccurrenceListItem.model_validate(o) for o in result.scalars()]


@router.get("/{occurrence_id}", response_model=OccurrenceResponse)
async def get_occurrence(
    occurrence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Occurrence)
        .options(*_LOAD_OPTIONS)
        .where(Occurrence.id == occurrence_id)
    )
    occurrence = result.scalar_one_or_none()
    if not occurrence:
        raise HTTPException(status_code=404, detail="Talão não encontrado")
    if current_user.role == "agent" and occurrence.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return OccurrenceResponse.model_validate(occurrence)


@router.patch("/{occurrence_id}", response_model=OccurrenceResponse)
async def update_occurrence(
    occurrence_id: int,
    data: OccurrenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Occurrence)
        .options(*_LOAD_OPTIONS)
        .where(Occurrence.id == occurrence_id)
    )
    occurrence = result.scalar_one_or_none()
    if not occurrence:
        raise HTTPException(status_code=404, detail="Talão não encontrado")
    if current_user.role == "agent" and occurrence.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(occurrence, key, value)

    db.add(occurrence)
    await db.flush()
    await db.refresh(occurrence)
    return OccurrenceResponse.model_validate(occurrence)


@router.post("/{occurrence_id}/sketch")
async def upload_sketch(
    occurrence_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Occurrence).where(Occurrence.id == occurrence_id))
    occurrence = result.scalar_one_or_none()
    if not occurrence:
        raise HTTPException(status_code=404, detail="Talão não encontrado")

    content = await file.read()
    ext = _detect_image_ext(content)
    filename = os.path.basename(f"sketch_{occurrence_id}_{uuid.uuid4().hex}.{ext}")
    upload_base = os.path.realpath(settings.UPLOAD_DIR)
    sketches_dir = os.path.realpath(os.path.join(upload_base, "sketches"))
    os.makedirs(sketches_dir, exist_ok=True)
    dest = os.path.realpath(os.path.join(sketches_dir, filename))
    if not dest.startswith(sketches_dir + os.sep) and dest != sketches_dir:
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido")

    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)

    occurrence.sketch_url = f"/uploads/sketches/{filename}"
    db.add(occurrence)
    return {"sketch_url": occurrence.sketch_url}


@router.post("/{occurrence_id}/persons/{person_id}/document-photo")
async def upload_document_photo(
    occurrence_id: int,
    person_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PersonInvolved).where(
            PersonInvolved.id == person_id,
            PersonInvolved.occurrence_id == occurrence_id,
        )
    )
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    content = await file.read()
    ext = _detect_image_ext(content)
    filename = os.path.basename(f"doc_{person_id}_{uuid.uuid4().hex}.{ext}")
    upload_base = os.path.realpath(settings.UPLOAD_DIR)
    docs_dir = os.path.realpath(os.path.join(upload_base, "documents"))
    os.makedirs(docs_dir, exist_ok=True)
    dest = os.path.realpath(os.path.join(docs_dir, filename))
    if not dest.startswith(docs_dir + os.sep) and dest != docs_dir:
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido")

    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)

    person.document_photo_url = f"/uploads/documents/{filename}"
    db.add(person)
    return {"document_photo_url": person.document_photo_url}
