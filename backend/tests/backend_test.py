"""PropConsult CRM Backend Tests - comprehensive API coverage."""
import os
import io
import time
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://broker-suite-29.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PHONE_A = f"99{int(time.time()) % 100000000:08d}"  # unique per run
PHONE_B = f"88{int(time.time()) % 100000000:08d}"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session_a():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/send-otp", json={"phone": PHONE_A})
    assert r.status_code == 200, r.text
    otp = r.json()["demo_otp"]
    r = s.post(f"{API}/auth/verify-otp", json={"phone": PHONE_A, "code": otp})
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    s.user = data["user"]
    s.is_new = data["is_new_user"]
    return s


@pytest.fixture(scope="session")
def session_b():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/send-otp", json={"phone": PHONE_B})
    assert r.status_code == 200, r.text
    otp = r.json()["demo_otp"]
    r = s.post(f"{API}/auth/verify-otp", json={"phone": PHONE_B, "code": otp})
    assert r.status_code == 200
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    s.user = data["user"]
    return s


# ---------- Auth ----------
class TestAuth:
    def test_send_otp_returns_demo(self):
        r = requests.post(f"{API}/auth/send-otp", json={"phone": "7777770001"})
        assert r.status_code == 200
        j = r.json()
        assert "demo_otp" in j
        assert len(j["demo_otp"]) == 6

    def test_send_otp_invalid_phone(self):
        r = requests.post(f"{API}/auth/send-otp", json={"phone": "123"})
        assert r.status_code == 400

    def test_verify_wrong_otp(self):
        requests.post(f"{API}/auth/send-otp", json={"phone": "7777770002"})
        r = requests.post(f"{API}/auth/verify-otp", json={"phone": "7777770002", "code": "000000"})
        assert r.status_code == 400

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert r.status_code == 401

    def test_me_with_token(self, session_a):
        r = session_a.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["phone"] == PHONE_A

    def test_new_user_flag(self, session_a):
        assert session_a.is_new in (True, False)

    def test_profile_update(self, session_a):
        r = session_a.put(f"{API}/auth/profile", json={"name": "TEST Consultant A", "email": "a@test.com", "onboarded": True})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST Consultant A"


# ---------- Properties ----------
class TestProperties:
    def test_create_property(self, session_a):
        payload = {
            "category": "Residential", "subcategory": "Apartment", "location": "Whitefield",
            "transaction_types": ["For Sale", "For Rent"], "title": "TEST 2BHK Whitefield",
            "price": 5000000, "rental_income": 25000, "commission": 100000,
            "amenities": ["Lift", "Parking", "Gym"], "bedrooms": "2BHK", "area": "1100 sqft"
        }
        r = session_a.post(f"{API}/properties", json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["title"] == "TEST 2BHK Whitefield"
        assert p["price"] == 5000000
        assert p["commission"] == 100000
        assert "Lift" in p["amenities"]
        session_a.prop_id = p["id"]

    def test_list_properties(self, session_a):
        r = session_a.get(f"{API}/properties")
        assert r.status_code == 200
        j = r.json()
        assert j["total"] >= 1
        assert any(p["id"] == session_a.prop_id for p in j["items"])

    def test_list_filters(self, session_a):
        r = session_a.get(f"{API}/properties", params={"category": "Residential", "transaction_type": "For Sale", "search": "Whitefield"})
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_get_property(self, session_a):
        r = session_a.get(f"{API}/properties/{session_a.prop_id}")
        assert r.status_code == 200
        p = r.json()
        assert p["id"] == session_a.prop_id
        assert "customers" in p and "followups" in p and "deals" in p and "shares" in p

    def test_update_property(self, session_a):
        payload = {
            "category": "Residential", "subcategory": "Apartment", "location": "Whitefield",
            "transaction_types": ["For Sale"], "title": "TEST 2BHK Updated",
            "price": 5500000, "rental_income": 25000, "commission": 110000, "amenities": ["Lift"]
        }
        r = session_a.put(f"{API}/properties/{session_a.prop_id}", json=payload)
        assert r.status_code == 200
        assert r.json()["price"] == 5500000
        assert r.json()["title"] == "TEST 2BHK Updated"


# ---------- Photos ----------
class TestPhotos:
    def _make_img(self):
        img = Image.new("RGB", (50, 50), color=(255, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        return buf

    def test_upload_tmp(self, session_a):
        buf = self._make_img()
        r = requests.post(f"{API}/upload",
                          headers={"Authorization": session_a.headers["Authorization"]},
                          files={"files": ("t.jpg", buf, "image/jpeg")})
        assert r.status_code == 200, r.text
        files = r.json()["files"]
        assert files and files[0]["storage_path"]
        session_a.tmp_path = files[0]["storage_path"]

    def test_attach_photos(self, session_a):
        buf = self._make_img()
        r = requests.post(f"{API}/properties/{session_a.prop_id}/photos",
                          headers={"Authorization": session_a.headers["Authorization"]},
                          files=[("files", ("p.jpg", buf, "image/jpeg"))])
        assert r.status_code == 200, r.text
        photos = r.json()["photos"]
        assert len(photos) >= 1
        assert photos[0]["is_primary"] is True
        session_a.photo_id = photos[0]["id"]
        session_a.photo_path = photos[0]["storage_path"]

    def test_serve_file(self, session_a):
        token = session_a.headers["Authorization"].split()[1]
        r = requests.get(f"{API}/files/{session_a.photo_path}", params={"auth": token})
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/")
        assert len(r.content) > 0

    def test_serve_file_no_auth(self, session_a):
        r = requests.get(f"{API}/files/{session_a.photo_path}")
        assert r.status_code == 401

    def test_delete_photo(self, session_a):
        r = session_a.delete(f"{API}/properties/{session_a.prop_id}/photos/{session_a.photo_id}")
        assert r.status_code == 200


# ---------- Customers / Many-to-many ----------
class TestCustomers:
    def test_create_second_prop(self, session_a):
        r = session_a.post(f"{API}/properties", json={
            "category": "Residential", "subcategory": "Villa", "location": "Sarjapur Road",
            "transaction_types": ["For Sale"], "title": "TEST Villa Sarjapur",
            "price": 15000000, "commission": 300000, "amenities": []
        })
        assert r.status_code == 200
        session_a.prop_id2 = r.json()["id"]

    def test_create_customer_with_properties(self, session_a):
        payload = {
            "name": "TEST Buyer One", "phone": "9000000001", "customer_type": "Buyer",
            "req_category": "Residential", "req_location": "Whitefield",
            "req_transaction_types": ["For Sale"], "budget_min": 4000000, "budget_max": 6000000,
            "property_ids": [session_a.prop_id, session_a.prop_id2]
        }
        r = session_a.post(f"{API}/customers", json=payload)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["property_count"] == 2
        session_a.cust_id = c["id"]

    def test_create_second_customer_same_prop(self, session_a):
        r = session_a.post(f"{API}/customers", json={
            "name": "TEST Buyer Two", "phone": "9000000002", "customer_type": "Buyer",
            "property_ids": [session_a.prop_id]
        })
        assert r.status_code == 200
        session_a.cust_id2 = r.json()["id"]

    def test_property_customer_count(self, session_a):
        r = session_a.get(f"{API}/properties/{session_a.prop_id}")
        assert r.status_code == 200
        assert r.json()["customer_count"] == 2

    def test_get_customer_shows_properties_and_matches(self, session_a):
        r = session_a.get(f"{API}/customers/{session_a.cust_id}")
        assert r.status_code == 200
        c = r.json()
        assert len(c["properties"]) == 2
        assert isinstance(c.get("matches"), list)

    def test_remove_customer_prop(self, session_a):
        r = session_a.delete(f"{API}/customers/{session_a.cust_id}/properties/{session_a.prop_id2}")
        assert r.status_code == 200
        r = session_a.get(f"{API}/customers/{session_a.cust_id}")
        assert len(r.json()["properties"]) == 1

    def test_add_customer_props(self, session_a):
        r = session_a.post(f"{API}/customers/{session_a.cust_id}/properties",
                           json={"property_ids": [session_a.prop_id2]})
        assert r.status_code == 200
        r = session_a.get(f"{API}/customers/{session_a.cust_id}")
        assert len(r.json()["properties"]) == 2


# ---------- Followups ----------
class TestFollowups:
    def test_create_followup(self, session_a):
        r = session_a.post(f"{API}/followups", json={
            "customer_id": session_a.cust_id, "property_id": session_a.prop_id,
            "date": "2026-02-01", "time": "10:00", "followup_type": "Call", "status": "Open",
            "notes": "TEST followup"
        })
        assert r.status_code == 200
        session_a.fup_id = r.json()["id"]

    def test_dashboard_open_followups(self, session_a):
        r = session_a.get(f"{API}/dashboard/summary")
        assert r.status_code == 200
        assert r.json()["open_followups"] >= 1

    def test_complete_followup(self, session_a):
        r = session_a.put(f"{API}/followups/{session_a.fup_id}", json={
            "customer_id": session_a.cust_id, "property_id": session_a.prop_id,
            "date": "2026-02-01", "status": "Completed", "followup_type": "Call"
        })
        assert r.status_code == 200
        assert r.json()["status"] == "Completed"


# ---------- Deals ----------
class TestDeals:
    def test_create_deal(self, session_a):
        r = session_a.post(f"{API}/deals", json={
            "customer_id": session_a.cust_id, "property_id": session_a.prop_id,
            "title": "TEST Deal 1", "value": 5500000, "commission": 110000, "stage": "New"
        })
        assert r.status_code == 200
        session_a.deal_id = r.json()["id"]

    def test_pipeline_active_includes_new(self, session_a):
        r = session_a.get(f"{API}/dashboard/summary")
        assert r.json()["pipeline_value"] >= 5500000

    def test_advance_stage(self, session_a):
        r = session_a.put(f"{API}/deals/{session_a.deal_id}", json={
            "customer_id": session_a.cust_id, "property_id": session_a.prop_id,
            "title": "TEST Deal 1", "value": 5500000, "stage": "Negotiation"
        })
        assert r.status_code == 200
        assert r.json()["stage"] == "Negotiation"

    def test_closed_won_excluded(self, session_a):
        before = session_a.get(f"{API}/dashboard/summary").json()["pipeline_value"]
        r = session_a.put(f"{API}/deals/{session_a.deal_id}", json={
            "customer_id": session_a.cust_id, "property_id": session_a.prop_id,
            "title": "TEST Deal 1", "value": 5500000, "stage": "Closed Won"
        })
        assert r.status_code == 200
        after = session_a.get(f"{API}/dashboard/summary").json()["pipeline_value"]
        assert after == before - 5500000


# ---------- Sharing ----------
class TestSharing:
    def test_share_requires_recipient_account(self, session_a, session_b):
        # Ensure both exist
        assert session_b.user["phone"] == PHONE_B
        r = session_a.post(f"{API}/properties/{session_a.prop_id}/share",
                           json={"phone": PHONE_B, "commission": 50000, "note": "TEST share"})
        assert r.status_code == 200, r.text
        session_a.share_id = r.json()["id"]
        assert r.json()["commission"] == 50000

    def test_share_duplicate(self, session_a):
        r = session_a.post(f"{API}/properties/{session_a.prop_id}/share",
                           json={"phone": PHONE_B, "commission": 1})
        assert r.status_code == 400

    def test_share_unknown_phone(self, session_a):
        r = session_a.post(f"{API}/properties/{session_a.prop_id}/share",
                           json={"phone": "0000000000", "commission": 1})
        assert r.status_code == 404

    def test_recipient_sees_received(self, session_b, session_a):
        r = session_b.get(f"{API}/shared-properties")
        assert r.status_code == 200
        received = r.json()["received"]
        assert any(x["id"] == session_a.prop_id for x in received)

    def test_recipient_can_view_shared_prop(self, session_b, session_a):
        r = session_b.get(f"{API}/properties/{session_a.prop_id}")
        assert r.status_code == 200

    def test_recipient_cannot_edit(self, session_b, session_a):
        r = session_b.put(f"{API}/properties/{session_a.prop_id}", json={
            "category": "x", "subcategory": "x", "location": "x",
            "transaction_types": [], "price": 1
        })
        assert r.status_code == 403

    def test_notification_created(self, session_b):
        r = session_b.get(f"{API}/notifications")
        assert r.status_code == 200
        items = r.json()["items"]
        assert any(n["type"] == "property_shared" for n in items)

    def test_accept_share(self, session_b, session_a):
        r = session_b.post(f"{API}/property-shares/{session_a.share_id}/accept")
        assert r.status_code == 200
        # recipient should now have a copy
        r = session_b.get(f"{API}/properties")
        copied = [p for p in r.json()["items"] if p.get("copied_from") == session_a.prop_id]
        assert copied, "Expected a copied property for recipient"

    def test_is_shared_flag(self, session_a):
        r = session_a.get(f"{API}/properties/{session_a.prop_id}")
        assert r.json()["is_shared"] is True


# ---------- Authorization ----------
class TestAuthorization:
    def test_b_cannot_see_a_private_customer(self, session_a, session_b):
        r = session_b.get(f"{API}/customers/{session_a.cust_id}")
        assert r.status_code in (403, 404)

    def test_b_cannot_delete_a_property(self, session_a, session_b):
        r = session_b.delete(f"{API}/properties/{session_a.prop_id}")
        assert r.status_code in (403, 404)


# ---------- Notifications ----------
class TestNotifications:
    def test_list(self, session_a):
        r = session_a.get(f"{API}/notifications")
        assert r.status_code == 200
        j = r.json()
        assert "unread" in j and "items" in j
        if j["items"]:
            session_a.notif_id = j["items"][0]["id"]

    def test_mark_read(self, session_a):
        if hasattr(session_a, "notif_id"):
            r = session_a.put(f"{API}/notifications/{session_a.notif_id}/read")
            assert r.status_code == 200

    def test_read_all(self, session_a):
        r = session_a.put(f"{API}/notifications/read-all")
        assert r.status_code == 200
        r = session_a.get(f"{API}/notifications")
        assert r.json()["unread"] == 0


# ---------- Bin ----------
class TestBin:
    def test_soft_delete_property(self, session_a):
        # delete second property to not disturb other tests
        r = session_a.delete(f"{API}/properties/{session_a.prop_id2}")
        assert r.status_code == 200

    def test_bin_lists_deleted(self, session_a):
        r = session_a.get(f"{API}/bin/properties")
        assert r.status_code == 200
        assert any(p["id"] == session_a.prop_id2 for p in r.json()["items"])

    def test_restore(self, session_a):
        r = session_a.post(f"{API}/bin/properties/{session_a.prop_id2}/restore")
        assert r.status_code == 200
        r = session_a.get(f"{API}/properties/{session_a.prop_id2}")
        assert r.status_code == 200

    def test_permanent_delete(self, session_a):
        session_a.delete(f"{API}/properties/{session_a.prop_id2}")
        r = session_a.delete(f"{API}/bin/properties/{session_a.prop_id2}/permanent")
        assert r.status_code == 200
        r = session_a.get(f"{API}/properties/{session_a.prop_id2}")
        assert r.status_code == 404


# ---------- Dashboard ----------
class TestDashboard:
    def test_summary(self, session_a):
        r = session_a.get(f"{API}/dashboard/summary")
        assert r.status_code == 200
        j = r.json()
        for k in ["total_properties", "active_customers", "open_followups", "pipeline_value"]:
            assert k in j

    def test_pipeline(self, session_a):
        r = session_a.get(f"{API}/dashboard/pipeline")
        assert r.status_code == 200
        stages = [s["stage"] for s in r.json()["stages"]]
        assert "New" in stages and "Closed Won" in stages

    def test_locations(self, session_a):
        r = session_a.get(f"{API}/locations")
        assert r.status_code == 200
        assert "Whitefield" in r.json()["items"]
