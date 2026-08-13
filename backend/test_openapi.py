from app.main import app
from fastapi.openapi.utils import get_openapi
import traceback

for route in app.routes:
    try:
        if hasattr(route, "endpoint"):
            get_openapi(title="t", version="1", routes=[route])
    except Exception as e:
        print(f"FAILED ROUTE: {route.path} - {route.endpoint.__name__}")
        traceback.print_exc()
        break
