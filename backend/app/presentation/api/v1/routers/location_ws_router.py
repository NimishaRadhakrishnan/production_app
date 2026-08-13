from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import asyncio
import json
import logging
from app.infrastructure.websockets.connection_manager import ConnectionManager
from app.infrastructure.cache.redis_client import get_redis_client
from app.infrastructure.security.jwt_token_service import JWTTokenService

router = APIRouter(prefix="/ws", tags=["websockets"])
logger = logging.getLogger(__name__)

location_ws_manager = ConnectionManager()

@router.websocket("/locations")
async def websocket_locations(websocket: WebSocket, token: str = Query(...)):
    # Authenticate
    token_service = JWTTokenService()
    user_payload = await token_service.verify_access_token(token)
    if not user_payload:
        await websocket.close(code=1008)
        return

    await location_ws_manager.connect(websocket)
    redis = get_redis_client()
    pubsub = redis.pubsub()
    
    try:
        await pubsub.subscribe("location_updates")
        
        async def read_from_ws():
            try:
                while True:
                    _ = await websocket.receive_text()
            except WebSocketDisconnect:
                pass

        async def write_to_ws():
            try:
                async for message in pubsub.listen():
                    if message["type"] == "message":
                        data = message["data"]
                        if isinstance(data, bytes):
                            data = data.decode('utf-8')
                        await websocket.send_text(data)
            except Exception as e:
                logger.error(f"Error in websocket broadcast: {e}")

        await asyncio.gather(
            read_from_ws(),
            write_to_ws()
        )
            
    except WebSocketDisconnect:
        location_ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket location error: {e}")
        location_ws_manager.disconnect(websocket)
    finally:
        await pubsub.unsubscribe("location_updates")
