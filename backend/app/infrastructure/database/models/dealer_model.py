"""
Dealer and Inventory database models.
"""

from __future__ import annotations
from typing import Optional

import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Double, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.models.base_model import TimestampedUUIDMixin
from app.infrastructure.database.session import Base


class DealerModel(TimestampedUUIDMixin, Base):
    __tablename__ = "dealers"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    village: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    taluk: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    requested_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class ProductModel(TimestampedUUIDMixin, Base):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    sku_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class DealerStockModel(TimestampedUUIDMixin, Base):
    __tablename__ = "dealer_stocks"

    dealer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("dealers.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class DealerOrderModel(TimestampedUUIDMixin, Base):
    __tablename__ = "dealer_orders"

    dealer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("dealers.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    comments: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    order_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    items: Mapped[list[OrderItemModel]] = relationship(
        "OrderItemModel", back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItemModel(TimestampedUUIDMixin, Base):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("dealer_orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    order: Mapped[DealerOrderModel] = relationship("DealerOrderModel", back_populates="items")


class StockMovementModel(TimestampedUUIDMixin, Base):
    __tablename__ = "stock_movements"

    dealer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("dealers.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)  # inbound_order, sales_out, stock_adjustment, return
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)