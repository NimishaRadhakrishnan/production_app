"""
End-to-end auth flow against the real FastAPI app, real Postgres, and real
Redis. Requires DATABASE and REDIS to be reachable (docker-compose / CI
service containers) and the `users` table migrated. Skipped automatically
if the database is unreachable, so this suite doesn't block a
laptop-only `pytest` run that only has the unit suite's dependencies.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.infrastructure.database.session import engine
from app.main import app


async def _database_reachable() -> bool:
    # Dispose first: app.infrastructure.database.session.engine is a
    # module-level singleton whose asyncpg connection pool binds to
    # whichever event loop first uses it. pytest.ini's
    # asyncio_default_fixture_loop_scope = function gives every async
    # test its own fresh event loop, so by the second test function to
    # reach this check, the pool's connections belong to an already-
    # closed loop. Using them raises RuntimeError: "...got Future
    # attached to a different loop" - which the bare except below then
    # silently reported as "database unreachable" even though Postgres
    # was never actually down. Disposing discards those stale pooled
    # connections so a fresh one gets created bound to the loop that's
    # actually running right now.
    try:
        await engine.dispose()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@pytest.mark.asyncio
async def test_full_auth_flow() -> None:
    if not await _database_reachable():
        pytest.skip("Database not reachable in this environment; run via docker-compose or CI.")

    unique_email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # /auth/register is admin-gated (require_role(Role.ADMIN)) - this
        # test previously called it with no Authorization header at all,
        # which always 403'd. It was written before that gating existed
        # and never caught because this whole suite silently self-skips
        # without a reachable database. Logs in as the seeded demo admin
        # (seed_demo_data.py) to get a token, matching the same pattern
        # test_user_management_flow.py already uses for its own
        # admin-gated calls.
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@vishakan.com", "password": "Password123!"},
        )
        assert admin_login.status_code == 200, (
            "Seeded admin login failed - run `python seed_demo_data.py` against "
            "this database before running the integration suite."
        )
        admin_token = admin_login.json()["access_token"]

        register_response = await client.post(
            "/api/v1/auth/register",
            json={"email": unique_email, "password": "StrongPass123", "full_name": "Test User"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert register_response.status_code == 201

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "StrongPass123"},
        )
        assert login_response.status_code == 200
        tokens = login_response.json()
        assert "access_token" in tokens and "refresh_token" in tokens

        me_response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert me_response.status_code == 200
        assert me_response.json()["email"] == unique_email

        refresh_response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.json()
        assert new_tokens["refresh_token"] != tokens["refresh_token"]

        # Old refresh token must now be invalid (rotation).
        reuse_response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert reuse_response.status_code == 401

        logout_response = await client.post(
            "/api/v1/auth/logout", json={"refresh_token": new_tokens["refresh_token"]}
        )
        assert logout_response.status_code == 204


@pytest.mark.asyncio
async def test_duplicate_registration_returns_409() -> None:
    if not await _database_reachable():
        pytest.skip("Database not reachable in this environment; run via docker-compose or CI.")

    unique_email = f"dup-{uuid.uuid4().hex[:10]}@example.com"
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Same admin-gating fix as test_full_auth_flow above.
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@vishakan.com", "password": "Password123!"},
        )
        assert admin_login.status_code == 200, (
            "Seeded admin login failed - run `python seed_demo_data.py` against "
            "this database before running the integration suite."
        )
        admin_token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        payload = {"email": unique_email, "password": "StrongPass123", "full_name": "A"}
        first = await client.post("/api/v1/auth/register", json=payload, headers=headers)
        second = await client.post("/api/v1/auth/register", json=payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["code"] == "duplicate_entity"
