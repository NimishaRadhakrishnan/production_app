import asyncio
import uuid
from datetime import date, datetime, timezone, timedelta
from sqlalchemy import delete, text

from app.infrastructure.database.session import AsyncSessionLocal
from app.infrastructure.database.models import (
    UserModel,
    TerritoryModel,
    ProductModel,
    FarmerModel,
    DealerModel,
    DealerStockModel,
    AttendanceModel,
    WeeklyPlanModel,
    WeeklyPlanActivityModel,
    VisitModel,
    CropIssueModel,
    DealerOrderModel,
    OrderItemModel,
    ExpenseModel,
)
from app.infrastructure.security.bcrypt_password_hasher import BcryptPasswordHasher

async def seed():
    print("Starting Vishakan Biotech database seeding...")
    hasher = BcryptPasswordHasher()
    hashed_password = hasher.hash("Password123!")

    async with AsyncSessionLocal() as session:
        # Clear existing tables (respecting FK order)
        print("Clearing existing tables...")
        await session.execute(text("DELETE FROM officer_locations"))
        await session.execute(delete(ExpenseModel))
        await session.execute(delete(OrderItemModel))
        await session.execute(delete(DealerOrderModel))
        await session.execute(delete(CropIssueModel))
        await session.execute(delete(VisitModel))
        await session.execute(delete(WeeklyPlanActivityModel))
        await session.execute(delete(WeeklyPlanModel))
        await session.execute(delete(AttendanceModel))
        await session.execute(delete(DealerStockModel))
        await session.execute(delete(FarmerModel))
        await session.execute(delete(DealerModel))
        await session.execute(delete(ProductModel))
        await session.execute(delete(TerritoryModel))
        await session.execute(delete(UserModel))
        await session.commit()

        print("Seeding Users...")
        admin = UserModel(
            id=uuid.uuid4(),
            email="admin@vishakan.com",
            hashed_password=hashed_password,
            full_name="Nimisha R",
            role="admin",
            is_active=True,
            employee_id="VB-0001",
        )
        manager = UserModel(
            id=uuid.uuid4(),
            email="manager@vishakan.com",
            hashed_password=hashed_password,
            full_name="Ravi Chandran",
            role="manager",
            is_active=True,
            employee_id="VB-0002",
        )
        officer1 = UserModel(
            id=uuid.uuid4(),
            email="karthik@vishakan.com",
            hashed_password=hashed_password,
            full_name="Karthik Raja",
            role="field_officer",
            is_active=True,
            employee_id="VB-1002",
            device_id="dev-device-uuid-9912",
        )
        officer2 = UserModel(
            id=uuid.uuid4(),
            email="suresh@vishakan.com",
            hashed_password=hashed_password,
            full_name="Suresh Kumar",
            role="field_officer",
            is_active=True,
            employee_id="VB-1003",
            device_id="dev-device-uuid-9913",
        )
        officer3 = UserModel(
            id=uuid.uuid4(),
            email="dinesh@vishakan.com",
            hashed_password=hashed_password,
            full_name="Dinesh Prabhu",
            role="sales_officer",
            is_active=True,
            employee_id="VB-1004",
            device_id="dev-device-uuid-9914",
        )
        session.add_all([admin, manager, officer1, officer2, officer3])
        await session.flush()

        print("Seeding Territories...")
        salem_t = TerritoryModel(
            id=uuid.uuid4(),
            name="Salem North Zone",
            district="Salem",
            taluk="Salem North",
            village="Mallasamudram",
            boundary="POLYGON((78.1 11.6, 78.2 11.6, 78.2 11.7, 78.1 11.7, 78.1 11.6))"
        )
        namakkal_t = TerritoryModel(
            id=uuid.uuid4(),
            name="Namakkal Main Zone",
            district="Namakkal",
            taluk="Rasipuram",
            village="Rasipuram",
            boundary="POLYGON((78.1 11.2, 78.2 11.2, 78.2 11.3, 78.1 11.3, 78.1 11.2))"
        )
        erode_t = TerritoryModel(
            id=uuid.uuid4(),
            name="Erode West Zone",
            district="Erode",
            taluk="Perundurai",
            village="Perundurai",
            boundary="POLYGON((77.5 11.2, 77.6 11.2, 77.6 11.3, 77.5 11.3, 77.5 11.2))"
        )
        session.add_all([salem_t, namakkal_t, erode_t])
        await session.flush()

        print("Seeding Product Catalog...")
        p_npk = ProductModel(
            id=uuid.uuid4(),
            name="Bio-NPK Liquid (1 Liter)",
            category="Bio-Fertilizer",
            sku_code="BIO-NPK-L1",
            price=450.00,
            description="Organic nitrogen, phosphorous and potassium liquid microbial formulation."
        )
        p_pseudo = ProductModel(
            id=uuid.uuid4(),
            name="Pseudomonas Bio-Pesticide (500g)",
            category="Bio-Pesticide",
            sku_code="PSEUDO-P500",
            price=280.00,
            description="Antagonistic bacteria to control root rots, wilts and leaf spots."
        )
        p_tricho = ProductModel(
            id=uuid.uuid4(),
            name="Trichoderma Viride (1kg)",
            category="Bio-Fungicide",
            sku_code="TRICHO-1KG",
            price=320.00,
            description="Effective biological control agent for soil borne diseases."
        )
        session.add_all([p_npk, p_pseudo, p_tricho])
        await session.flush()

        print("Seeding Farmers...")
        farmers = [
            FarmerModel(
                id=uuid.uuid4(), name="Vigneshwaran M", phone="9000100011", village="Mallasamudram", 
                taluk="Salem North", district="Salem", crop="Paddy", acres=4.5, location="POINT(78.1460 11.6643)", created_by=officer1.id
            ),
            FarmerModel(
                id=uuid.uuid4(), name="Sakthivel R", phone="9000100012", village="Edappadi", 
                taluk="Edappadi", district="Salem", crop="Sugarcane", acres=2.0, location="POINT(77.8383 11.5833)", created_by=officer1.id
            ),
            FarmerModel(
                id=uuid.uuid4(), name="Goundamani T", phone="9000100013", village="Elachipalayam", 
                taluk="Rasipuram", district="Namakkal", crop="Cotton", acres=6.0, location="POINT(78.1670 11.2180)", created_by=officer2.id
            ),
            FarmerModel(
                id=uuid.uuid4(), name="Arumugam C", phone="9000100014", village="Tiruchengode", 
                taluk="Tiruchengode", district="Namakkal", crop="Groundnut", acres=3.5, location="POINT(77.8967 11.3800)", created_by=officer2.id
            ),
            FarmerModel(
                id=uuid.uuid4(), name="Murugesan V", phone="9000100015", village="Perundurai", 
                taluk="Perundurai", district="Erode", crop="Turmeric", acres=5.0, location="POINT(77.5833 11.2667)", created_by=officer3.id
            ),
            FarmerModel(
                id=uuid.uuid4(), name="Palani G", phone="9000100016", village="Modakkurichi", 
                taluk="Modakkurichi", district="Erode", crop="Banana", acres=2.5, location="POINT(77.7473 11.2333)", created_by=officer3.id
            ),
            FarmerModel(
                id=uuid.uuid4(), name="Sivakumar K", phone="9000100017", village="Attur", 
                taluk="Attur", district="Salem", crop="Maize", acres=4.0, location="POINT(78.6015 11.5975)", created_by=officer1.id
            ),
            # Older registrations, spread across the past few weeks, so
            # date-range filters and "registered by" reports have real
            # historical spread instead of everything dated "today".
            FarmerModel(
                id=uuid.uuid4(), name="Muthusamy P", phone="9000100018", village="Mecheri",
                taluk="Mecheri", district="Salem", crop="Sugarcane", acres=3.2, location="POINT(78.0500 11.7100)",
                created_by=officer1.id, created_at=datetime.now(timezone.utc) - timedelta(days=21)
            ),
            FarmerModel(
                id=uuid.uuid4(), name="Chinnasamy R", phone="9000100019", village="Namagiripettai",
                taluk="Rasipuram", district="Namakkal", crop="Tapioca", acres=2.8, location="POINT(78.2500 11.3200)",
                created_by=officer2.id, created_at=datetime.now(timezone.utc) - timedelta(days=14)
            ),
            FarmerModel(
                id=uuid.uuid4(), name="Boopathy S", phone="9000100020", village="Bhavani",
                taluk="Bhavani", district="Erode", crop="Coconut", acres=6.5, location="POINT(77.6800 11.4500)",
                created_by=officer3.id, created_at=datetime.now(timezone.utc) - timedelta(days=7)
            ),
        ]
        session.add_all(farmers)
        await session.flush()

        print("Seeding Dealers...")
        dealers = [
            DealerModel(
                id=uuid.uuid4(), name="Subbu Agencies", phone="9876543211", district="Namakkal", 
                village="Elachipalayam", taluk="Rasipuram", location="POINT(78.1678 11.2189)", 
                address="12 Main Bazaar St, Rasipuram", contact_person="Subramanian"
            ),
            DealerModel(
                id=uuid.uuid4(), name="Kannan Agro Center", phone="9876543212", district="Salem", 
                village="Attur", taluk="Attur", location="POINT(78.5980 11.5950)", 
                address="45 Market Rd, Attur", contact_person="Kannan"
            ),
            DealerModel(
                id=uuid.uuid4(), name="Raja Fertilizers", phone="9876543213", district="Erode", 
                village="Perundurai", taluk="Perundurai", location="POINT(77.5810 11.2680)", 
                address="Near Bus Stand, Perundurai", contact_person="Rajamani"
            )
        ]
        session.add_all(dealers)
        await session.flush()

        print("Seeding Dealer Stocks...")
        stocks = [
            DealerStockModel(id=uuid.uuid4(), dealer_id=dealers[0].id, product_id=p_npk.id, stock_qty=4, low_stock_threshold=10),
            DealerStockModel(id=uuid.uuid4(), dealer_id=dealers[0].id, product_id=p_pseudo.id, stock_qty=15, low_stock_threshold=10),
            DealerStockModel(id=uuid.uuid4(), dealer_id=dealers[1].id, product_id=p_npk.id, stock_qty=50, low_stock_threshold=20),
            DealerStockModel(id=uuid.uuid4(), dealer_id=dealers[1].id, product_id=p_tricho.id, stock_qty=5, low_stock_threshold=15),
            DealerStockModel(id=uuid.uuid4(), dealer_id=dealers[2].id, product_id=p_npk.id, stock_qty=25, low_stock_threshold=10),
        ]
        session.add_all(stocks)
        await session.flush()

        print("Seeding Crop Issues...")
        issues = [
            CropIssueModel(
                id=uuid.uuid4(), user_id=officer1.id, farmer_id=farmers[0].id, crop="Paddy",
                assigned_expert_whatsapp="9876543210",
                symptoms="Yellowing of leaves, stunted growth",
                image_url="http://assets/issues/issue1.jpg",
                status="pending", district="Salem"
            ),
            CropIssueModel(
                id=uuid.uuid4(), user_id=officer2.id, farmer_id=farmers[2].id, crop="Cotton",
                assigned_expert_whatsapp="9876543210",
                symptoms="Pink bollworm spots on cotton bolls",
                image_url="http://assets/issues/issue2.jpg",
                status="resolved", district="Namakkal",
                expert_reply="Spray Pseudomonas Bio-Pesticide 5ml/litre immediately."
            ),
            CropIssueModel(
                id=uuid.uuid4(), user_id=officer3.id, farmer_id=farmers[4].id, crop="Turmeric",
                assigned_expert_whatsapp="9876543210",
                symptoms="Leaf blotch and rhizome rot",
                image_url="http://assets/issues/issue3.jpg",
                status="pending", district="Erode"
            ),
            CropIssueModel(
                id=uuid.uuid4(), user_id=officer1.id, farmer_id=farmers[6].id, crop="Maize",
                assigned_expert_whatsapp="9876543210",
                symptoms="Fall armyworm damage on leaves",
                image_url="http://assets/issues/issue4.jpg",
                status="pending", district="Salem"
            ),
            CropIssueModel(
                id=uuid.uuid4(), user_id=officer2.id, farmer_id=farmers[3].id, crop="Groundnut",
                assigned_expert_whatsapp="9876543210",
                symptoms="Tikka disease spots on foliage",
                image_url="http://assets/issues/issue5.jpg",
                status="resolved", district="Namakkal",
                expert_reply="Apply Trichoderma Viride along with organic manure."
            )
        ]
        session.add_all(issues)
        await session.flush()

        print("Seeding Attendance Shift Log (last 7 days, varied)...")
        now = datetime.now(timezone.utc)
        atts = []
        # 7-day rolling history so Attendance Monitoring and Reports have
        # real data to filter/export across dates, not just "today".
        for days_ago in range(6, -1, -1):
            day = date.today() - timedelta(days=days_ago)

            # officer1: reliably on time, checks out every day except today (still on shift)
            checkin1 = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc) + timedelta(hours=8, minutes=45)
            att1 = AttendanceModel(
                id=uuid.uuid4(), user_id=officer1.id, date=day,
                check_in_time=checkin1, check_in_location="POINT(78.1460 11.6643)",
                check_in_device_id="dev-device-uuid-9912", is_fake_gps=False,
            )
            if days_ago > 0:
                att1.check_out_time = checkin1 + timedelta(hours=8, minutes=30)
                att1.check_out_location = "POINT(78.1461 11.6644)"
            atts.append(att1)

            # officer2: a mix of on-time and late (>9AM) check-ins; one flagged fake-GPS day
            is_late_day = days_ago in (1, 4)
            checkin2 = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc) + (
                timedelta(hours=9, minutes=35) if is_late_day else timedelta(hours=8, minutes=55)
            )
            att2 = AttendanceModel(
                id=uuid.uuid4(), user_id=officer2.id, date=day,
                check_in_time=checkin2, check_in_location="POINT(78.1678 11.2189)",
                check_in_device_id="dev-device-uuid-9913", is_fake_gps=(days_ago == 3),
            )
            if days_ago > 0:
                att2.check_out_time = checkin2 + timedelta(hours=8)
                att2.check_out_location = "POINT(78.1670 11.2180)"
            atts.append(att2)

            # officer3: on leave 2 days ago (no attendance row at all that day),
            # otherwise on time.
            if days_ago != 2:
                checkin3 = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc) + timedelta(hours=8, minutes=50)
                att3 = AttendanceModel(
                    id=uuid.uuid4(), user_id=officer3.id, date=day,
                    check_in_time=checkin3, check_in_location="POINT(77.5833 11.2667)",
                    check_in_device_id="dev-device-uuid-9914", is_fake_gps=False,
                )
                if days_ago > 0:
                    att3.check_out_time = checkin3 + timedelta(hours=9)
                    att3.check_out_location = "POINT(77.5835 11.2670)"
                atts.append(att3)

        session.add_all(atts)
        await session.flush()

        print("Seeding Weekly Plans...")
        w_plan1 = WeeklyPlanModel(
            id=uuid.uuid4(), user_id=officer1.id, week_start_date=date.today() - timedelta(days=date.today().weekday()),
            status="approved", approved_by=manager.id, approved_at=now - timedelta(days=2),
            manager_comment="Ensure Salem farmer visits are completed this week."
        )
        w_plan2 = WeeklyPlanModel(
            id=uuid.uuid4(), user_id=officer2.id, week_start_date=date.today() - timedelta(days=date.today().weekday()),
            status="pending"
        )
        session.add_all([w_plan1, w_plan2])
        await session.flush()

        plan_act1 = WeeklyPlanActivityModel(
            id=uuid.uuid4(), weekly_plan_id=w_plan1.id, date=date.today(), territory_id=salem_t.id,
            activity_type="Farmer Visit", planned_villages=["Mallasamudram"], planned_dealers=["Subbu Agencies"],
            description="Bio-NPK demonstration visit."
        )
        plan_act2 = WeeklyPlanActivityModel(
            id=uuid.uuid4(), weekly_plan_id=w_plan1.id, date=date.today() + timedelta(days=1), territory_id=salem_t.id,
            activity_type="Dealer Visit", planned_villages=["Attur"], planned_dealers=["Kannan Agro Center"],
            description="Check low stock of Trichoderma."
        )
        session.add_all([plan_act1, plan_act2])
        await session.flush()

        print("Seeding Visits...")
        visits = [
            VisitModel(
                id=uuid.uuid4(), user_id=officer1.id, visit_type="farmer", farmer_id=farmers[0].id,
                start_time=now - timedelta(hours=3), end_time=now - timedelta(hours=2, minutes=30),
                duration_seconds=1800, location_start="POINT(78.1460 11.6643)", location_end="POINT(78.1461 11.6644)",
                crop="Paddy", purpose="Demonstrate Bio-NPK Liquid spray.", products_demonstrated=["Bio-NPK Liquid (1 Liter)"],
                task_completed=True, voice_notes_transcript_ta="பயிருக்கு பயோ-என்பிகே தெளிக்கப்பட்டது", voice_notes_transcript_en="Bio-NPK was sprayed on the crop"
            ),
            VisitModel(
                id=uuid.uuid4(), user_id=officer2.id, visit_type="dealer", dealer_id=dealers[0].id,
                start_time=now - timedelta(hours=2), end_time=now - timedelta(hours=1, minutes=15),
                duration_seconds=2700, location_start="POINT(78.1678 11.2189)", location_end="POINT(78.1678 11.2190)",
                purpose="Restock Bio-NPK and collect payment.", task_completed=True, 
                voice_notes_transcript_en="Collected check for Rs. 50,000 and confirmed next order."
            ),
            VisitModel(
                id=uuid.uuid4(), user_id=officer3.id, visit_type="farmer", farmer_id=farmers[4].id,
                start_time=now - timedelta(hours=4), end_time=now - timedelta(hours=3, minutes=45),
                duration_seconds=900, location_start="POINT(77.5833 11.2667)", location_end="POINT(77.5835 11.2670)",
                crop="Turmeric", purpose="Inspect rhizome rot.", task_completed=False, 
                voice_notes_transcript_en="Farmer unavailable. Will revisit tomorrow."
            )
        ]
        session.add_all(visits)
        await session.flush()

        print("Seeding Officer Live Locations (active / stale / never-reported)...")
        # officer1: pinged 2 minutes ago -> shows as "Active" (green) on the map.
        await session.execute(
            text("""
                INSERT INTO officer_locations (officer_id, latitude, longitude, speed, battery_level, status, updated_at)
                VALUES (:officer_id, :lat, :lng, :speed, :battery, :status, :updated_at)
            """).bindparams(
                officer_id=officer1.id, lat=11.6650, lng=78.1470, speed=18.5, battery=76,
                status="active", updated_at=now - timedelta(minutes=2),
            )
        )
        # officer2: last pinged 45 minutes ago -> shows as "Stale" (amber).
        await session.execute(
            text("""
                INSERT INTO officer_locations (officer_id, latitude, longitude, speed, battery_level, status, updated_at)
                VALUES (:officer_id, :lat, :lng, :speed, :battery, :status, :updated_at)
            """).bindparams(
                officer_id=officer2.id, lat=11.2195, lng=78.1685, speed=0.0, battery=22,
                status="active", updated_at=now - timedelta(minutes=45),
            )
        )
        # officer3: intentionally has no officer_locations row at all -> the
        # map/table must show "Never reported" rather than a fake timestamp.

        await session.commit()

    print("Vishakan Biotech database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
