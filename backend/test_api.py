import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Login
        resp = await client.post("http://127.0.0.1:8001/api/v1/auth/login", data={"username": "admin@vishakan.com", "password": "password"})
        token = resp.json()["access_token"]
        
        # Get productivity
        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.get("http://127.0.0.1:8001/api/v1/productivity?period=weekly", headers=headers)
        prod = resp.json()
        print("Productivity officers:", [p["officer_name"] for p in prod])
        
        # Get roster
        resp = await client.get("http://127.0.0.1:8001/api/v1/attendance/roster-status", headers=headers)
        roster = resp.json()
        print("Roster officers:", [r["full_name"] for r in roster])

asyncio.run(main())
