"""Regression coverage for Pinaki CRM authentication, lifecycle guards, and documents."""
import os
import uuid

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
pytestmark = pytest.mark.skipif(not BASE_URL, reason="REACT_APP_BACKEND_URL is not configured")


def login(email="admin@pinakisolutions.com", password="Pinaki@123"):
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=20,
    )
    return session, response


def test_login_sets_session_and_me():
    session, response = login()
    assert response.status_code == 200
    assert response.json()["email"] == "admin@pinakisolutions.com"
    cookies = response.cookies
    assert "access_token" in cookies and "refresh_token" in cookies
    me = session.get(f"{BASE_URL}/api/auth/me", timeout=20)
    assert me.status_code == 200
    assert me.json()["role"] == "admin"


def test_protected_endpoints_require_authentication():
    response = requests.get(f"{BASE_URL}/api/dashboard", timeout=20)
    assert response.status_code == 401
    assert "sign" in str(response.json()).lower()


@pytest.mark.parametrize(
    "email,role",
    [
        ("admin@pinakisolutions.com", "admin"),
        ("sales@pinakisolutions.com", "sales"),
        ("design@pinakisolutions.com", "design"),
        ("production@pinakisolutions.com", "production"),
        ("accounts@pinakisolutions.com", "accounts"),
    ],
)
def test_seeded_role_users_can_login(email, role):
    session, response = login(email)
    assert response.status_code == 200
    assert response.json()["role"] == role
    assert session.get(f"{BASE_URL}/api/orders", timeout=20).status_code == 200


def test_dashboard_orders_and_detail_have_expected_data():
    session, response = login()
    assert response.status_code == 200
    dashboard = session.get(f"{BASE_URL}/api/dashboard", timeout=20)
    assert dashboard.status_code == 200
    data = dashboard.json()
    assert data["total_orders"] >= 2
    assert "stage_counts" in data and "Client Approval" in data["stage_counts"]
    orders = session.get(f"{BASE_URL}/api/orders", timeout=20)
    assert orders.status_code == 200
    order = orders.json()[0]
    assert order["order_id"].startswith("PS-")
    detail = session.get(f"{BASE_URL}/api/orders/{order['order_id']}", timeout=20)
    assert detail.status_code == 200
    assert detail.json()["order_id"] == order["order_id"]
    assert "_id" not in detail.json()


def test_lifecycle_guards_return_clear_conflicts():
    session, response = login()
    assert response.status_code == 200
    order_id = "PS-2603-3F91"
    # Restore the seeded approval fixture if an interactive UI run advanced it.
    reset = session.patch(
        f"{BASE_URL}/api/orders/{order_id}/stage",
        json={"stage": "Client Approval", "status": "Pending Approval"},
        timeout=20,
    )
    assert reset.status_code == 200
    for stage, expected in [
        ("Production", "approval"),
        ("Dispatch", "production"),
        ("Invoice", "delivery"),
    ]:
        result = session.patch(
            f"{BASE_URL}/api/orders/{order_id}/stage",
            json={"stage": stage},
            timeout=20,
        )
        assert result.status_code == 409
        assert expected in result.json()["detail"].lower()


def test_document_upload_returns_persistent_linked_record():
    session, response = login()
    assert response.status_code == 200
    payload = f"test document {uuid.uuid4()}"
    upload = session.post(
        f"{BASE_URL}/api/orders/PS-2603-3F91/documents",
        files={"file": ("TEST_lifecycle.txt", payload.encode(), "text/plain")},
        timeout=30,
    )
    assert upload.status_code == 200
    document = upload.json()
    assert document["order_id"] == "PS-2603-3F91"
    assert document["name"] == "TEST_lifecycle.txt"
    assert document["storage_backend"] == "mongo-gridfs"
    assert document["storage_id"]


def test_non_sales_role_cannot_create_client():
    session, response = login("design@pinakisolutions.com")
    assert response.status_code == 200
    result = session.post(
        f"{BASE_URL}/api/clients",
        json={
            "company_name": "TEST_role_guard",
            "contact_person": "Test User",
            "email": "role-guard@example.com",
            "phone": "0000000000",
        },
        timeout=20,
    )
    assert result.status_code == 403
    assert "access" in result.json()["detail"].lower()


def test_login_cors_and_cookie_security_attributes():
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@pinakisolutions.com", "password": "Pinaki@123"},
        headers={"Origin": "https://pinaki-crm.preview.emergentagent.com"},
        timeout=20,
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-credentials") == "true"
    assert response.headers.get("access-control-allow-origin") == "https://pinaki-crm.preview.emergentagent.com"
    for cookie in response.cookies:
        assert cookie.has_nonstandard_attr("HttpOnly")
        assert cookie.has_nonstandard_attr("SameSite")


def test_brute_force_lockout_after_five_failures():
    session = requests.Session()
    for _ in range(5):
        failed = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@pinakisolutions.com", "password": "wrong-password"},
            timeout=20,
        )
        assert failed.status_code == 401
    locked = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@pinakisolutions.com", "password": "Pinaki@123"},
        timeout=20,
    )
    assert locked.status_code == 429