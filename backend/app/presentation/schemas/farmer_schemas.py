"""
Farmer Pydantic schemas.
"""

from __future__ import annotations
from typing import Optional

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class RegisterFarmerRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=10, max_length=50)
    village: str = Field(min_length=1, max_length=100)
    taluk: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    crop: str = Field(min_length=1, max_length=100)
    acres: float = Field(gt=0.0)
    location_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    location_lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    photo_url: Optional[str] = None


class FarmerResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    village: str
    taluk: str
    district: str
    crop: str
    acres: float
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    photo_url: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime