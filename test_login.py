from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_login():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    # Get admin user
    admin = await db.users.find_one({"email": "admin@mhpfintech.com"})
    
    if not admin:
        print("❌ Admin user not found")
        return
    
    print(f"✅ Admin user found: {admin['email']}")
    print(f"Role: {admin['role']}")
    print(f"Password hash: {admin['password']}")
    
    # Test password verification
    test_password = "Admin@123"
    is_valid = pwd_context.verify(test_password, admin['password'])
    
    print(f"\nTesting password 'Admin@123': {is_valid}")
    
    # Create a new hash to compare
    new_hash = pwd_context.hash(test_password)
    print(f"\nNew hash for same password: {new_hash}")
    print(f"New hash verification: {pwd_context.verify(test_password, new_hash)}")

asyncio.run(test_login())
