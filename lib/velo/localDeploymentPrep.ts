/**
 * VELO 2.0 Local Deployment Preparation Library
 * 
 * Provides static checks and informational data for the Migration Readiness dashboard.
 * This logic is dormant and does not perform active migrations.
 */

export interface ReadinessCheck {
  id: string;
  category: "environment" | "compatibility" | "dependency" | "resource" | "export" | "shim";
  label: string;
  description: string;
  status: "ready" | "needs_config" | "blocked" | "info";
  requirement?: string;
}

export interface DeploymentBlueprint {
  title: string;
  items: string[];
}

export const migrationReadinessChecks: ReadinessCheck[] = [
  {
    id: "os-target",
    category: "environment",
    label: "OS Target Blueprint",
    description: "Ubuntu 24.04 LTS compatibility planning.",
    status: "ready",
    requirement: "Standard Ubuntu Server install"
  },
  {
    id: "local-storage",
    category: "compatibility",
    label: "Local Storage Shim",
    description: "Filesystem path mapping for local data.",
    status: "ready",
    requirement: "/opt/velo-2/data mount point"
  },
  {
    id: "local-ai",
    category: "dependency",
    label: "Local AI Integration",
    description: "Ollama / LM Studio connection templates.",
    status: "needs_config",
    requirement: "Requires local Ollama installation"
  },
  {
    id: "db-migration",
    category: "export",
    label: "Database Export Layer",
    description: "Schema and data export snapshot logic.",
    status: "info",
    requirement: "Manual trigger only"
  },
  {
    id: "proc-management",
    category: "shim",
    label: "Process Management",
    description: "Systemd / PM2 service templates.",
    status: "ready",
    requirement: "Ubuntu service management"
  },
  {
    id: "offline-logic",
    category: "compatibility",
    label: "Offline Mode Logic",
    description: "Free-First directive for disconnected operation.",
    status: "ready"
  },
  {
    id: "resource-analysis",
    category: "resource",
    label: "Hardware Requirements",
    description: "CPU/RAM analysis for local inference.",
    status: "info",
    requirement: "Recommended: 16GB RAM + 8 vCPU"
  }
];

export const dependencyMap = [
  { cloud: "Superdev Functions", local: "Deno / Node.js Runtime", status: "mapped" },
  { cloud: "Superdev Entities", local: "PostgreSQL 16", status: "mapped" },
  { cloud: "invokeLLM (GPT-4)", local: "Ollama / LM Studio", status: "configured" },
  { cloud: "Superdev Storage", local: "Local Filesystem", status: "mapped" },
  { cloud: "Superdev Auth", local: "Local JWT Service", status: "planned" }
];

export const getMigrationStatus = () => {
  const needsConfig = migrationReadinessChecks.filter(c => c.status === "needs_config").length;
  const blocked = migrationReadinessChecks.filter(c => c.status === "blocked").length;
  
  if (blocked > 0) return { label: "Migration Blocked", color: "text-red-400", percent: 60 };
  if (needsConfig > 0) return { label: "Config Required", color: "text-amber-400", percent: 85 };
  return { label: "Ready for Transfer", color: "text-emerald-400", percent: 100 };
};

export const dryRunVerificationSteps = [
  { id: "dr-db", label: "Restore Schema", description: "Validate Postgres schema injection.", status: "queued" },
  { id: "dr-comm", label: "Mock Handshake", description: "Test provider adapter sandbox.", status: "queued" },
  { id: "dr-fs", label: "Audit Log Write", description: "Verify /logs write permissions.", status: "queued" },
  { id: "dr-halt", label: "Kill Switch Test", description: "Simulate emergency halt event.", status: "prepared" }
];

export const optimizationRoadmap = [
  { id: "opt-perf", label: "Telemetry Caching", category: "Performance", priority: "Medium" },
  { id: "opt-safe", label: "Secret Redaction", category: "Safety", priority: "Critical" },
  { id: "opt-ux", label: "Plain Review Center", category: "UX", priority: "High" }
];

export const ubuntuFolderBlueprint: DeploymentBlueprint[] = [
  {
    title: "System Roots",
    items: ["/opt/velo-2/bin", "/opt/velo-2/config", "/opt/velo-2/services"]
  },
  {
    title: "Data Vaults",
    items: ["/opt/velo-2/data/db", "/opt/velo-2/data/storage", "/opt/velo-2/data/models"]
  },
  {
    title: "Log Arks",
    items: ["/opt/velo-2/logs/system", "/opt/velo-2/logs/blackbox", "/opt/velo-2/exports"]
  }
];
