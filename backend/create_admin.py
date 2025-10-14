#!/usr/bin/env python3
"""
Script to create initial admin user in production database
Run this after deployment to create admin account
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user():
    # Get MongoDB connection from environment
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    print(f"Connecting to MongoDB: {mongo_url}")
    print(f"Database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Admin user details
    admin_email = "admin@mhpfintech.com"
    admin_password = "Admin@123"
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if existing_admin:
        print(f"✅ Admin user already exists: {admin_email}")
        # Update role to ensure it's admin
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"role": "admin"}}
        )
        print(f"✅ Updated role to 'admin' for {admin_email}")
    else:
        # Create new admin user
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin User",
            "role": "admin",
            "team_code": None,
            "manager_id": None,
            "password": pwd_context.hash(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(admin_user)
        print(f"✅ Created admin user: {admin_email}")
    
    print("\n" + "="*50)
    print("ADMIN LOGIN CREDENTIALS:")
    print("="*50)
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")
    print("="*50)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin_user())
