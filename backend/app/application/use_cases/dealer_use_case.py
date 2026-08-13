"""
Dealer and Inventory Use Cases.
"""

from __future__ import annotations
from typing import Optional

import uuid
from datetime import datetime, date

from app.domain.entities.dealer import Dealer, Product, DealerStock, DealerOrder, OrderItem, StockMovement
from app.domain.repositories.dealer_repository import DealerRepository


class DealerUseCase:
    def __init__(self, dealer_repository: DealerRepository) -> None:
        self._dealer_repository = dealer_repository

    async def register_dealer(
        self,
        name: str,
        phone: str,
        district: str,
        village: Optional[str] = None,
        taluk: Optional[str] = None,
        location_lat: Optional[float] = None,
        location_lng: Optional[float] = None,
        address: Optional[str] = None,
        contact_person: Optional[str] = None,
        requested_by: Optional[uuid.UUID] = None,
        initial_status: str = "active",
    ) -> Dealer:
        existing = await self._dealer_repository.get_by_phone(phone)
        if existing:
            raise ValueError(f"A dealer with phone number {phone} is already registered.")

        dealer = Dealer(
            name=name,
            phone=phone,
            district=district,
            village=village,
            taluk=taluk,
            location_lat=location_lat,
            location_lng=location_lng,
            address=address,
            contact_person=contact_person,
            status=initial_status,
            requested_by=requested_by,
        )
        return await self._dealer_repository.add(dealer)

    async def search_dealers(
        self,
        district: Optional[str] = None,
        taluk: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Dealer]:
        return await self._dealer_repository.search_dealers(
            district=district, taluk=taluk, status=status, date_from=date_from, date_to=date_to, limit=limit, offset=offset
        )

    async def set_dealer_approval(self, dealer_id: uuid.UUID, approve: bool) -> Dealer:
        dealer = await self._dealer_repository.get_by_id(dealer_id)
        if not dealer:
            raise ValueError("Dealer not found.")
        if dealer.status != "pending_approval":
            raise ValueError(f"Dealer is not pending approval (current status: {dealer.status}).")
        new_status = "active" if approve else "rejected"
        updated = await self._dealer_repository.set_dealer_status(dealer_id, new_status)
        return updated

    async def get_dealer_profile(self, dealer_id: uuid.UUID) -> Optional[Dealer]:
        return await self._dealer_repository.get_by_id(dealer_id)

    # Inventory Stocks
    async def audit_stock(self, dealer_id: uuid.UUID, product_id: uuid.UUID, stock_qty: int, notes: Optional[str] = None) -> DealerStock:
        dealer = await self._dealer_repository.get_by_id(dealer_id)
        if not dealer:
            raise ValueError("Dealer not found.")
        product = await self._dealer_repository.get_product_by_id(product_id)
        if not product:
            raise ValueError("Product not found.")

        stock = await self._dealer_repository.get_stock(dealer_id, product_id)
        if stock:
            diff = stock_qty - stock.stock_qty
            stock.stock_qty = stock_qty
            stock.last_updated_at = datetime.utcnow()
            await self._dealer_repository.update_stock(stock)
        else:
            diff = stock_qty
            stock = DealerStock(dealer_id=dealer_id, product_id=product_id, stock_qty=stock_qty)
            await self._dealer_repository.update_stock(stock)

        # Record stock movement ledger
        movement = StockMovement(
            dealer_id=dealer_id,
            product_id=product_id,
            quantity=diff,
            movement_type="stock_adjustment",
            notes=notes or "Manual inventory stock audit.",
        )
        await self._dealer_repository.record_movement(movement)
        return stock

    # Orders
    async def place_order(self, dealer_id: uuid.UUID, created_by: uuid.UUID, items: list[dict], comments: Optional[str] = None) -> DealerOrder:
        order_items = []
        total_amount = 0.0
        for item in items:
            prod_id = uuid.UUID(item["product_id"])
            qty = item["quantity"]
            product = await self._dealer_repository.get_product_by_id(prod_id)
            if not product:
                raise ValueError(f"Product not found: {prod_id}")
            unit_price = product.price
            total_amount += unit_price * qty
            order_items.append(OrderItem(product_id=prod_id, quantity=qty, unit_price=unit_price))

        order = DealerOrder(
            dealer_id=dealer_id,
            created_by=created_by,
            status="submitted",
            items=order_items,
            total_amount=total_amount,
            comments=comments,
        )
        created_order = await self._dealer_repository.add_order(order)

        # Record stock movement for items
        for item in order_items:
            movement = StockMovement(
                dealer_id=dealer_id,
                product_id=item.product_id,
                quantity=item.quantity,
                movement_type="inbound_order",
                notes=f"Order {created_order.id} submitted.",
            )
            await self._dealer_repository.record_movement(movement)
            # Update dealer stock level
            stock = await self._dealer_repository.get_stock(dealer_id, item.product_id)
            if stock:
                stock.stock_qty += item.quantity
                await self._dealer_repository.update_stock(stock)
            else:
                new_stock = DealerStock(dealer_id=dealer_id, product_id=item.product_id, stock_qty=item.quantity)
                await self._dealer_repository.update_stock(new_stock)

        return created_order

    async def list_dealer_orders(self, dealer_id: Optional[uuid.UUID] = None, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> list[DealerOrder]:
        return await self._dealer_repository.list_orders(dealer_id=dealer_id, status=status, limit=limit, offset=offset)

    async def list_products(self) -> list[Product]:
        return await self._dealer_repository.list_products()