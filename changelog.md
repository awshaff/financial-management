# Changelog

## [2026-03-08] — Frontend: Installment Payment Mode UI

### Added
- **Payment mode toggle** in the Add Expense form — checkbox to switch between Lump Sum (default, unchecked) and Installment Payment (checked)
- **Installment months input** — appears when installment is selected, accepts 2–60 months
- **Per-month preview card** — shows total amount, per-month amount, and per-month cashback/net when applicable
- **Installment badge** in the expense list — both desktop table and mobile card views show `"N/M"` badge (e.g., `2/12`) next to the merchant name for installment expenses
- **Edit mode restrictions** — amount field is disabled with an explanatory note for installment expenses; installment toggle is hidden in edit mode

### Changed
- `Expense` and `CreateExpenseInput` types updated with `paymentMode`, `installmentGroupId`, `installmentMonths`, `installmentNumber` fields
- Cashback preview card now only shows for lump-sum expenses to avoid duplication with the installment preview

## [2026-03-08] — Installment / Lump-Sum Payment Mode

### Added
- **Payment mode selection** — when creating an expense, users can now choose between `lump_sum` (default, existing behavior) or `installment`
- **Installment expansion** — installment expenses are expanded into N individual expense rows, each representing one monthly payment, linked by a shared `installmentGroupId`
- **New schema columns** on `expenses` table:
  - `payment_mode` (`lump_sum` | `installment`)
  - `installment_group_id` (UUID, shared across group)
  - `installment_months` (total installments, 2–60)
  - `installment_number` (this row's position: 1 of N)
- **Database index** on `installment_group_id` for efficient group lookups
- **CHECK constraints** for `installment_months` (2–60) and `installment_number` (1–N)
- **Group operations**:
  - `PATCH /api/expenses/:id` on an installment propagates merchant/category/payment changes to all rows in the group
  - `DELETE /api/expenses/:id` on an installment removes all rows in the group
  - `POST /api/expenses/bulk-delete` auto-expands installment groups
- **Installment context** on `GET /api/expenses/:id` — returns sibling installment details when viewing an installment row
- **Filter by payment mode** — `GET /api/expenses?paymentMode=installment`
- **Demo seed data** — 2 sample installment groups (Samsung laptop 12mo, Apple phone 6mo)
- **Drizzle migration** `0002_woozy_spencer_smythe.sql`

### Changed
- Amount changes blocked for installment expenses (`PATCH` returns 400) — must delete and recreate
- Excel import explicitly sets `paymentMode = 'lump_sum'`
- Dashboard queries require **no changes** — each installment row is a self-contained expense row with its month's amount, so existing `SUM()` aggregations work correctly
