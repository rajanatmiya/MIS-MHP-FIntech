from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
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
import pandas as pd
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    team_code: Optional[str] = None
    manager_id: Optional[str] = None
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

class CustomFieldConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Internal field name (e.g., "mobile_number")
    label: str  # Display label (e.g., "Mobile Number")
    field_type: str  # text, number, date, dropdown
    required: bool = False
    options: Optional[List[str]] = None  # For dropdown fields
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomFieldConfigCreate(BaseModel):
    name: str
    label: str
    field_type: str
    required: bool = False
    options: Optional[List[str]] = None
    order: Optional[int] = 0

class CustomFieldConfigUpdate(BaseModel):
    label: Optional[str] = None
    field_type: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[str]] = None
    order: Optional[int] = None

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
    case_from: Optional[str] = ""
    location: Optional[str] = ""
    branch: Optional[str] = ""
    executive_name: Optional[str] = ""
    team_manager: Optional[str] = ""
    code: Optional[str] = ""
    rate: Optional[str] = ""
    pf: Optional[str] = ""
    insurance: Optional[str] = ""
    tenure: Optional[str] = ""
    subvention: Optional[str] = ""
    brokerage_subvention: Optional[str] = ""
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
    if user.role == "admin":
        return None
    elif user.role == "manager":
        team_users = await db.users.find(
            {"$or": [{"manager_id": user.id}, {"id": user.id}]},
            {"_id": 0, "id": 1}
        ).to_list(1000)
        return [u["id"] for u in team_users]
    else:
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
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(password_data.old_password, user['password']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
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

# Admin password reset
class PasswordResetRequest(BaseModel):
    new_password: str

@api_router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str, 
    password_data: PasswordResetRequest, 
    current_user: User = Depends(get_current_user)
):
    """Admin can reset any user's password"""
    check_admin(current_user)
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash and update password
    new_hashed = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": new_hashed}}
    )
    
    return {"message": f"Password reset successfully for {user.get('email', 'user')}"}

# Custom Field Configuration routes (Admin only)
@api_router.get("/field-configs", response_model=List[CustomFieldConfig])
async def get_field_configs(current_user: User = Depends(get_current_user)):
    """Get all custom field configurations"""
    fields = await db.field_configs.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    for field in fields:
        if isinstance(field.get('created_at'), str):
            field['created_at'] = datetime.fromisoformat(field['created_at'])
    
    return fields

@api_router.post("/field-configs", response_model=CustomFieldConfig)
async def create_field_config(field_data: CustomFieldConfigCreate, current_user: User = Depends(get_current_user)):
    """Create a new custom field configuration (Admin only)"""
    check_admin(current_user)
    
    # Check if field name already exists
    existing = await db.field_configs.find_one({"name": field_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Field name already exists")
    
    field = CustomFieldConfig(**field_data.model_dump())
    
    field_dict = field.model_dump()
    field_dict['created_at'] = field_dict['created_at'].isoformat()
    
    await db.field_configs.insert_one(field_dict)
    return field

@api_router.put("/field-configs/{field_id}", response_model=CustomFieldConfig)
async def update_field_config(field_id: str, field_data: CustomFieldConfigUpdate, current_user: User = Depends(get_current_user)):
    """Update a custom field configuration (Admin only)"""
    check_admin(current_user)
    
    update_dict = {k: v for k, v in field_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.field_configs.update_one({"id": field_id}, {"$set": update_dict})
    
    updated_field = await db.field_configs.find_one({"id": field_id}, {"_id": 0})
    if not updated_field:
        raise HTTPException(status_code=404, detail="Field configuration not found")
    
    if isinstance(updated_field.get('created_at'), str):
        updated_field['created_at'] = datetime.fromisoformat(updated_field['created_at'])
    
    return CustomFieldConfig(**updated_field)

@api_router.delete("/field-configs/{field_id}")
async def delete_field_config(field_id: str, current_user: User = Depends(get_current_user)):
    """Delete a custom field configuration (Admin only)"""
    check_admin(current_user)
    
    result = await db.field_configs.delete_one({"id": field_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Field configuration not found")
    
    return {"message": "Field configuration deleted successfully"}

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
    
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:
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
    
    loans = await db.loan_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100000)
    
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
    # Only admins can delete loans
    check_admin(current_user)
    
    result = await db.loan_applications.delete_one({"id": loan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loan application not found")
    
    return {"message": "Loan application deleted successfully"}

@api_router.post("/loans/delete-by-date")
async def delete_loans_by_date(date_str: str, current_user: User = Depends(get_current_user)):
    """Delete all loans from a specific date - Admin only"""
    check_admin(current_user)
    
    try:
        # Parse the date string (e.g., "16-10-2025" or "2025-10-16")
        from datetime import datetime
        
        # Try different date formats
        date_formats = ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]
        target_date = None
        
        for fmt in date_formats:
            try:
                target_date = datetime.strptime(date_str, fmt).date()
                break
            except:
                continue
        
        if not target_date:
            raise HTTPException(status_code=400, detail="Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD")
        
        # Find all loans created on this date
        start_datetime = datetime.combine(target_date, datetime.min.time())
        end_datetime = datetime.combine(target_date, datetime.max.time())
        
        # Delete loans where created_at is on the target date
        result = await db.loan_applications.delete_many({
            "created_at": {
                "$gte": start_datetime.isoformat(),
                "$lte": end_datetime.isoformat()
            }
        })
        
        return {
            "message": f"Deleted {result.deleted_count} entries from {date_str}",
            "deleted_count": result.deleted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete by date error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete entries: {str(e)}")

@api_router.post("/loans/delete-all")
async def delete_all_loans(confirm: str, current_user: User = Depends(get_current_user)):
    """Delete ALL loan entries - Admin only - DANGER"""
    check_admin(current_user)
    
    if confirm != "DELETE_ALL_DATA":
        raise HTTPException(status_code=400, detail="Confirmation text does not match")
    
    try:
        result = await db.loan_applications.delete_many({})
        
        return {
            "message": f"ALL MIS DATA DELETED! Removed {result.deleted_count} entries",
            "deleted_count": result.deleted_count
        }
        
    except Exception as e:
        logger.error(f"Delete all error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete all entries: {str(e)}")

# Analytics routes
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

@api_router.get("/analytics/monthly-trends")
async def get_monthly_trends(current_user: User = Depends(get_current_user)):
    query = {}
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:
        query["created_by"] = {"$in": accessible_ids}
    
    loans = await db.loan_applications.find(query, {"_id": 0}).to_list(10000)
    
    monthly_data = defaultdict(lambda: {
        "total": 0,
        "disbursed": 0,
        "declined": 0,
        "pending": 0,
        "login_done": 0,
        "month": ""
    })
    
    for loan in loans:
        month = loan.get('month', 'Unknown')
        status = loan.get('status', '')
        
        monthly_data[month]["month"] = month
        monthly_data[month]["total"] += 1
        
        if status == 'Disbursed':
            monthly_data[month]["disbursed"] += 1
        elif status == 'Decline':
            monthly_data[month]["declined"] += 1
        elif status == 'Login Done':
            monthly_data[month]["login_done"] += 1
        elif status in ['Hold', 'Sent For Login', 'Pd To Be Done']:
            monthly_data[month]["pending"] += 1
    
    sorted_data = sorted(monthly_data.values(), key=lambda x: x["month"])
    return sorted_data

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

# Excel Export
@api_router.get("/export/loans")
async def export_loans(
    month: Optional[str] = None,
    status: Optional[str] = None,
    bank: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    accessible_ids = await get_accessible_user_ids(current_user)
    if accessible_ids is not None:
        query["created_by"] = {"$in": accessible_ids}
    
    if month:
        query["month"] = month
    if status:
        query["status"] = status
    if bank:
        query["bank"] = bank
    
    loans = await db.loan_applications.find(query, {"_id": 0}).to_list(10000)
    
    df = pd.DataFrame(loans)
    if not df.empty:
        columns_order = [
            'month', 'agent_name', 'customer_name', 'company_name', 'contact_no',
            'status', 'bank', 'sanction', 'disbursed', 'scheme', 'case_type',
            'from_location', 'branch', 'executive_name', 'team_manager_code', 'remark'
        ]
        existing_cols = [col for col in columns_order if col in df.columns]
        df = df[existing_cols]
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Loans')
    
    output.seek(0)
    
    filename = f"loans_export_{month if month else 'all'}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/backup/full-data")
async def backup_all_data(current_user: User = Depends(get_current_user)):
    """Export all data - Admin only"""
    check_admin(current_user)
    
    # Get all loans
    loans = await db.loan_applications.find({}, {"_id": 0}).to_list(10000)
    
    # Get all users (without passwords)
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    # Get all field configs
    field_configs = await db.field_configs.find({}, {"_id": 0}).to_list(100)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Loans sheet
        if loans:
            df_loans = pd.DataFrame(loans)
            df_loans.to_excel(writer, index=False, sheet_name='Loans')
        
        # Users sheet
        if users:
            df_users = pd.DataFrame(users)
            df_users.to_excel(writer, index=False, sheet_name='Users')
        
        # Field Configs sheet
        if field_configs:
            df_fields = pd.DataFrame(field_configs)
            df_fields.to_excel(writer, index=False, sheet_name='Field_Configurations')
    
    output.seek(0)
    
    filename = f"mhp_fintech_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/import/loans-excel")
async def import_loans_from_excel(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Import loans from Excel file"""
    check_admin(current_user)
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported")
    
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # Column mapping (case-insensitive)
        column_mapping = {
            'name': 'name',
            'date': 'date',
            'entry date': 'date',
            'created date': 'date',
            'customer name': 'customer_name',
            'customername': 'customer_name',
            'customer': 'customer_name',
            'company name': 'company_name',
            'companyname': 'company_name',
            'company': 'company_name',
            'contact': 'contact_no',
            'contact no': 'contact_no',
            'contact number': 'contact_no',
            'mobile': 'contact_no',
            'phone': 'contact_no',
            'status': 'status',
            'bank': 'bank',
            'bank sanctioned': 'sanction',
            'sanction': 'sanction',
            'sanction amount': 'sanction',
            'disbursed': 'disbursed',
            'disbursed amount': 'disbursed',
            'remark': 'remark',
            'remarks': 'remark',
            'scheme': 'scheme',
            'case from': 'case_from',
            'location': 'location',
            'city': 'location',
            'branch': 'branch',
            'executive name': 'agent_name',
            'executive': 'agent_name',
            'agent name': 'agent_name',
            'agent': 'agent_name',
            'team manager': 'team_manager',
            'manager': 'team_manager',
            'code': 'code',
            'rate': 'rate',
            'roi': 'rate',
            'interest rate': 'rate',
            'pf': 'pf',
            'insurance': 'insurance',
            'tenure': 'tenure',
            'tenure (months)': 'tenure',
            'subvention': 'subvention',
            'brokerage': 'brokerage',
            'subvention 0': 'subvention_0',
            'month': 'month'
        }
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower()
        
        # Rename columns
        for old_col, new_col in column_mapping.items():
            if old_col in df.columns:
                df.rename(columns={old_col: new_col}, inplace=True)
        
        # Required fields (removed month as it can be auto-generated)
        required_fields = ['customer_name', 'status']
        missing_fields = [field for field in required_fields if field not in df.columns]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_fields)}"
            )
        
        # Auto-generate month if not present (use current month)
        current_month = datetime.now().strftime("%b'%y")  # e.g., "Jan'25"
        
        # Import loans
        imported_count = 0
        skipped_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Skip empty rows
                if pd.isna(row.get('customer_name')) or not str(row.get('customer_name')).strip():
                    skipped_count += 1
                    continue
                
                # Handle date from Excel or use current date
                import_date = None
                if pd.notna(row.get('date')):
                    try:
                        # Try to parse date from Excel
                        import_date = pd.to_datetime(row.get('date'))
                        if pd.notna(import_date):
                            import_date = import_date.isoformat()
                    except:
                        import_date = None
                
                if not import_date:
                    import_date = datetime.now(timezone.utc).isoformat()
                
                # Prepare loan data
                loan_data = {
                    "id": str(uuid.uuid4()),
                    "name": str(row.get('name', '')).strip() if pd.notna(row.get('name')) else '',
                    "customer_name": str(row.get('customer_name', '')).strip(),
                    "company_name": str(row.get('company_name', '')).strip() if pd.notna(row.get('company_name')) else '',
                    "contact_no": str(row.get('contact_no', '')).strip() if pd.notna(row.get('contact_no')) else '',
                    "status": str(row.get('status', 'Pending')).strip(),
                    "sanction": str(row.get('sanction', '')).strip() if pd.notna(row.get('sanction')) else '',
                    "disbursed": str(row.get('disbursed', '')).strip() if pd.notna(row.get('disbursed')) else '',
                    "remark": str(row.get('remark', '')).strip() if pd.notna(row.get('remark')) else '',
                    "scheme": str(row.get('scheme', '')).strip() if pd.notna(row.get('scheme')) else '',
                    "case_from": str(row.get('case_from', '')).strip() if pd.notna(row.get('case_from')) else '',
                    "location": str(row.get('location', '')).strip() if pd.notna(row.get('location')) else '',
                    "branch": str(row.get('branch', '')).strip() if pd.notna(row.get('branch')) else '',
                    "agent_name": str(row.get('agent_name', current_user.name)).strip(),
                    "team_manager": str(row.get('team_manager', '')).strip() if pd.notna(row.get('team_manager')) else '',
                    "code": str(row.get('code', '')).strip() if pd.notna(row.get('code')) else '',
                    "rate": str(row.get('rate', '')).strip() if pd.notna(row.get('rate')) else '',
                    "pf": str(row.get('pf', '')).strip() if pd.notna(row.get('pf')) else '',
                    "insurance": str(row.get('insurance', '')).strip() if pd.notna(row.get('insurance')) else '',
                    "tenure": str(row.get('tenure', '')).strip() if pd.notna(row.get('tenure')) else '',
                    "subvention": str(row.get('subvention', '')).strip() if pd.notna(row.get('subvention')) else '',
                    "brokerage": str(row.get('brokerage', '')).strip() if pd.notna(row.get('brokerage')) else '',
                    "subvention_0": str(row.get('subvention_0', '')).strip() if pd.notna(row.get('subvention_0')) else '',
                    "month": str(row.get('month', current_month)).strip() if pd.notna(row.get('month')) else current_month,
                    "bank": str(row.get('bank', '')).strip() if pd.notna(row.get('bank')) else '',
                    "created_by": current_user.id,
                    "created_at": import_date,  # Use date from Excel
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Insert into database
                await db.loan_applications.insert_one(loan_data)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
                skipped_count += 1
        
        return {
            "message": "Import completed",
            "imported": imported_count,
            "skipped": skipped_count,
            "total_rows": len(df),
            "errors": errors[:10] if errors else []  # Return first 10 errors
        }
        
    except Exception as e:
        logger.error(f"Import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# AI-powered features
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

class AISearchRequest(BaseModel):
    query: str

class AIAnalysisRequest(BaseModel):
    month: Optional[str] = None
    question: str

@api_router.post("/ai/search")
async def ai_natural_language_search(request: AISearchRequest, current_user: User = Depends(get_current_user)):
    """Convert natural language query to filters"""
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"ai-search-{current_user.id}",
            system_message="""You are an AI assistant that converts natural language queries into structured filters for a loan MIS system.

Available filter fields:
- status: string (e.g., "Pending", "Approved", "Disbursed", "Declined", "Hold")
- bank: string (e.g., "HDFC", "ICICI", "SBI", "Axis")
- month: string (e.g., "Jan'25", "Feb'25")
- location: string (city or state)
- agent_name: string (executive name)
- customer_name: string
- product_type: string (e.g., "Personal Loan", "Business Loan")

Return ONLY a valid JSON object with the filters. Example:
{"status": "Disbursed", "bank": "HDFC", "month": "Jan'25"}

If no specific filters can be extracted, return an empty object: {}"""
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=f"Query: {request.query}")
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            filters = json.loads(response)
        except:
            filters = {}
        
        return {"filters": filters, "query": request.query}
    except Exception as e:
        logger.error(f"AI search error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI search failed")

@api_router.post("/ai/suggestions")
async def ai_smart_suggestions(field: str, partial_value: str, current_user: User = Depends(get_current_user)):
    """Get AI-powered suggestions for field values"""
    try:
        # Get existing values from database
        loans = await db.loan_applications.find({}, {"_id": 0, field: 1}).to_list(100000)
        existing_values = list(set([loan.get(field, "") for loan in loans if loan.get(field)]))
        
        # Filter matching values
        suggestions = [val for val in existing_values if partial_value.lower() in val.lower()][:5]
        
        return {"suggestions": suggestions}
    except Exception as e:
        logger.error(f"Suggestions error: {str(e)}")
        return {"suggestions": []}

@api_router.post("/ai/analyze")
async def ai_data_analysis(request: AIAnalysisRequest, current_user: User = Depends(get_current_user)):
    """AI-powered data analysis and insights"""
    try:
        # Fetch data
        query = {}
        accessible_ids = await get_accessible_user_ids(current_user)
        if accessible_ids is not None:
            query["created_by"] = {"$in": accessible_ids}
        
        if request.month:
            query["month"] = request.month
        
        loans = await db.loan_applications.find(query, {"_id": 0}).to_list(10000)
        
        # Prepare data summary for AI
        total_loans = len(loans)
        status_counts = {}
        bank_counts = {}
        total_sanction = 0
        total_disbursed = 0
        
        for loan in loans:
            status = loan.get('status', 'Unknown')
            bank = loan.get('bank', 'Unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
            bank_counts[bank] = bank_counts.get(bank, 0) + 1
            
            try:
                if loan.get('sanction'):
                    total_sanction += float(str(loan.get('sanction', 0)).replace(',', ''))
            except:
                pass
            try:
                if loan.get('disbursed'):
                    total_disbursed += float(str(loan.get('disbursed', 0)).replace(',', ''))
            except:
                pass
        
        data_summary = {
            "total_loans": total_loans,
            "status_breakdown": status_counts,
            "bank_breakdown": bank_counts,
            "total_sanction_amount": total_sanction,
            "total_disbursed_amount": total_disbursed,
            "month": request.month or "All months"
        }
        
        # Ask AI to analyze
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"ai-analysis-{current_user.id}",
            system_message="""You are a financial data analyst AI. Analyze loan data and provide clear, actionable insights.
Be concise and highlight key trends, patterns, and recommendations."""
        ).with_model("openai", "gpt-4o-mini")
        
        prompt = f"""Analyze this loan data and answer: {request.question}

Data Summary:
{json.dumps(data_summary, indent=2)}

Provide a clear, concise analysis with specific numbers and actionable insights."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "analysis": response,
            "data_summary": data_summary
        }
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI analysis failed")

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

@app.on_event("startup")
async def create_default_admin():
    """Create default admin user if it doesn't exist"""
    try:
        admin_email = "admin@mhpfintech.com"
        admin_password = "Admin@123"
        
        # Check if admin exists
        existing_admin = await db.users.find_one({"email": admin_email})
        
        if not existing_admin:
            # Create admin user
            admin_user = {
                "id": str(uuid.uuid4()),
                "email": admin_email,
                "name": "Admin User",
                "role": "admin",
                "team_code": None,
                "manager_id": None,
                "password": hash_password(admin_password),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.users.insert_one(admin_user)
            logger.info(f"✅ Created default admin user: {admin_email}")
        else:
            # Ensure existing admin has admin role
            if existing_admin.get('role') != 'admin':
                await db.users.update_one(
                    {"email": admin_email},
                    {"$set": {"role": "admin"}}
                )
                logger.info(f"✅ Updated role to 'admin' for {admin_email}")
            else:
                logger.info(f"✅ Admin user already exists: {admin_email}")
    except Exception as e:
        logger.error(f"❌ Error creating admin user: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()