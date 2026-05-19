# Local Database Migration Plan

This plan outlines the dormant migration of entity data to a local PostgreSQL 16 environment. **No active migration is running.**

## Database Engine
- **Primary**: PostgreSQL 16 (Relational + JSONB support)
- **Migration Tooling**: Custom Deno scripts in `/scripts/db/`

## Migration Phases (Dormant)

### 1. Schema Inventory & Generation
Map all `/entities/*.json` files to SQL tables.
- **Columns**: `id`, `created_at`, `updated_at`, `created_by` + domain fields.
- **JSONB Fallback**: Complex objects stored in JSONB columns for flexibility.

### 2. Data Transformation
Convert Superdev JSON exports to SQL INSERT statements.
- **Profiles**: Identity, platform profiles, and connectors.
- **Missions**: Active missions, steps, and logs.
- **Operations**: Trade records, freelance jobs, market signals.
- **Security**: Audit logs and vault item metadata (non-secret).

### 3. Encrypted Vault Migration
- Vault items are re-encrypted using the local host key.
- Raw secrets are never written to disk during the transition.

### 4. Integrity & Validation
- **Dry-Run**: Simulate migration without writing to the final database.
- **Checksums**: Verify data integrity post-migration.
- **Rollback**: Scripted `DROP TABLE` and `TRUNCATE` operations for safety.

## Seeding
Essential system records (Workflow Templates, Decision Rules) are pre-seeded to ensure the platform is functional immediately upon activation.

## Maintenance
- **Backups**: Nightly `pg_dump` to `/opt/velo-2/exports/`.
- **Optimization**: Periodic `VACUUM ANALYZE` for performance.
