import asyncio
from sqlalchemy import text
from app.infrastructure.database.session import AsyncSessionLocal
from datetime import datetime, timezone, timedelta

async def main():
    async with AsyncSessionLocal() as session:
        # Get Kavin's ID
        res = await session.execute(text("SELECT id FROM users WHERE full_name = 'Kavin'"))
        kavin_id = res.scalar()
        
        # Get the bad attendance record
        res = await session.execute(text("SELECT id, check_in_time FROM attendance WHERE user_id = :id").bindparams(id=kavin_id))
        att = res.mappings().first()
        if att:
            # Shift the time forward by 5h30m because it was saved as 03:13 instead of 08:43 UTC
            # Wait, 08:43 AM IST was 03:13 UTC.
            # But the actual check-in time was 14:13 IST (08:43 UTC).
            # The database stored 03:13 UTC.
            # So I need to add 5h30m to it to get 08:43 UTC.
            new_time = att['check_in_time'] + timedelta(hours=5, minutes=30)
            await session.execute(
                text("UPDATE attendance SET check_in_time = :new_time WHERE id = :att_id")
                .bindparams(new_time=new_time, att_id=att['id'])
            )
            await session.commit()
            print(f"Fixed attendance {att['id']} to {new_time}")
        else:
            print("No attendance record found.")

asyncio.run(main())
