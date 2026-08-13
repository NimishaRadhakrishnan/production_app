"""
Dealer and Inventory Router endpoints.
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import Optional, Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.dealer_use_case import DealerUseCase
from app.core.container import get_dealer_use_case
from app.presentation.api.v1.dependencies import CurrentUser, require_role
from app.domain.value_objects.role import Role
from app.presentation.schemas.dealer_schemas import (
    DealerApprovalRequest,
    DealerOrderResponse,
    DealerResponse,
    DealerStockResponse,
    PlaceOrderRequest,
    ProductResponse,
    RegisterDealerRequest,
    StockAuditRequest,
)

router = APIRouter(prefix="/dealers", tags=["dealers"])


@router.post("/", response_model=DealerResponse, status_code=status.HTTP_201_CREATED)
async def register_dealer(
    payload: RegisterDealerRequest,
    current_user: Annotated[object, Depends(require_role(Role.ADMIN, Role.MANAGER, Role.SALES_OFFICER))],
    use_case: Annotated[DealerUseCase, Depends(get_dealer_use_case)],
) -> DealerResponse:
    # Sales Officers can add a dealer, but it sits pending until an
    # Admin/Manager approves it — they cannot self-approve by any payload
    # field, since the status is decided here from the caller's own role,
    # never from client input.
    is_self_approving_role = current_user.role in ("admin", "manager")
    result = await use_case.register_dealer(
        name=payload.name,
        phone=payload.phone,
        district=payload.district,
        village=payload.village,
        taluk=payload.taluk,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        address=payload.address,
        contact_person=payload.contact_person,
        requested_by=current_user.user_id,
        initial_status="active" if is_self_approving_role else "pending_approval",
    )
    return _to_dealer_response(result)


@router.get("/search", response_model=list[DealerResponse])
async def search_dealers(
    current_user: CurrentUser,
    use_case: Annotated[DealerUseCase, Depends(get_dealer_use_case)],
    district: Optional[str] = None,
    taluk: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[DealerResponse]:
    # Default view (no status_filter given) only shows active dealers —
    # pending/rejected dealers never leak into normal ordering flows.
    # Only Admin/Manager may explicitly request other statuses (e.g. the
    # approval queue via ?status_filter=pending_approval).
    is_privileged = current_user.role in ("admin", "manager")
    effective_status = status_filter if (status_filter and is_privileged) else "active"
    result = await use_case.search_dealers(
        district=district, taluk=taluk, status=effective_status, date_from=date_from, date_to=date_to, limit=limit, offset=offset
    )
    return [_to_dealer_response(d) for d in result]


@router.patch("/{dealer_id}/approval", response_model=DealerResponse)
async def set_dealer_approval(
    dealer_id: uuid.UUID,
    payload: DealerApprovalRequest,
    _access: Annotated[object, Depends(require_role(Role.ADMIN, Role.MANAGER))],
    use_case: Annotated[DealerUseCase, Depends(get_dealer_use_case)],
) -> DealerResponse:
    try:
        result = await use_case.set_dealer_approval(dealer_id, payload.approve)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _to_dealer_response(result)


@router.get("/orders/all", response_model=list[DealerOrderResponse])
async def list_all_orders(
    use_case: Annotated[DealerUseCase, Depends(get_dealer_use_case)],
    _access: Annotated[object, Depends(require_role(Role.ADMIN, Role.MANAGER))],
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[DealerOrderResponse]:
    result = await use_case.list_dealer_orders(dealer_id=None, status=status_filter, limit=limit, offset=offset)
    return [_to_order_response(o) for o in result]


@router.post("/{dealer_id}/stock", response_model=DealerStockResponse)
async def audit_stock(
    dealer_id: uuid.UUID,
    payload: StockAuditRequest,
    use_case: Annotated[DealerUseCase, Depends(get_dealer_use_case)],
    _access: Annotated[object, Depends(require_role(Role.ADMIN, Role.MANAGER))],
) -> DealerStockResponse:
    result = await use_case.audit_stock(
        dealer_id=dealer_id,
        product_id=payload.product_id,
        stock_qty=payload.stock_qty,
        notes=payload.notes,
    )
    return DealerStockResponse(
        id=result.id,
        dealer_id=result.dealer_id,
        product_id=result.product_id,
        stock_qty=result.stock_qty,
        low_stock_threshold=result.low_stock_threshold,
        last_updated_at=result.last_updated_at,
    )


@router.post("/{dealer_id}/orders", response_model=DealerOrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    dealer_id: uuid.UUID,
    payload: PlaceOrderRequest,
    current_user: CurrentUser,
    use_case: Annotated[DealerUseCase, Depends(get_dealer_use_case)],
    _access: Annotated[object, Depends(require_role(Role.ADMIN, Role.MANAGER, Role.SALES_OFFICER))],
) -> DealerOrderResponse:
    items_list = [{"product_id": str(item.product_id), "quantity": item.quantity} for item in payload.items]
    result = await use_case.place_order(
        dealer_id=dealer_id,
        created_by=current_user.user_id,
        items=items_list,
        comments=payload.comments,
    )
    return _to_order_response(result)


@router.get("/{dealer_id}/orders", response_model=list[DealerOrderResponse])
async def list_orders(
    dealer_id: uuid.UUID,
    use_case: Annotated[DealerUseCase, Depends(get_dealer_use_case)],
    _access: Annotated[object, Depends(require_role(Role.ADMIN, Role.MANAGER))],
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[DealerOrderResponse]:
    result = await use_case.list_dealer_orders(dealer_id=dealer_id, status=status_filter, limit=limit, offset=offset)
    return [_to_order_response(o) for o in result]


@router.get("/products/catalog", response_model=list[ProductResponse])
async def list_products(
    current_user: CurrentUser,
    use_case: Annotated[DealerUseCase, Depends(get_dealer_use_case)],
) -> list[ProductResponse]:
    result = await use_case.list_products()
    return [
        ProductResponse(
            id=p.id,
            name=p.name,
            category=p.category,
            sku_code=p.sku_code,
            price=p.price,
            description=p.description,
        )
        for p in result
    ]


def _to_dealer_response(dealer) -> DealerResponse:
    return DealerResponse(
        id=dealer.id,
        name=dealer.name,
        phone=dealer.phone,
        district=dealer.district,
        village=dealer.village,
        taluk=dealer.taluk,
        location_lat=dealer.location_lat,
        location_lng=dealer.location_lng,
        address=dealer.address,
        contact_person=dealer.contact_person,
        status=dealer.status,
        requested_by=dealer.requested_by,
        created_at=dealer.created_at,
    )


def _to_order_response(order) -> DealerOrderResponse:
    items = [
        {
            "id": item.id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
        }
        for item in order.items
    ]
    return DealerOrderResponse(
        id=order.id,
        dealer_id=order.dealer_id,
        created_by=order.created_by,
        status=order.status,
        total_amount=order.total_amount,
        comments=order.comments,
        order_date=order.order_date,
        items=items,
        created_at=order.created_at,
    )
