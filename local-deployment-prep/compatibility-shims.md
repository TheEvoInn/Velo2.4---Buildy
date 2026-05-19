# Local Compatibility Shims

Dormant logic layers prepared for local Ubuntu execution.

## 1. Filesystem Shim
- Maps cloud storage URLs to local absolute paths (`/opt/velo-2/data/storage/...`).
- Handles local file permissions and directory indexing.

## 2. Process Shim
- Interfaces with `systemd` or `pm2` to monitor backend service health.
- Handles restarts and auto-scaling of Galaxy Scanner workers.

## 3. AI Inference Shim
- Connects internal `invokeLLM` calls to local Ollama/LM Studio endpoints.
- Manages model switching and context window constraints.

## 4. Browser Automation Shim
- Manages local Chrome/Chromium instances for Galaxy Scanning.
- Handles headless mode, proxy rotation, and user-agent spoofing locally.

## 5. Scheduler Shim
- Maps cloud-based scheduled events to local cron jobs or systemd timers.
- Ensures continuity of background scanners and maintenance tasks.

## 6. Offline Registry
- Caches common research results to avoid redundant network calls.
- Provides fallback data when internet connectivity is limited.
