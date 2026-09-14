# Pinaki Solutions CRM & OMS — Product Requirements Document

## Original Problem
Build a complete B2B CRM + Order Management System for Pinaki Solutions covering the entire lifecycle: Order Received → Design → Client Approval → Production → Dispatch → Challan → Delivery → Accounts → Invoice → Payment. Every department must operate on the same order record. No duplicate data entry.

## Architecture
- **Backend**: FastAPI + Motor (Async MongoDB) + GridFS for document storage
- **Frontend**: React 19 + Tailwind + Recharts + Sonner (toasts) + Lucide icons
- **Auth**: JWT httpOnly cookies (samesite=none, secure), bcrypt password hashing, brute-force lockout
- **Deployment**: Kubernetes ingress, backend on 8001, frontend on 3000, MongoDB local

## User Personas
- **Admin**: full access to every module
- **Sales / Account Manager**: clients, contacts, orders, communication
- **Design Team**: assigned orders, design versions, approvals
- **Production Team**: approved orders, production floor status
- **Dispatch Team**: production-completed orders, dispatch, challan, delivery
- **Accounts Team**: delivered orders, invoices, payments
- **Management**: read across everything + dashboards & reports

## Core Modules Built
- Dashboard with KPIs and 3 charts (revenue trend, stage counts, delivery pie)
- Clients directory + client-detail modal (linked orders)
- Contacts directory
- Orders list + full Order Detail with 10-stage timeline
- Order Detail tabs: Overview, Design, Approval, Production, Dispatch, Delivery, Invoice, Payment, Documents (GridFS upload/download), Activity/history audit
- Stage queues: Design, Approvals, Production, Dispatch, Challans, Delivery, Accounts
- Invoices module (auto payment status)
- Payments module
- Reports (revenue, top clients, top products, pipeline, avg cycle times)
- Users & Roles
- Global search (orders/clients/invoices/challans)
- In-app notifications with bell + unread count

## Business Rules Enforced
- No Production before `approval_status == "Approved"` (409 error)
- No Dispatch/Challan before `production_status == "Completed"` (409 error)
- No Invoice/Accounts before `delivery_status == "Delivered"` (409 error)
- Auto-challan on dispatch
- Auto-outstanding calculation from invoice - payments
- Every stage change writes to order history (audit trail)
- Notifications fire on order create / design shared / approval / production complete / dispatch / delivery / invoice

## Data Model (MongoDB collections)
- users, login_attempts (indexed email)
- clients, contacts
- orders (indexed order_id), history embedded
- designs, approvals
- dispatches, challans, deliveries
- invoices (indexed invoice_number), payments
- documents (metadata) + fs.files/fs.chunks (GridFS binaries)
- notifications

## Implemented (Feb 2026)
- [x] JWT auth + seeded users for all 7 roles
- [x] Complete lifecycle backend endpoints
- [x] Modular frontend (18 component files)
- [x] Order Detail with tabbed workflow + document upload
- [x] Dashboard w/ charts
- [x] Reports & analytics
- [x] Global search
- [x] Notifications bell
- [x] Client detail modal

## Backlog / Next
- P1: Email notifications (Resend/SendGrid integration)
- P1: PDF generation for challans/invoices
- P1: Advanced filters (date ranges, saved views)
- P2: CSV export from Reports
- P2: Client portal (external approval link)
- P2: Real object storage (S3) instead of GridFS

## Test Credentials
See `/app/memory/test_credentials.md`
