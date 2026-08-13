"""
DealerRepository interface.
"""

from __future__ import annotations
from typing import Optional
from datetime import date

import uuid
from abc import ABC, abstractmethod

from app.domain.entities.dealer import Dealer, Product, DealerStock, DealerOrder, StockMovement


class DealerRepository(ABC):
    @abstractmethod
    async def get_by_id(self, dealer_id: uuid.UUID) -> Optional[Dealer]: ...

    @abstractmethod
    async def get_by_phone(self, phone: str) -> Optional[Dealer]: ...

    @abstractmethod
    async def add(self, dealer: Dealer) -> Dealer: ...

    @abstractmethod
    async def search_dealers(
        self,
        *,
        district: Optional[str] = None,
        taluk: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Dealer]: ...

    @abstractmethod
    async def set_dealer_status(self, dealer_id: uuid.UUID, status: str) -> Optional[Dealer]: ...

    # Product
    @abstractmethod
    async def get_product_by_id(self, product_id: uuid.UUID) -> Optional[Product]: ...

    @abstractmethod
    async def get_product_by_sku(self, sku_code: str) -> Optional[Product]: ...

    @abstractmethod
    async def add_product(self, product: Product) -> Product: ...

    @abstractmethod
    async def list_products(self) -> list[Product]: ...

    # Stocks
    @abstractmethod
    async def get_stock(self, dealer_id: uuid.UUID, product_id: uuid.UUID) -> Optional[DealerStock]: ...

    @abstractmethod
    async def update_stock(self, stock: DealerStock) -> DealerStock: ...

    @abstractmethod
    async def get_low_stock_alerts(self, dealer_id: Optional[uuid.UUID] = None) -> list[DealerStock]: ...

    # Orders
    @abstractmethod
    async def get_order_by_id(self, order_id: uuid.UUID) -> Optional[DealerOrder]: ...

    @abstractmethod
    async def add_order(self, order: DealerOrder) -> DealerOrder: ...

    @abstractmethod
    async def update_order(self, order: DealerOrder) -> DealerOrder: ...

    @abstractmethod
    async def list_orders(self, *, dealer_id: Optional[uuid.UUID] = None, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> list[DealerOrder]: ...

    # Stock Movements
    @abstractmethod
    async def record_movement(self, movement: StockMovement) -> StockMovement: ...

    @abstractmethod
    async def list_movements(self, dealer_id: uuid.UUID, *, limit: int = 50, offset: int = 0) -> list[StockMovement]: ...