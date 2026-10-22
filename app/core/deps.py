"""
Core FastAPI Dependencies.
Centralizes dependency injection for routes, ensuring clean separation of concerns.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_db as _get_db_session

# Type aliases for Annotated dependencies (FastAPI best practice)
# Usage: async def my_route(settings: SettingsDep, db: DBSessionDep):
SettingsDep = Annotated[Settings, Depends(get_settings)]
DBSessionDep = Annotated[AsyncSession, Depends(_get_db_session)]