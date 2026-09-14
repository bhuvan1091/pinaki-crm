# Authentication testing
1. Login with admin@pinakisolutions.com / Pinaki@123 at POST /api/auth/login.
2. Reuse cookies for GET /api/auth/me.
3. Confirm dashboard and orders require authentication.
4. Confirm production, dispatch, and invoice stage locks return 409 when prerequisites are missing.