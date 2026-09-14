"""Full lifecycle backend tests for Pinaki Solutions CRM."""
import os
import io
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FRONTEND_ENV = Path(__file__).parent.parent.parent / "frontend" / ".env"
for line in FRONTEND_ENV.read_text().splitlines():
    if line.startswith("REACT_APP_BACKEND_URL="):
        BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
        break

API = f"{BASE_URL}/api"
PW = "Pinaki@123"

def session_for(email):
    s = requests.Session()
    # ensure no lockout residue
    r = s.post(f"{API}/auth/login", json={"email": email, "password": PW}, timeout=30)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return s, r.json()


# ---------- Auth ----------
class TestAuth:
    def test_login_success_sets_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": "admin@pinakisolutions.com", "password": PW})
        assert r.status_code == 200
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies
        body = r.json()
        assert body["email"] == "admin@pinakisolutions.com"
        assert body["role"] == "admin"
        assert "password_hash" not in body

    def test_login_wrong_password(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": "admin@pinakisolutions.com", "password": "wrong-xyz"})
        assert r.status_code == 401

    def test_me_with_cookie(self):
        s, _ = session_for("admin@pinakisolutions.com")
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_logout_clears(self):
        s, _ = session_for("admin@pinakisolutions.com")
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200


# ---------- Clients ----------
class TestClients:
    def test_list_clients_has_seed(self):
        s, _ = session_for("admin@pinakisolutions.com")
        r = s.get(f"{API}/clients")
        assert r.status_code == 200
        names = [c["company_name"] for c in r.json()]
        assert any("Northstar" in n for n in names)
        assert any("Aster" in n for n in names)
        assert any("Svelte" in n for n in names)

    def test_create_client_admin(self):
        s, _ = session_for("admin@pinakisolutions.com")
        r = s.post(f"{API}/clients", json={
            "company_name": "TEST_Company",
            "contact_person": "T P",
            "email": "test_company@example.com",
            "phone": "+91 90000 00000",
        })
        assert r.status_code == 200
        assert r.json()["company_name"] == "TEST_Company"

    def test_client_detail_includes_related(self):
        s, _ = session_for("admin@pinakisolutions.com")
        r = s.get(f"{API}/clients/CL-1001")
        assert r.status_code == 200
        d = r.json()
        assert "orders" in d and "contacts" in d and "invoices" in d


# ---------- Full Lifecycle ----------
@pytest.fixture(scope="module")
def order_flow():
    """Create fresh order and store state to run through the lifecycle."""
    state = {}
    s, _ = session_for("admin@pinakisolutions.com")
    r = s.post(f"{API}/orders", json={
        "client_id": "CL-1001",
        "product": "TEST_Lifecycle Product",
        "quantity": 100,
        "unit_price": 500,
        "required_delivery_date": "2026-04-30",
    })
    assert r.status_code == 200, r.text
    o = r.json()
    state["admin"] = s
    state["order_id"] = o["order_id"]
    state["order"] = o
    return state


class TestOrders:
    def test_create_order_autofields(self, order_flow):
        o = order_flow["order"]
        assert o["order_id"].startswith("PS-")
        assert o["current_stage"] == "Order Received"
        assert o["order_value"] == 100 * 500
        assert o["gst"] == round(100 * 500 * 0.18, 2)
        assert o["total_value"] == o["order_value"] + o["gst"]
        assert o["approval_status"] == "Pending Approval"

    def test_list_orders_search(self, order_flow):
        s = order_flow["admin"]
        r = s.get(f"{API}/orders", params={"search": "TEST_Lifecycle"})
        assert r.status_code == 200
        ids = [x["order_id"] for x in r.json()]
        assert order_flow["order_id"] in ids

    def test_order_detail_arrays(self, order_flow):
        s = order_flow["admin"]
        r = s.get(f"{API}/orders/{order_flow['order_id']}")
        assert r.status_code == 200
        d = r.json()
        for k in ["designs", "approvals", "dispatches", "challans", "deliveries", "invoices", "payments", "documents"]:
            assert isinstance(d[k], list)


class TestLifecycleEnforcement:
    def test_production_locked_before_approval(self, order_flow):
        s = order_flow["admin"]
        r = s.patch(f"{API}/orders/{order_flow['order_id']}/stage", json={"stage": "Production"})
        assert r.status_code == 409
        assert "approval" in r.json()["detail"].lower()

    def test_dispatch_locked_before_production(self, order_flow):
        s = order_flow["admin"]
        r = s.post(f"{API}/orders/{order_flow['order_id']}/dispatches", json={
            "dispatch_date": "2026-02-01", "quantity": 100, "transporter": "BlueDart",
        })
        assert r.status_code == 409

    def test_invoice_locked_before_delivery(self, order_flow):
        s = order_flow["admin"]
        r = s.post(f"{API}/orders/{order_flow['order_id']}/invoices", json={"invoice_date": "2026-02-01"})
        assert r.status_code == 409


class TestDesignApprovalFlow:
    def test_create_design_moves_to_approval(self, order_flow):
        s = order_flow["admin"]
        r = s.post(f"{API}/orders/{order_flow['order_id']}/designs", json={
            "designer": "Kabir", "comments": "V1 shared"
        })
        assert r.status_code == 200
        d = r.json()
        assert d["version"] == 1
        det = s.get(f"{API}/orders/{order_flow['order_id']}").json()
        assert det["current_stage"] == "Client Approval"

    def test_rejection_returns_to_design(self, order_flow):
        s = order_flow["admin"]
        r = s.post(f"{API}/orders/{order_flow['order_id']}/approvals", json={
            "status": "Rejected", "approver": "Meera", "comments": "change color"
        })
        assert r.status_code == 200
        det = s.get(f"{API}/orders/{order_flow['order_id']}").json()
        assert det["current_stage"] == "Design"
        assert det["approval_status"] == "Rejected"

    def test_approval_moves_to_production(self, order_flow):
        s = order_flow["admin"]
        r = s.post(f"{API}/orders/{order_flow['order_id']}/approvals", json={
            "status": "Approved", "approver": "Meera"
        })
        assert r.status_code == 200
        det = s.get(f"{API}/orders/{order_flow['order_id']}").json()
        assert det["approval_status"] == "Approved"
        assert det["current_stage"] == "Production"


class TestProductionDispatch:
    def test_production_in_progress(self, order_flow):
        s = order_flow["admin"]
        r = s.patch(f"{API}/orders/{order_flow['order_id']}/production", json={"status": "In Progress"})
        assert r.status_code == 200

    def test_production_completed_moves_to_dispatch(self, order_flow):
        s = order_flow["admin"]
        r = s.patch(f"{API}/orders/{order_flow['order_id']}/production", json={"status": "Completed"})
        assert r.status_code == 200
        assert r.json()["current_stage"] == "Dispatch"

    def test_dispatch_creates_challan(self, order_flow):
        s = order_flow["admin"]
        r = s.post(f"{API}/orders/{order_flow['order_id']}/dispatches", json={
            "dispatch_date": "2026-02-05", "quantity": 100, "transporter": "BlueDart",
            "tracking_number": "TRK-TEST-1"
        })
        assert r.status_code == 200
        det = s.get(f"{API}/orders/{order_flow['order_id']}").json()
        assert det["dispatch_status"] == "Dispatched"
        assert det["delivery_status"] == "In Transit"
        assert len(det["challans"]) >= 1
        assert det["challans"][0]["challan_number"].startswith("CH-")


class TestDeliveryInvoicePayment:
    def test_delivery_moves_to_accounts(self, order_flow):
        s = order_flow["admin"]
        r = s.post(f"{API}/orders/{order_flow['order_id']}/deliveries", json={
            "actual_date": "2026-02-08", "received_by": "Meera", "status": "Delivered"
        })
        assert r.status_code == 200
        det = s.get(f"{API}/orders/{order_flow['order_id']}").json()
        assert det["delivery_status"] == "Delivered"
        assert det["current_stage"] == "Accounts"

    def test_invoice_generated(self, order_flow):
        s = order_flow["admin"]
        r = s.post(f"{API}/orders/{order_flow['order_id']}/invoices", json={
            "invoice_date": "2026-02-09", "due_date": "2026-03-11"
        })
        assert r.status_code == 200
        inv = r.json()
        assert inv["invoice_number"].startswith("INV-")
        order_flow["invoice"] = inv

    def test_partial_payment(self, order_flow):
        s = order_flow["admin"]
        inv = order_flow["invoice"]
        r = s.post(f"{API}/payments", json={
            "invoice_id": inv["invoice_id"], "amount": inv["total"] / 2,
            "date": "2026-02-10", "mode": "Bank Transfer"
        })
        assert r.status_code == 200
        invs = s.get(f"{API}/invoices").json()
        this = next(i for i in invs if i["invoice_id"] == inv["invoice_id"])
        assert this["status"] == "Partially Paid"

    def test_full_payment(self, order_flow):
        s = order_flow["admin"]
        inv = order_flow["invoice"]
        r = s.post(f"{API}/payments", json={
            "invoice_id": inv["invoice_id"], "amount": inv["total"] / 2,
            "date": "2026-02-11", "mode": "Bank Transfer"
        })
        assert r.status_code == 200
        invs = s.get(f"{API}/invoices").json()
        this = next(i for i in invs if i["invoice_id"] == inv["invoice_id"])
        assert this["status"] == "Paid"
        assert this["outstanding"] == 0


# ---------- Documents ----------
class TestDocuments:
    def test_upload_and_download(self, order_flow):
        s = order_flow["admin"]
        content = b"hello pinaki"
        files = {"file": ("test.txt", io.BytesIO(content), "text/plain")}
        r = s.post(f"{API}/orders/{order_flow['order_id']}/documents", files=files)
        assert r.status_code == 200
        doc = r.json()
        assert doc["storage_backend"] == "mongo-gridfs"
        list_r = s.get(f"{API}/orders/{order_flow['order_id']}/documents")
        assert list_r.status_code == 200
        assert any(d["document_id"] == doc["document_id"] for d in list_r.json())
        dl = s.get(f"{API}/documents/{doc['document_id']}/download")
        assert dl.status_code == 200
        assert dl.content == content


# ---------- Notifications ----------
class TestNotifications:
    def test_notifications_after_order(self, order_flow):
        s, _ = session_for("design@pinakisolutions.com")
        r = s.get(f"{API}/notifications")
        assert r.status_code == 200
        msgs = [n["message"] for n in r.json()]
        assert any(order_flow["order_id"] in m and "received" in m.lower() for m in msgs)

    def test_production_notification(self, order_flow):
        s, _ = session_for("production@pinakisolutions.com")
        r = s.get(f"{API}/notifications")
        assert r.status_code == 200
        assert any(order_flow["order_id"] in n["message"] for n in r.json())

    def test_accounts_notification(self, order_flow):
        s, _ = session_for("accounts@pinakisolutions.com")
        r = s.get(f"{API}/notifications")
        assert r.status_code == 200
        assert any(order_flow["order_id"] in n["message"] for n in r.json())


# ---------- Search + Reports ----------
class TestSearchReports:
    def test_search_aster(self):
        s, _ = session_for("admin@pinakisolutions.com")
        r = s.get(f"{API}/search", params={"q": "Aster"})
        assert r.status_code == 200
        d = r.json()
        assert len(d["clients"]) >= 1

    def test_reports(self):
        s, _ = session_for("admin@pinakisolutions.com")
        r = s.get(f"{API}/reports")
        assert r.status_code == 200
        d = r.json()
        for k in ["order_volume", "revenue", "by_client", "by_product",
                  "pending_approvals", "avg_order_to_delivery"]:
            assert k in d


# ---------- RBAC ----------
class TestRBAC:
    def test_sales_cannot_production(self, order_flow):
        s, _ = session_for("sales@pinakisolutions.com")
        r = s.patch(f"{API}/orders/{order_flow['order_id']}/production", json={"status": "In Progress"})
        assert r.status_code == 403

    def test_production_cannot_dispatch(self, order_flow):
        s, _ = session_for("production@pinakisolutions.com")
        r = s.post(f"{API}/orders/{order_flow['order_id']}/dispatches", json={
            "dispatch_date": "2026-02-10", "quantity": 10, "transporter": "X"
        })
        assert r.status_code == 403

    def test_accounts_can_invoice_flow(self, order_flow):
        # Create separate order fully through lifecycle to test accounts POST invoice
        admin, _ = session_for("admin@pinakisolutions.com")
        order = admin.post(f"{API}/orders", json={
            "client_id": "CL-1002", "product": "TEST_RBAC_INV",
            "quantity": 10, "unit_price": 100, "required_delivery_date": "2026-05-01"
        }).json()
        oid = order["order_id"]
        admin.post(f"{API}/orders/{oid}/designs", json={"comments": "d"})
        admin.post(f"{API}/orders/{oid}/approvals", json={"status": "Approved", "approver": "A"})
        admin.patch(f"{API}/orders/{oid}/production", json={"status": "Completed"})
        admin.post(f"{API}/orders/{oid}/dispatches", json={
            "dispatch_date": "2026-02-05", "quantity": 10, "transporter": "T"
        })
        admin.post(f"{API}/orders/{oid}/deliveries", json={
            "actual_date": "2026-02-08", "received_by": "X", "status": "Delivered"
        })
        acc, _ = session_for("accounts@pinakisolutions.com")
        r = acc.post(f"{API}/orders/{oid}/invoices", json={
            "invoice_date": "2026-02-09", "due_date": "2026-03-11"
        })
        assert r.status_code == 200
