from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from collections import defaultdict
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# File uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "agent"  # admin, manager, agent
    team_code: Optional[str] = None  # For managers and agents
    manager_id: Optional[str] = None  # For agents - links to their manager
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Optional[str] = "agent"
    team_code: Optional[str] = None
    manager_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    team_code: Optional[str] = None
    manager_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class LoanApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_name: str
    customer_name: str
    company_name: str
    contact_no: str
    status: str
    bank: str
    sanction: Optional[str] = ""
    disbursed: Optional[str] = ""
    remark: Optional[str] = ""
    scheme: Optional[str] = ""
    case_type: Optional[str] = ""
    from_location: Optional[str] = ""
    branch: Optional[str] = ""
    executive_name: Optional[str] = ""
    team_manager_code: Optional[str] = ""
    month: str
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    file_count: Optional[int] = 0
    comment_count: Optional[int] = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class LoanApplicationCreate(BaseModel):
    agent_name: str
    customer_name: str
    company_name: str
    contact_no: str
    status: str
    bank: str
    sanction: Optional[str] = ""
    disbursed: Optional[str] = ""
    remark: Optional[str] = ""
    scheme: Optional[str] = ""
    case_type: Optional[str] = ""
    from_location: Optional[str] = ""
    branch: Optional[str] = ""
    executive_name: Optional[str] = ""
    team_manager_code: Optional[str] = ""
    month: str
    custom_fields: Optional[Dict[str, Any]] = None

class LoanApplicationUpdate(BaseModel):
    agent_name: Optional[str] = None
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    contact_no: Optional[str] = None
    status: Optional[str] = None
    bank: Optional[str] = None
    sanction: Optional[str] = None
    disbursed: Optional[str] = None
    remark: Optional[str] = None
    scheme: Optional[str] = None
    case_type: Optional[str] = None
    from_location: Optional[str] = None
    branch: Optional[str] = None
    executive_name: Optional[str] = None
    team_manager_code: Optional[str] = None
    month: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

# Auth helpers
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

def check_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

async def get_accessible_user_ids(user: User) -> List[str]:
    """Get list of user IDs accessible to current user based on role"""
    if user.role == "admin":
        return None  # Admin sees everything
    elif user.role == "manager":
        # Manager sees their team
        team_users = await db.users.find(
            {"$or": [{"manager_id": user.id}, {"id": user.id}]},
            {"_id": 0, "id": 1}
        ).to_list(1000)
        return [u["id"] for u in team_users]
    else:
        # Agent sees only their own
        return [user.id]

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        team_code=user_data.team_code,
        manager_id=user_data.manager_id
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    access_token = create_access_token(data={"sub": user_obj.id})
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Change password route
class PasswordChange(BaseModel):
    old_password: str
    new_password: str

@api_router.post("/auth/change-password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    # Get user with password
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not verify_password(password_data.old_password, user['password']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    new_hashed = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password": new_hashed}}
    )
    
    return {"message": "Password changed successfully"}

# User management (Admin only)
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    check_admin(current_user)
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return users

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate, current_user: User = Depends(get_current_user)):
    check_admin(current_user)
    
    update_dict = {k: v for k, v in user_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    
    return User(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    check_admin(current_user)
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Loan routes with role-based access
@api_router.get("/loans", response_model=List[LoanApplication])
async def get_loans(
    status: Optional[str] = None,
    bank: Optional[str] = None,
    agent_name: Optional[str] = None,
    month: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    # Role-based filtering
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:  # Not admin
        query["created_by"] = {"$in": accessible_ids}
    
    if status:
        query["status"] = status
    if bank:
        query["bank"] = bank
    if agent_name:
        query["agent_name"] = agent_name
    if month:
        query["month"] = month
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"contact_no": {"$regex": search, "$options": "i"}}
        ]
    
    loans = await db.loan_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for loan in loans:
        if isinstance(loan.get('created_at'), str):
            loan['created_at'] = datetime.fromisoformat(loan['created_at'])
        if isinstance(loan.get('updated_at'), str):
            loan['updated_at'] = datetime.fromisoformat(loan['updated_at'])
    
    return loans

@api_router.post("/loans", response_model=LoanApplication)
async def create_loan(loan_data: LoanApplicationCreate, current_user: User = Depends(get_current_user)):
    loan = LoanApplication(**loan_data.model_dump(), created_by=current_user.id)
    
    loan_dict = loan.model_dump()
    loan_dict['created_at'] = loan_dict['created_at'].isoformat()
    loan_dict['updated_at'] = loan_dict['updated_at'].isoformat()
    
    await db.loan_applications.insert_one(loan_dict)
    return loan

async def check_loan_access(loan_id: str, user: User) -> dict:
    """Check if user has access to this loan"""
    loan = await db.loan_applications.find_one({"id": loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan application not found")
    
    if user.role == "admin":
        return loan
    
    accessible_ids = await get_accessible_user_ids(user)
    if loan["created_by"] not in accessible_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return loan

@api_router.get("/loans/{loan_id}", response_model=LoanApplication)
async def get_loan(loan_id: str, current_user: User = Depends(get_current_user)):
    loan = await check_loan_access(loan_id, current_user)
    
    if isinstance(loan.get('created_at'), str):
        loan['created_at'] = datetime.fromisoformat(loan['created_at'])
    if isinstance(loan.get('updated_at'), str):
        loan['updated_at'] = datetime.fromisoformat(loan['updated_at'])
    
    return LoanApplication(**loan)

@api_router.put("/loans/{loan_id}", response_model=LoanApplication)
async def update_loan(loan_id: str, loan_data: LoanApplicationUpdate, current_user: User = Depends(get_current_user)):
    loan = await check_loan_access(loan_id, current_user)
    
    update_dict = {k: v for k, v in loan_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.loan_applications.update_one({"id": loan_id}, {"$set": update_dict})
    
    updated_loan = await db.loan_applications.find_one({"id": loan_id}, {"_id": 0})
    if isinstance(updated_loan.get('created_at'), str):
        updated_loan['created_at'] = datetime.fromisoformat(updated_loan['created_at'])
    if isinstance(updated_loan.get('updated_at'), str):
        updated_loan['updated_at'] = datetime.fromisoformat(updated_loan['updated_at'])
    
    return LoanApplication(**updated_loan)

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, current_user: User = Depends(get_current_user)):
    await check_loan_access(loan_id, current_user)
    
    result = await db.loan_applications.delete_one({"id": loan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loan application not found")
    
    return {"message": "Loan application deleted successfully"}

# Analytics routes with role-based filtering
@api_router.get("/analytics/overview")
async def get_overview(current_user: User = Depends(get_current_user)):
    query = {}
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:
        query["created_by"] = {"$in": accessible_ids}
    
    loans = await db.loan_applications.find(query, {"_id": 0}).to_list(10000)
    
    total = len(loans)
    status_counts = defaultdict(int)
    disbursed_count = 0
    declined_count = 0
    pending_count = 0
    
    for loan in loans:
        status = loan.get('status', '')
        status_counts[status] += 1
        
        if status == 'Disbursed':
            disbursed_count += 1
        elif status == 'Decline':
            declined_count += 1
        elif status in ['Hold', 'Login Done', 'Sent For Login', 'Pd To Be Done']:
            pending_count += 1
    
    return {
        "total": total,
        "disbursed": disbursed_count,
        "declined": declined_count,
        "pending": pending_count,
        "status_breakdown": dict(status_counts)
    }

@api_router.get("/analytics/by-bank")
async def get_by_bank(current_user: User = Depends(get_current_user)):
    query = {}
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:
        query["created_by"] = {"$in": accessible_ids}
    
    loans = await db.loan_applications.find(query, {"_id": 0}).to_list(10000)
    
    bank_stats = defaultdict(lambda: {"total": 0, "disbursed": 0, "declined": 0})
    
    for loan in loans:
        bank = loan.get('bank', 'Unknown')
        status = loan.get('status', '')
        
        bank_stats[bank]["total"] += 1
        if status == 'Disbursed':
            bank_stats[bank]["disbursed"] += 1
        elif status == 'Decline':
            bank_stats[bank]["declined"] += 1
    
    return dict(bank_stats)

@api_router.get("/analytics/by-agent")
async def get_by_agent(current_user: User = Depends(get_current_user)):
    query = {}
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:
        query["created_by"] = {"$in": accessible_ids}
    
    loans = await db.loan_applications.find(query, {"_id": 0}).to_list(10000)
    
    agent_stats = defaultdict(lambda: {"total": 0, "disbursed": 0, "declined": 0, "pending": 0})
    
    for loan in loans:
        agent = loan.get('agent_name', 'Unknown')
        status = loan.get('status', '')
        
        agent_stats[agent]["total"] += 1
        if status == 'Disbursed':
            agent_stats[agent]["disbursed"] += 1
        elif status == 'Decline':
            agent_stats[agent]["declined"] += 1
        elif status in ['Hold', 'Login Done', 'Sent For Login', 'Pd To Be Done']:
            agent_stats[agent]["pending"] += 1
    
    return dict(agent_stats)

@api_router.get("/analytics/by-month")
async def get_by_month(current_user: User = Depends(get_current_user)):
    query = {}
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:
        query["created_by"] = {"$in": accessible_ids}
    
    loans = await db.loan_applications.find(query, {"_id": 0}).to_list(10000)
    
    month_stats = defaultdict(lambda: {"total": 0, "disbursed": 0, "declined": 0})
    
    for loan in loans:
        month = loan.get('month', 'Unknown')
        status = loan.get('status', '')
        
        month_stats[month]["total"] += 1
        if status == 'Disbursed':
            month_stats[month]["disbursed"] += 1
        elif status == 'Decline':
            month_stats[month]["declined"] += 1
    
    return dict(month_stats)

@api_router.get("/analytics/unique-values")
async def get_unique_values(current_user: User = Depends(get_current_user)):
    query = {}
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:
        query["created_by"] = {"$in": accessible_ids}
    
    loans = await db.loan_applications.find(query, {"_id": 0}).to_list(10000)
    
    banks = set()
    statuses = set()
    agents = set()
    months = set()
    schemes = set()
    
    for loan in loans:
        if loan.get('bank'):
            banks.add(loan['bank'])
        if loan.get('status'):
            statuses.add(loan['status'])
        if loan.get('agent_name'):
            agents.add(loan['agent_name'])
        if loan.get('month'):
            months.add(loan['month'])
        if loan.get('scheme'):
            schemes.add(loan['scheme'])
    
    return {
        "banks": sorted(list(banks)),
        "statuses": sorted(list(statuses)),
        "agents": sorted(list(agents)),
        "months": sorted(list(months)),
        "schemes": sorted(list(schemes))
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()