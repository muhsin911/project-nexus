"""
Job Database Service.
Handles CRUD operations for the Job model, including Geohash computation.
"""

import logging
from typing import Any

import geohash2

from app.db.models.job import Job
from app.db.session import async_session_maker

logger = logging.getLogger(__name__)


async def create_job(job_data: dict[str, Any]) -> Job:
    """
    Creates a new Job record in the database.
    Automatically computes the Geohash if latitude and longitude are provided.
    """
    lat = job_data.get("latitude")
    lng = job_data.get("longitude")
    
    gh = None
    if lat is not None and lng is not None:
        try:
            gh = geohash2.encode(float(lat), float(lng))
        except Exception as e:
            logger.warning(f"Failed to encode geohash for lat={lat}, lng={lng}: {e}")

    async with async_session_maker() as session:
        job = Job(
            title=job_data["title"],
            company=job_data["company"],
            description=job_data["description"],
            location_name=job_data.get("location_name"),
            url=job_data["url"],
            is_remote=job_data.get("is_remote", False),
            latitude=lat,
            longitude=lng,
            geohash=gh,
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)
        return job