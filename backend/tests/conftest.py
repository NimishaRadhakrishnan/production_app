from __future__ import annotations

import os

# Settings are validated at import time (required fields: jwt_secret_key,
# postgres_password), so test-only defaults must exist before any app module
# is imported. This runs once per test session via pytest's collection of
# conftest.py before test modules.
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("POSTGRES_PASSWORD", "test-password")
os.environ.setdefault("ENVIRONMENT", "test")
