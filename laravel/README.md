# Property Management — Laravel Backend

A Laravel API backend that mirrors the existing React + Supabase property management app.

## Structure

```
laravel/
├── app/
│   ├── Http/Controllers/Api/
│   │   ├── ContactController.php
│   │   ├── PropertyController.php
│   │   ├── LeaseController.php
│   │   ├── PaymentController.php
│   │   ├── RentReviewController.php
│   │   └── DashboardController.php
│   └── Models/
│       ├── Agency.php
│       ├── AgencyMember.php
│       ├── Contact.php
│       ├── Property.php
│       ├── Lease.php
│       ├── Payment.php
│       └── RentReview.php
├── database/migrations/
│   ├── 2026_09_01_000001_create_agencies_table.php
│   ├── 2026_09_01_000002_create_agency_members_table.php
│   ├── 2026_09_01_000003_create_contacts_table.php
│   ├── 2026_09_01_000004_create_properties_table.php
│   ├── 2026_09_01_000005_create_leases_table.php
│   ├── 2026_09_01_000006_create_payments_table.php
│   └── 2026_09_01_000007_create_rent_reviews_table.php
├── config/
│   ├── app.php
│   └── database.php
├── routes/
│   └── api.php
└── .env.example
```

## Setup

1. Install Laravel dependencies:
   ```bash
   composer create-project laravel/laravel . --prefer-dist
   # Then copy the files from this directory into the new project
   ```

2. Copy `.env.example` to `.env` and configure your database:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. Run migrations:
   ```bash
   php artisan migrate
   ```

4. Serve the API:
   ```bash
   php artisan serve
   ```

## API Endpoints

All routes are prefixed with `/api/v1`. Pass `agency_id` as a query parameter for list endpoints.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/stats` | Dashboard summary |
| GET | `/api/v1/contacts?type=landlord` | List contacts |
| POST | `/api/v1/contacts` | Create contact |
| GET | `/api/v1/contacts/{id}` | Show contact |
| PUT | `/api/v1/contacts/{id}` | Update contact |
| DELETE | `/api/v1/contacts/{id}` | Delete contact |
| GET | `/api/v1/properties` | List properties |
| POST | `/api/v1/properties` | Create property |
| GET | `/api/v1/properties/{id}` | Show property |
| PUT | `/api/v1/properties/{id}` | Update property |
| DELETE | `/api/v1/properties/{id}` | Delete property |
| GET | `/api/v1/leases` | List leases |
| POST | `/api/v1/leases` | Create lease |
| GET | `/api/v1/leases/{id}` | Show lease |
| PUT | `/api/v1/leases/{id}` | Update lease |
| DELETE | `/api/v1/leases/{id}` | Delete lease |
| GET | `/api/v1/payments` | List payments |
| POST | `/api/v1/payments` | Create payment |
| GET | `/api/v1/payments/{id}` | Show payment |
| PUT | `/api/v1/payments/{id}` | Update payment |
| DELETE | `/api/v1/payments/{id}` | Delete payment |
| GET | `/api/v1/rent-reviews` | List rent reviews |
| POST | `/api/v1/rent-reviews` | Create rent review |
| GET | `/api/v1/rent-reviews/{id}` | Show rent review |
| PUT | `/api/v1/rent-reviews/{id}` | Update rent review |
| DELETE | `/api/v1/rent-reviews/{id}` | Delete rent review |

## Notes

- All tables use UUID primary keys to match the existing Supabase schema.
- Properties include all management-gained, features, ownership, and fee fields.
- Leases include payment schedule, lease terms (periodic, GST, water), and internal notes.
- Controllers validate all fields and support search/filtering via query params.
- Configured for PostgreSQL by default (matching Supabase); MySQL is also supported.
