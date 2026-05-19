# Migration Export Plan (Final Readiness)

## Data Categories
1. **System Schemas**: All entity definitions from `/entities/`.
2. **Workflow Library**: Custom templates and decision rules.
3. **User Profiles**: Encrypted identity and mission data.
4. **Connector Profiles**: Configuration for local AI and external integrations.
5. **Black Box Records**: Historical logs and autopilot history.
6. **Secure Vault**: Encrypted secrets (requires master key transfer).

## Readiness Gate: Export/Restore Dry-Run
Before activation, a manual dry-run of the export process must be performed to verify local volume writability.
- **Target**: Local `/data/export/` directory on the Ubuntu host.
- **Verification**: Runner confirms checksum match for the generated bundle.
- **Safety**: No active data is modified on Buildy during this dry-run.
- **Evidence Packet**: A formal record must be created in the Readiness Center marking this category as 'Passed' after manual verification.
- **Proof Required**: Evidence of a successful non-destructive restore to a local dummy database. Summary must not include raw data or PII.
- **Safety**: No active data is modified on Buildy during this dry-run.

## Export Format
- JSON Bundles (encrypted).
- SQL Schema Scripts.
- File archive (TAR/GZ) for storage assets.

## Safety Controls
- Exports are **Manual Only**.
- No automated cloud-to-local syncing without explicit 'Authorize Transfer' command.
- PII (Personally Identifiable Information) can be scrubbed during export if selected.
- **Dry-Run Boundary**: Validation bundles contain only structure and sample records, never full production PII.
