from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query, Request
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Any
import logging
import uuid
import random
import jwt
import requests
from datetime import datetime, timezone, timedelta

# ---------------- Config ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
APP_NAME = os.environ.get('APP_NAME', 'propconsult')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("propconsult")

app = FastAPI()
api = APIRouter(prefix="/api")

# ---------------- Storage ----------------
_storage_key = None

def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp", "heic": "image/heic"}

# ---------------- Helpers ----------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return str(uuid.uuid4())

def clean(doc: dict):
    if doc and "_id" in doc:
        doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc

def create_token(user_id: str):
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return clean(user)

async def notify(user_id: str, ntype: str, title: str, body: str, meta: dict = None):
    doc = {"id": new_id(), "user_id": user_id, "type": ntype, "title": title, "body": body,
           "meta": meta or {}, "read": False, "created_at": now_iso()}
    await db.notifications.insert_one(doc)
    return clean(doc)

# ---------------- Models ----------------
class SendOtp(BaseModel):
    phone: str

class VerifyOtp(BaseModel):
    phone: str
    code: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    profile_photo_path: Optional[str] = None
    onboarded: Optional[bool] = None

class PhotoModel(BaseModel):
    id: str
    storage_path: str
    is_primary: bool = False
    order: int = 0
    content_type: str = "image/jpeg"

class PropertyIn(BaseModel):
    category: str
    subcategory: str
    location: str
    custom_location: Optional[str] = None
    transaction_types: List[str] = []
    title: Optional[str] = None
    description: Optional[str] = None
    price: float = 0
    rental_income: float = 0
    commission: float = 0
    amenities: List[str] = []
    status: str = "Available"
    photos: List[PhotoModel] = []
    bedrooms: Optional[str] = None
    area: Optional[str] = None

class CustomerIn(BaseModel):
    name: str
    phone: str
    customer_type: str
    req_category: Optional[str] = None
    req_subcategory: Optional[str] = None
    req_location: Optional[str] = None
    req_transaction_types: List[str] = []
    budget_min: float = 0
    budget_max: float = 0
    notes: Optional[str] = None
    property_ids: List[str] = []

class LinkProps(BaseModel):
    property_ids: List[str] = []
    notes: Optional[str] = None

class FollowupIn(BaseModel):
    customer_id: Optional[str] = None
    property_id: Optional[str] = None
    deal_id: Optional[str] = None
    date: str
    time: Optional[str] = None
    followup_type: str = "Call"
    status: str = "Open"
    notes: Optional[str] = None
    reminder: bool = True

class DealIn(BaseModel):
    customer_id: Optional[str] = None
    property_id: Optional[str] = None
    title: Optional[str] = None
    value: float = 0
    commission: float = 0
    stage: str = "New"
    notes: Optional[str] = None
    lost_reason: Optional[str] = None

class ShareIn(BaseModel):
    phone: str
    commission: float = 0
    note: Optional[str] = None

ACTIVE_STAGES = ["New", "Contacted", "Interested", "Site Visit", "Negotiation", "Token / Advance"]

# ---------------- Auth ----------------
@api.post("/auth/send-otp")
async def send_otp(data: SendOtp):
    phone = data.phone.strip()
    if len(phone) < 7:
        raise HTTPException(status_code=400, detail="Enter a valid phone number")
    code = f"{random.randint(100000, 999999)}"
    await db.otps.update_one({"phone": phone}, {"$set": {"phone": phone, "code": code, "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(), "created_at": now_iso()}}, upsert=True)
    logger.info(f"OTP for {phone}: {code}")
    return {"success": True, "message": "OTP sent", "demo_otp": code}

@api.post("/auth/verify-otp")
async def verify_otp(data: VerifyOtp):
    phone = data.phone.strip()
    rec = await db.otps.find_one({"phone": phone})
    if not rec or rec.get("code") != data.code.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new code")
    await db.otps.delete_one({"phone": phone})
    user = await db.users.find_one({"phone": phone})
    is_new = False
    if not user:
        is_new = True
        count = await db.users.count_documents({})
        user = {"id": new_id(), "phone": phone, "name": "", "email": "", "profile_photo_path": None,
                "consultant_id": f"PC{1000 + count}", "onboarded": False, "created_at": now_iso()}
        await db.users.insert_one(user)
    token = create_token(user["id"])
    return {"token": token, "is_new_user": is_new, "user": clean(user)}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

@api.post("/auth/logout")
async def logout(user=Depends(get_current_user)):
    return {"success": True}

@api.put("/auth/profile")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]})
    return clean(fresh)

# ---------------- Property helpers ----------------
async def enrich_property(p: dict, user_id: str):
    p = clean(p)
    p["customer_count"] = await db.customer_property.count_documents({"property_id": p["id"], "deleted": {"$ne": True}})
    shares = await db.property_shares.find({"property_id": p["id"]}, {"_id": 0}).to_list(100)
    p["is_shared"] = len(shares) > 0
    p["share_count"] = len(shares)
    p["is_owner"] = p.get("owner_id") == user_id
    return p

# ---------------- Properties ----------------
@api.get("/properties")
async def list_properties(user=Depends(get_current_user), category: Optional[str] = None, transaction_type: Optional[str] = None,
                          location: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None,
                          skip: int = 0, limit: int = 50):
    q = {"owner_id": user["id"], "is_deleted": {"$ne": True}}
    if category:
        q["category"] = category
    if location:
        q["location"] = location
    if status:
        q["status"] = status
    if transaction_type:
        q["transaction_types"] = transaction_type
    if search:
        q["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"location": {"$regex": search, "$options": "i"}}, {"subcategory": {"$regex": search, "$options": "i"}}]
    total = await db.properties.count_documents(q)
    docs = await db.properties.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    items = [await enrich_property(d, user["id"]) for d in docs]
    return {"items": items, "total": total}

@api.post("/properties")
async def create_property(data: PropertyIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc.update({"id": new_id(), "owner_id": user["id"], "is_deleted": False, "created_at": now_iso(), "updated_at": now_iso()})
    if not doc.get("title"):
        doc["title"] = f"{doc['subcategory']} in {doc.get('custom_location') or doc['location']}"
    await db.properties.insert_one(doc)
    await notify(user["id"], "property_added", "Property added", f"{doc['title']} was added to your portfolio", {"property_id": doc["id"]})
    return await enrich_property(doc, user["id"])

@api.get("/properties/{pid}")
async def get_property(pid: str, user=Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid, "is_deleted": {"$ne": True}})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    # owner or shared recipient
    is_shared_to = await db.property_shares.find_one({"property_id": pid, "recipient_user_id": user["id"]})
    if p["owner_id"] != user["id"] and not is_shared_to:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await enrich_property(p, user["id"])
    # linked customers
    links = await db.customer_property.find({"property_id": pid, "deleted": {"$ne": True}}, {"_id": 0}).to_list(200)
    custs = []
    for l in links:
        c = await db.customers.find_one({"id": l["customer_id"], "is_deleted": {"$ne": True}}, {"_id": 0})
        if c:
            custs.append({"id": c["id"], "name": c["name"], "phone": c["phone"], "customer_type": c["customer_type"]})
    result["customers"] = custs
    result["followups"] = await db.followups.find({"property_id": pid}, {"_id": 0}).sort("date", 1).to_list(100)
    result["deals"] = await db.deals.find({"property_id": pid}, {"_id": 0}).to_list(100)
    result["shares"] = await get_share_details(pid)
    return result

@api.put("/properties/{pid}")
async def update_property(pid: str, data: PropertyIn, user=Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    if p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    upd = data.model_dump()
    upd["updated_at"] = now_iso()
    await db.properties.update_one({"id": pid}, {"$set": upd})
    fresh = await db.properties.find_one({"id": pid})
    return await enrich_property(fresh, user["id"])

@api.delete("/properties/{pid}")
async def delete_property(pid: str, user=Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p or p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.properties.update_one({"id": pid}, {"$set": {"is_deleted": True, "deleted_at": now_iso(), "deleted_by": user["id"]}})
    return {"success": True}

@api.post("/properties/{pid}/restore")
async def restore_property(pid: str, user=Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p or p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.properties.update_one({"id": pid}, {"$set": {"is_deleted": False}, "$unset": {"deleted_at": "", "deleted_by": ""}})
    return {"success": True}

@api.post("/properties/{pid}/photos")
async def upload_photos(pid: str, files: List[UploadFile] = File(...), user=Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p or p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    photos = p.get("photos", [])
    start_order = len(photos)
    for i, f in enumerate(files):
        ext = (f.filename.split(".")[-1] if "." in f.filename else "jpg").lower()
        ct = f.content_type or MIME.get(ext, "image/jpeg")
        if not ct.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        data = await f.read()
        if len(data) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large (max 15MB)")
        path = f"{APP_NAME}/properties/{user['id']}/{new_id()}.{ext}"
        result = put_object(path, data, ct)
        photos.append({"id": new_id(), "storage_path": result["path"], "is_primary": len(photos) == 0, "order": start_order + i, "content_type": ct})
    await db.properties.update_one({"id": pid}, {"$set": {"photos": photos, "updated_at": now_iso()}})
    return {"photos": photos}

@api.delete("/properties/{pid}/photos/{photo_id}")
async def delete_photo(pid: str, photo_id: str, user=Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p or p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    photos = [ph for ph in p.get("photos", []) if ph["id"] != photo_id]
    if photos and not any(ph["is_primary"] for ph in photos):
        photos[0]["is_primary"] = True
    await db.properties.update_one({"id": pid}, {"$set": {"photos": photos}})
    return {"photos": photos}

# Standalone upload for wizard (before property exists)
@api.post("/upload")
async def upload_tmp(files: List[UploadFile] = File(...), user=Depends(get_current_user)):
    out = []
    for f in files:
        ext = (f.filename.split(".")[-1] if "." in f.filename else "jpg").lower()
        ct = f.content_type or MIME.get(ext, "image/jpeg")
        if not ct.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        data = await f.read()
        if len(data) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large (max 15MB)")
        path = f"{APP_NAME}/properties/{user['id']}/{new_id()}.{ext}"
        result = put_object(path, data, ct)
        out.append({"id": new_id(), "storage_path": result["path"], "content_type": ct})
    return {"files": out}

@api.get("/files/{path:path}")
async def serve_file(path: str, auth: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    token = auth or (authorization[7:] if authorization and authorization.startswith("Bearer ") else None)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    data, ct = get_object(path)
    return Response(content=data, media_type=ct)

# ---------------- Customers ----------------
async def enrich_customer(c: dict):
    c = clean(c)
    links = await db.customer_property.find({"customer_id": c["id"], "deleted": {"$ne": True}}, {"_id": 0}).to_list(200)
    c["property_count"] = len(links)
    return c

@api.get("/customers")
async def list_customers(user=Depends(get_current_user), customer_type: Optional[str] = None, search: Optional[str] = None, skip: int = 0, limit: int = 50):
    q = {"owner_id": user["id"], "is_deleted": {"$ne": True}}
    if customer_type:
        q["customer_type"] = customer_type
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"phone": {"$regex": search, "$options": "i"}}]
    total = await db.customers.count_documents(q)
    docs = await db.customers.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    items = [await enrich_customer(d) for d in docs]
    return {"items": items, "total": total}

@api.post("/customers")
async def create_customer(data: CustomerIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    prop_ids = doc.pop("property_ids", [])
    doc.update({"id": new_id(), "owner_id": user["id"], "is_deleted": False, "created_at": now_iso(), "updated_at": now_iso()})
    await db.customers.insert_one(doc)
    for pid in prop_ids:
        await link_customer_property(doc["id"], pid, user["id"])
    await notify(user["id"], "customer_added", "Customer added", f"{doc['name']} was added", {"customer_id": doc["id"]})
    return await enrich_customer(doc)

async def link_customer_property(customer_id, property_id, owner_id, notes=None):
    exists = await db.customer_property.find_one({"customer_id": customer_id, "property_id": property_id})
    if exists:
        await db.customer_property.update_one({"customer_id": customer_id, "property_id": property_id}, {"$set": {"deleted": False}})
        return
    await db.customer_property.insert_one({"id": new_id(), "customer_id": customer_id, "property_id": property_id, "owner_id": owner_id, "status": "linked", "notes": notes, "deleted": False, "created_at": now_iso()})

@api.get("/customers/{cid}")
async def get_customer(cid: str, user=Depends(get_current_user)):
    c = await db.customers.find_one({"id": cid, "is_deleted": {"$ne": True}})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Customer not found")
    result = await enrich_customer(c)
    links = await db.customer_property.find({"customer_id": cid, "deleted": {"$ne": True}}, {"_id": 0}).to_list(200)
    props = []
    for l in links:
        p = await db.properties.find_one({"id": l["property_id"], "is_deleted": {"$ne": True}}, {"_id": 0})
        if p:
            props.append(await enrich_property(p, user["id"]))
    result["properties"] = props
    result["followups"] = await db.followups.find({"customer_id": cid}, {"_id": 0}).sort("date", 1).to_list(100)
    result["deals"] = await db.deals.find({"customer_id": cid}, {"_id": 0}).to_list(100)
    result["matches"] = await match_properties(c, user["id"])
    return result

async def match_properties(c, user_id):
    q = {"owner_id": user_id, "is_deleted": {"$ne": True}}
    if c.get("req_category"):
        q["category"] = c["req_category"]
    if c.get("req_subcategory"):
        q["subcategory"] = c["req_subcategory"]
    if c.get("req_location"):
        q["location"] = c["req_location"]
    docs = await db.properties.find(q, {"_id": 0}).limit(20).to_list(20)
    out = []
    bmin, bmax = c.get("budget_min", 0), c.get("budget_max", 0)
    for d in docs:
        if bmax and d.get("price", 0) > bmax * 1.1:
            continue
        out.append(await enrich_property(d, user_id))
    return out

@api.put("/customers/{cid}")
async def update_customer(cid: str, data: CustomerIn, user=Depends(get_current_user)):
    c = await db.customers.find_one({"id": cid})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    upd = data.model_dump()
    prop_ids = upd.pop("property_ids", None)
    upd["updated_at"] = now_iso()
    await db.customers.update_one({"id": cid}, {"$set": upd})
    if prop_ids is not None:
        existing = await db.customer_property.find({"customer_id": cid, "deleted": {"$ne": True}}, {"_id": 0}).to_list(500)
        existing_ids = {e["property_id"] for e in existing}
        for pid in prop_ids:
            if pid not in existing_ids:
                await link_customer_property(cid, pid, user["id"])
        for e in existing:
            if e["property_id"] not in prop_ids:
                await db.customer_property.update_one({"id": e["id"]}, {"$set": {"deleted": True}})
    fresh = await db.customers.find_one({"id": cid})
    return await enrich_customer(fresh)

@api.delete("/customers/{cid}")
async def delete_customer(cid: str, user=Depends(get_current_user)):
    c = await db.customers.find_one({"id": cid})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.customers.update_one({"id": cid}, {"$set": {"is_deleted": True, "deleted_at": now_iso(), "deleted_by": user["id"]}})
    return {"success": True}

@api.post("/customers/{cid}/restore")
async def restore_customer(cid: str, user=Depends(get_current_user)):
    c = await db.customers.find_one({"id": cid})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.customers.update_one({"id": cid}, {"$set": {"is_deleted": False}, "$unset": {"deleted_at": "", "deleted_by": ""}})
    return {"success": True}

@api.post("/customers/{cid}/properties")
async def add_customer_props(cid: str, data: LinkProps, user=Depends(get_current_user)):
    c = await db.customers.find_one({"id": cid})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    for pid in data.property_ids:
        await link_customer_property(cid, pid, user["id"], data.notes)
    return {"success": True}

@api.delete("/customers/{cid}/properties/{pid}")
async def remove_customer_prop(cid: str, pid: str, user=Depends(get_current_user)):
    c = await db.customers.find_one({"id": cid})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.customer_property.update_one({"customer_id": cid, "property_id": pid}, {"$set": {"deleted": True}})
    return {"success": True}

# ---------------- Followups ----------------
@api.get("/followups")
async def list_followups(user=Depends(get_current_user), status: Optional[str] = None, customer_id: Optional[str] = None, property_id: Optional[str] = None):
    q = {"owner_id": user["id"]}
    if status:
        q["status"] = status
    if customer_id:
        q["customer_id"] = customer_id
    if property_id:
        q["property_id"] = property_id
    docs = await db.followups.find(q, {"_id": 0}).sort("date", 1).to_list(500)
    for d in docs:
        if d.get("customer_id"):
            cc = await db.customers.find_one({"id": d["customer_id"]}, {"_id": 0, "name": 1})
            d["customer_name"] = cc["name"] if cc else None
        if d.get("property_id"):
            pp = await db.properties.find_one({"id": d["property_id"]}, {"_id": 0, "title": 1})
            d["property_title"] = pp["title"] if pp else None
    return {"items": docs}

@api.post("/followups")
async def create_followup(data: FollowupIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc.update({"id": new_id(), "owner_id": user["id"], "created_at": now_iso(), "updated_at": now_iso()})
    await db.followups.insert_one(doc)
    return clean(doc)

@api.put("/followups/{fid}")
async def update_followup(fid: str, data: FollowupIn, user=Depends(get_current_user)):
    f = await db.followups.find_one({"id": fid})
    if not f or f["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    upd = data.model_dump()
    upd["updated_at"] = now_iso()
    if upd.get("status") == "Completed":
        upd["completed_at"] = now_iso()
    await db.followups.update_one({"id": fid}, {"$set": upd})
    fresh = await db.followups.find_one({"id": fid})
    return clean(fresh)

@api.delete("/followups/{fid}")
async def delete_followup(fid: str, user=Depends(get_current_user)):
    f = await db.followups.find_one({"id": fid})
    if not f or f["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.followups.delete_one({"id": fid})
    return {"success": True}

# ---------------- Deals ----------------
@api.get("/deals")
async def list_deals(user=Depends(get_current_user), stage: Optional[str] = None):
    q = {"owner_id": user["id"]}
    if stage:
        q["stage"] = stage
    docs = await db.deals.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        if d.get("customer_id"):
            cc = await db.customers.find_one({"id": d["customer_id"]}, {"_id": 0, "name": 1})
            d["customer_name"] = cc["name"] if cc else None
        if d.get("property_id"):
            pp = await db.properties.find_one({"id": d["property_id"]}, {"_id": 0, "title": 1})
            d["property_title"] = pp["title"] if pp else None
    return {"items": docs}

@api.post("/deals")
async def create_deal(data: DealIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc.update({"id": new_id(), "owner_id": user["id"], "created_at": now_iso(), "updated_at": now_iso()})
    await db.deals.insert_one(doc)
    await notify(user["id"], "deal_update", "Deal created", f"New deal '{doc.get('title') or 'Untitled'}' created", {"deal_id": doc["id"]})
    return clean(doc)

@api.put("/deals/{did}")
async def update_deal(did: str, data: DealIn, user=Depends(get_current_user)):
    d = await db.deals.find_one({"id": did})
    if not d or d["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    upd = data.model_dump()
    upd["updated_at"] = now_iso()
    if upd.get("stage") in ("Closed Won", "Closed Lost") and d.get("stage") != upd.get("stage"):
        upd["closed_at"] = now_iso()
    await db.deals.update_one({"id": did}, {"$set": upd})
    if upd.get("stage") != d.get("stage"):
        await notify(user["id"], "deal_update", "Deal updated", f"Deal moved to {upd.get('stage')}", {"deal_id": did})
    fresh = await db.deals.find_one({"id": did})
    return clean(fresh)

# ---------------- Sharing ----------------
async def get_share_details(pid: str):
    shares = await db.property_shares.find({"property_id": pid}, {"_id": 0}).to_list(100)
    for s in shares:
        r = await db.users.find_one({"id": s["recipient_user_id"]}, {"_id": 0})
        if r:
            s["recipient_name"] = r.get("name") or "Consultant"
            s["recipient_phone"] = r.get("phone")
        sender = await db.users.find_one({"id": s["sender_user_id"]}, {"_id": 0})
        if sender:
            s["sender_name"] = sender.get("name") or "Consultant"
    return shares

@api.post("/properties/{pid}/share")
async def share_property(pid: str, data: ShareIn, user=Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p or p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    recipient = await db.users.find_one({"phone": data.phone.strip()})
    if not recipient:
        raise HTTPException(status_code=404, detail="No consultant found with this phone number")
    if recipient["id"] == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot share a property with yourself")
    existing = await db.property_shares.find_one({"property_id": pid, "recipient_user_id": recipient["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Property already shared with this consultant")
    doc = {"id": new_id(), "property_id": pid, "sender_user_id": user["id"], "recipient_user_id": recipient["id"],
           "commission": data.commission, "note": data.note, "status": "pending", "shared_at": now_iso(),
           "accepted_at": None, "kept_at": None}
    await db.property_shares.insert_one(doc)
    await notify(recipient["id"], "property_shared", "Property shared with you",
                 f"{user.get('name') or 'A consultant'} shared '{p['title']}' with you",
                 {"property_id": pid, "share_id": doc["id"], "commission": data.commission})
    return clean(doc)

@api.get("/properties/{pid}/shares")
async def property_shares(pid: str, user=Depends(get_current_user)):
    return {"items": await get_share_details(pid)}

@api.get("/shared-properties")
async def shared_properties(user=Depends(get_current_user)):
    # shared with me
    recv = await db.property_shares.find({"recipient_user_id": user["id"]}, {"_id": 0}).to_list(200)
    received = []
    for s in recv:
        p = await db.properties.find_one({"id": s["property_id"], "is_deleted": {"$ne": True}}, {"_id": 0})
        if p:
            item = await enrich_property(p, user["id"])
            sender = await db.users.find_one({"id": s["sender_user_id"]}, {"_id": 0})
            item["share"] = {**s, "sender_name": (sender.get("name") if sender else "Consultant"), "sender_phone": (sender.get("phone") if sender else None)}
            received.append(item)
    # shared by me
    sent = await db.property_shares.find({"sender_user_id": user["id"]}, {"_id": 0}).to_list(200)
    sent_items = []
    for s in sent:
        p = await db.properties.find_one({"id": s["property_id"], "is_deleted": {"$ne": True}}, {"_id": 0})
        if p:
            item = await enrich_property(p, user["id"])
            rec = await db.users.find_one({"id": s["recipient_user_id"]}, {"_id": 0})
            item["share"] = {**s, "recipient_name": (rec.get("name") if rec else "Consultant"), "recipient_phone": (rec.get("phone") if rec else None)}
            sent_items.append(item)
    return {"received": received, "sent": sent_items}

@api.post("/property-shares/{sid}/accept")
async def accept_share(sid: str, user=Depends(get_current_user)):
    s = await db.property_shares.find_one({"id": sid})
    if not s or s["recipient_user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.property_shares.update_one({"id": sid}, {"$set": {"status": "accepted", "accepted_at": now_iso()}})
    # add a copy to recipient's properties
    p = await db.properties.find_one({"id": s["property_id"]}, {"_id": 0})
    if p:
        copy = {**p, "id": new_id(), "owner_id": user["id"], "created_at": now_iso(), "updated_at": now_iso(), "copied_from": p["id"]}
        await db.properties.insert_one(copy)
    await notify(s["sender_user_id"], "share_accepted", "Share accepted", f"{user.get('name') or 'A consultant'} added your shared property", {"property_id": s["property_id"]})
    return {"success": True}

@api.post("/property-shares/{sid}/keep")
async def keep_share(sid: str, user=Depends(get_current_user)):
    s = await db.property_shares.find_one({"id": sid})
    if not s or s["recipient_user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.property_shares.update_one({"id": sid}, {"$set": {"status": "kept", "kept_at": now_iso()}})
    return {"success": True}

# ---------------- Notifications ----------------
@api.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"items": docs, "unread": unread}

@api.put("/notifications/{nid}/read")
async def read_notification(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"success": True}

@api.put("/notifications/read-all")
async def read_all(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"success": True}

# ---------------- Dashboard ----------------
@api.get("/dashboard/summary")
async def dashboard_summary(user=Depends(get_current_user)):
    uid = user["id"]
    total_properties = await db.properties.count_documents({"owner_id": uid, "is_deleted": {"$ne": True}})
    active_customers = await db.customers.count_documents({"owner_id": uid, "is_deleted": {"$ne": True}})
    open_followups = await db.followups.count_documents({"owner_id": uid, "status": "Open"})
    deals = await db.deals.find({"owner_id": uid, "stage": {"$in": ACTIVE_STAGES}}, {"_id": 0, "value": 1}).to_list(1000)
    pipeline_value = sum(d.get("value", 0) for d in deals)
    return {"total_properties": total_properties, "active_customers": active_customers,
            "open_followups": open_followups, "pipeline_value": pipeline_value, "active_deals": len(deals)}

@api.get("/dashboard/recent-properties")
async def recent_properties(user=Depends(get_current_user)):
    docs = await db.properties.find({"owner_id": user["id"], "is_deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return {"items": [await enrich_property(d, user["id"]) for d in docs]}

@api.get("/dashboard/followups")
async def dashboard_followups(user=Depends(get_current_user)):
    docs = await db.followups.find({"owner_id": user["id"], "status": "Open"}, {"_id": 0}).sort("date", 1).limit(5).to_list(5)
    for d in docs:
        if d.get("customer_id"):
            cc = await db.customers.find_one({"id": d["customer_id"]}, {"_id": 0, "name": 1})
            d["customer_name"] = cc["name"] if cc else None
    return {"items": docs}

@api.get("/dashboard/pipeline")
async def dashboard_pipeline(user=Depends(get_current_user)):
    stages = ACTIVE_STAGES + ["Closed Won", "Closed Lost"]
    result = []
    for st in stages:
        deals = await db.deals.find({"owner_id": user["id"], "stage": st}, {"_id": 0, "value": 1}).to_list(1000)
        result.append({"stage": st, "count": len(deals), "value": sum(d.get("value", 0) for d in deals)})
    return {"stages": result}

# ---------------- Bin ----------------
@api.get("/bin/properties")
async def bin_properties(user=Depends(get_current_user)):
    docs = await db.properties.find({"owner_id": user["id"], "is_deleted": True}, {"_id": 0}).sort("deleted_at", -1).to_list(200)
    return {"items": [await enrich_property(d, user["id"]) for d in docs]}

@api.get("/bin/customers")
async def bin_customers(user=Depends(get_current_user)):
    docs = await db.customers.find({"owner_id": user["id"], "is_deleted": True}, {"_id": 0}).sort("deleted_at", -1).to_list(200)
    return {"items": [await enrich_customer(d) for d in docs]}

@api.post("/bin/properties/{pid}/restore")
async def bin_restore_property(pid: str, user=Depends(get_current_user)):
    return await restore_property(pid, user)

@api.post("/bin/customers/{cid}/restore")
async def bin_restore_customer(cid: str, user=Depends(get_current_user)):
    return await restore_customer(cid, user)

@api.delete("/bin/properties/{pid}/permanent")
async def perm_delete_property(pid: str, user=Depends(get_current_user)):
    p = await db.properties.find_one({"id": pid})
    if not p or p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.properties.delete_one({"id": pid})
    await db.customer_property.delete_many({"property_id": pid})
    await db.property_shares.delete_many({"property_id": pid})
    await db.followups.delete_many({"property_id": pid})
    return {"success": True}

@api.delete("/bin/customers/{cid}/permanent")
async def perm_delete_customer(cid: str, user=Depends(get_current_user)):
    c = await db.customers.find_one({"id": cid})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.customers.delete_one({"id": cid})
    await db.customer_property.delete_many({"customer_id": cid})
    await db.followups.delete_many({"customer_id": cid})
    return {"success": True}

# ---------------- Locations ----------------
@api.get("/locations")
async def list_locations():
    defaults = ["Whitefield", "Sarjapur Road", "Hebbal", "Yelahanka", "HSR Layout", "Electronic City", "Devanahalli", "Indiranagar", "Koramangala", "Kanakapura Road"]
    custom = await db.locations.distinct("name")
    return {"items": defaults + [c for c in custom if c not in defaults]}

@api.get("/consultant/lookup")
async def lookup_consultant(phone: str, user=Depends(get_current_user)):
    u = await db.users.find_one({"phone": phone.strip()}, {"_id": 0, "name": 1, "phone": 1, "consultant_id": 1})
    if not u:
        raise HTTPException(status_code=404, detail="No consultant found with this phone number")
    return u

@api.get("/")
async def root():
    return {"message": "PropConsult CRM API"}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await db.users.create_index("phone", unique=True)
    await db.properties.create_index("owner_id")
    await db.customers.create_index("owner_id")
    await db.customer_property.create_index([("customer_id", 1), ("property_id", 1)])
    await db.property_shares.create_index("property_id")
    await db.notifications.create_index("user_id")

@app.on_event("shutdown")
async def shutdown():
    client.close()
