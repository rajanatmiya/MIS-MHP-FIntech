import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import dotenv_values
env = dotenv_values("/app/backend/.env")
async def main():
    db = AsyncIOMotorClient(os.environ.get("MONGO_URL") or env.get("MONGO_URL"))[os.environ.get("DB_NAME") or env.get("DB_NAME")]
    r = await db.master_companies.delete_many({"name": "TEST_Co"})
    print("deleted TEST_Co companies:", r.deleted_count)
    for coll in ["master_customers","master_banks","master_companies","master_executives","master_managers","master_agents"]:
        left = await db[coll].find({"name": {"$regex": "TEST_WS_|_RENAMED", "$options": "i"}}, {"_id":0,"name":1}).to_list(None)
        if left:
            print("still left", coll, left)
asyncio.run(main())
