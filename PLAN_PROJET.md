# Home Service Platform - Backend Execution Plan (Locked Requirements)

## 1. Scope And Deadline
- Scope: backend only.
- Functional scope: all use cases from both UML diagrams.
- Delivery pressure: first usable MVP expected by tomorrow.
- Language: English only.

## 2. Domain And Role Model

## 2.1 User Model Rules
- One physical table for users.
- A provider is also a client.
- A client is only a client.
- An admin is only an admin.
- First admin is seeded, then admins can create other admins.

## 2.2 Recommended Implementation Shape (Single User Table)
- `isAdmin: boolean`
- `isProvider: boolean`
- If `isAdmin = true`, then `isProvider = false` (admin-only account).
- If `isAdmin = false` and `isProvider = true`, user is provider+client.
- If `isAdmin = false` and `isProvider = false`, user is client-only.

## 2.3 Access Policy
- Suspended users are fully banned from the platform.
- Auth endpoints return unauthorized with explicit banned message for suspended users.

## 3. Technical Stack
- Framework: NestJS.
- ORM: TypeORM.
- Database for MVP: SQLite.
- API style: REST.
- API versioning: `/api/v1`.
- API docs: Swagger enabled.
- Response format: standardized wrapper for success and error.
- Data lifecycle: soft delete for all domain entities.

## 4. Authentication And Account Security

## 4.1 Login And Tokens
- Login identifier: email or phone number + password.
- Token strategy: access token + refresh token.
- Signup requires email verification.
- Forgot/reset password flow required.

## 4.2 Password Policy
- Minimum 8 characters.
- At least one uppercase.
- At least one lowercase.
- At least one number.
- At least one special character.

## 4.3 Brute Force Protection
- Account lock for 5 minutes after failed login attempts threshold.
- Threshold: 5 failed attempts.

## 4.4 Age Constraint
- Minimum age is 18 years.

## 5. Core Functional Modules
- auth
- users
- admin
- categories
- sub-categories
- services
- service-requests
- reviews
- documents
- notifications (email)
- audit-logs

## 6. Entity-Level Requirements

## 6.1 Users
Required fields include:
- name
- email
- phoneNumber
- passwordHash
- dateOfBirth
- address
- imageUrl (optional)
- isAdmin
- isProvider
- isSuspended

Provider-specific state:
- providerValidationStatus: pending, validated, rejected, suspended

## 6.2 Categories And Sub-Categories
- Admin-only CRUD.
- Soft delete only.
- Each sub-category belongs to exactly one category.
- Category ordering supported.
- Deactivating a category deactivates related sub-categories and services.

## 6.3 Services
- Only validated providers can create/update services.
- Required: title, description, category, sub-category, region.
- Pricing modes: fixed, hourly, free.
- Service images supported.
- Hidden/inactive services are excluded from public search.
- Soft delete only.

## 6.4 Documents
- Used for provider verification.
- Accepted types: ID card, diploma, and license (if category/job requires it).
- Minimum required documents: 1.
- Allowed file formats: PDF and image.
- Max file size: 5 MB.
- Files stored locally for MVP.
- Documents are private and visible only to authorized users.

## 6.5 Service Requests (Missions)
- Client creates request for a service (not directly for provider).
- Required fields: date, location, notes.
- Status history must be timestamped.

## 6.6 Reviews
- Optional.
- One review per mission max.
- Allowed only when mission is completed.
- Score + text required on creation.
- Client can edit text later, but not score.
- Admin moderation is hide-only (no hard delete).
- If a provider reaches 5 hidden reviews, provider is auto-suspended.

## 6.7 Notifications
- Channel for MVP: email.
- Notify on all important flow transitions (request and mission lifecycle).

## 6.8 Audit Logs
- Keep rejection logs for provider document reviews.
- Keep moderation and suspension action logs.

## 7. Search And Listing Requirements
- Filters: métier, region, category, sub-category, price range, rating.
- Free-text search required.
- Pagination required.
- Sorting required.
- Exclude:
  - suspended providers
  - hidden services
  - deactivated categories/sub-categories/services

## 8. Service Request Workflow Rules

## 8.1 Ownership And Permissions
- Only clients create requests.
- Request references service; provider is inferred from service owner.

## 8.2 Cancellation Rules
- Client can cancel only when status is pending.
- Provider can cancel at any stage.

## 8.3 Provider-Initiated Status Changes
- If provider proposes a status change, client confirmation is required before finalizing.

## 8.4 Conflict System
- On disputed updates, create conflict case.
- Admin resolves conflict manually after both sides provide proof.
- Track conflict losses per user.
- If a user loses 5 conflicts, auto-suspend that user.

## 9. Suggested Status Enums

## 9.1 Service Request Status
- pending
- accepted
- in_progress
- completed
- refused
- cancelled_by_client
- cancelled_by_provider
- disputed
- resolved

## 9.2 Provider Validation Status
- pending
- validated
- rejected
- suspended

## 10. API Conventions
- Prefix: `/api/v1`.
- Auth required for private routes.
- Role/permission guards required.
- Standard response envelope, for example:
  - success: `{ success: true, message, data }`
  - error: `{ success: false, message, errors }`

## 11. Non-Functional Rules
- Architecture style: modular NestJS, SOLID, clean patterns, avoid over-engineering.
- Team workflow: feature-by-feature implementation.
- Git workflow: module-based development.
- Local storage only for now (no cloud infra required in MVP).

## 12. Testing Strategy (Current Decision)
- Immediate phase: manual testing first.
- Quality target kept as 90% (to be enforced with automated tests in follow-up phase).
- Swagger used to validate flows quickly during MVP delivery.

## 13. MVP Build Order (To Start Coding Now)

## Phase A - Foundation
- Set up TypeORM + SQLite.
- Define base entities with soft delete and timestamps.
- Add common response/error handling.
- Configure Swagger and `/api/v1` prefix.

## Phase B - Auth And User Security
- Register/login (email or phone).
- Access + refresh tokens.
- Email verification and password reset.
- Failed login counter + 5-minute lock.
- Suspension and banned login message.

## Phase C - Admin And Taxonomy
- Seed first admin.
- Admin creates other admins.
- Category/sub-category CRUD + ordering + soft delete.

## Phase D - Provider Flow
- Provider profile completion.
- Document upload and validation by admin.
- Rejection logging and re-upload support.

## Phase E - Service Marketplace
- Provider service CRUD (validated providers only).
- Search with filters, pagination, sorting, and free-text.

## Phase F - Requests, Conflicts, Reviews, Notifications
- Service request lifecycle and cancellation rules.
- Provider-proposed status confirmation by client.
- Conflict creation/resolution and auto-suspension on 5 losses.
- Reviews (one per mission, text editable only).
- Hide moderation and auto-suspension on 5 hidden reviews.
- Email notifications for lifecycle events.

## 14. Done Criteria For Each Module
- Business rules implemented.
- Guarded authorization implemented.
- Swagger routes documented.
- Manual test scenarios passed.
- No hard delete on business entities.

---
This document is now the final backend contract for implementation.
