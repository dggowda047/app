# PropConsult CRM — Product Requirements Document

## Original Problem Statement
Production-ready Property Consultant CRM for brokers managing properties (Sale/Purchase/Rent/Lease across Residential/Commercial/Land), customers, requirements, property↔customer matching, follow-ups, deal pipeline, consultant-to-consultant sharing, notifications, property photos, Bin, and dashboard analytics. Journey: PROPERTY → CUSTOMER → FOLLOW-UP → DEAL → WIN/LOSS.

## Stack / Architecture
- Frontend: React (CRA) + Tailwind + shadcn/ui + react-router. Mobile-first (bottom nav + FAB), tablet, desktop (sidebar).
- Backend: FastAPI, all routes under `/api`. Bearer JWT auth (30-day).
- DB: MongoDB (motor). Collections: users, otps, properties (photos embedded), customer_property (M2M), customers, followups, deals, property_shares, notifications, locations.
- Storage: Emergent object storage for property + profile photos; served via `/api/files/{path}?auth=token`.
- Auth: Phone + OTP in DEMO mode (OTP returned in API response / shown as toast). Single consultant login experience.

## User Personas
- Property consultant/broker (single role). Multi-user with per-owner data isolation enforced server-side.

## Core Requirements (static)
- Phone+OTP login, first-time onboarding sliders, profile avatar menu (Profile, Notifications, Shared Properties, Bin, Settings, More, Logout).
- 4 clickable dashboard KPIs from live DB. Multi-step property wizard with persistent photo upload, lightbox viewer, review-before-save. Many-to-many customer↔property. Follow-ups + 8-stage deal pipeline. Consultant sharing by phone with per-share commission + green shared tick. Soft-delete Bin with restore + permanent delete. Indian currency (₹0–50 Cr) dual sliders.

## Implemented (2026-06)
- [x] Phase 1: Auth (phone OTP demo, JWT), profile, nav shell, navy/white design system.
- [x] Phase 2: Property CRUD, 4-step wizard, categories/subcategories/locations/amenities, photo upload+gallery+lightbox+reorder+primary, soft delete.
- [x] Phase 3: Customer CRUD, requirement structure, budget, many-to-many linking, matching properties, soft delete (keeps linked properties).
- [x] Phase 4: Follow-ups (create/complete/reschedule/cancel), Deal pipeline kanban (8 stages), live pipeline value.
- [x] Phase 5: Consultant sharing by phone, per-share commission, notifications, accept/keep, green shared tick, Shared With / consultant details, Shared Properties screen.
- [x] Phase 6: Bin (properties+customers), restore, permanent delete, server-side ownership authorization.
- [x] Phase 7: Dashboard real KPIs, search/filters, empty/loading states, notifications unread badge, responsive nav.
- Tested: 53/53 backend API tests pass; 100% critical frontend flows pass.

## Backlog / Remaining (P1/P2)
- P1: Namespace file-serve by owner prefix validation; duplicate storage objects on share-accept (currently shares storage_path reference).
- P2: Split server.py into routers; migrate to FastAPI lifespan; JWT refresh/revocation; real SMS OTP (Twilio) toggle; drag-drop kanban; pagination UI / infinite scroll.

## Next Tasks
- Await user feedback after first review; prioritize real SMS, drag-drop pipeline, or richer dashboard analytics as requested.
