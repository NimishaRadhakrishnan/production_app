"""
Dealer and Inventory Pydantic schemas.
"""

from __future__ import annotations
from typing import Optional

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class RegisterDealerRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=10, max_length=50)
    district: str = Field(min_length=1, max_length=100)
    village: Optional[str] = Field(default=None, max_length=100)
    taluk: Optional[str] = Field(default=None, max_length=100)
    location_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    location_lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    address: Optional[str] = None
    contact_person: Optional[str] = Field(default=None, max_length=150)


class DealerResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    district: str
    village: Optional[str] = None
    taluk: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    status: str = "active"
    requested_by: Optional[uuid.UUID] = None
    created_at: datetime


class DealerApprovalRequest(BaseModel):
    approve: bool


class StockAuditRequest(BaseModel):
    product_id: uuid.UUID
    stock_qty: int = Field(ge=0)
    notes: Optional[str] = None


class DealerStockResponse(BaseModel):
    id: uuid.UUID
    dealer_id: uuid.UUID
    product_id: uuid.UUID
    stock_qty: int
    low_stock_threshold: int
    last_updated_at: datetime


class OrderItemInput(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)


class PlaceOrderRequest(BaseModel):
    items: list[OrderItemInput] = Field(min_length=1)
    comments: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: float


class DealerOrderResponse(BaseModel):
    id: uuid.UUID
    dealer_id: uuid.UUID
    created_by: uuid.UUID
    status: str
    total_amount: float
    comments: Optional[str]
    order_date: datetime
    items: list[OrderItemResponse]
    created_at: datetime


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    sku_code: str
    price: float
    description: Optional[str]