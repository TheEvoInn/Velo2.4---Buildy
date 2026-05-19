

import { 
  Zap, 
  Cpu, 
  Cloud, 
  Lock, 
  Bot,
  Terminal,
} from "lucide-react";

export interface AutonomyTier {
  id: string;
  tier: number;
  label: string;
  friendlyLabel: string;
  description: string;
  friendlyDescription: string;
  capability: string;
  friendlyCapability: string;
  status: 'active' | 'setup-required' | 'queued';
  icon: any;
  color: string;
  tools?: {
    name: string;
    url: string;
    description: string;
  }[];
}

export const AUTONOMY_TIERS: AutonomyTier[] = [
  {
    id: "buildy_active",
    tier: 1,
    label: "Built-in AI",
    friendlyLabel: "Buildy Cloud",
    description: "Cloud-based intelligence for quick research and planning.",
    friendlyDescription: "Everything you need to plan and research, hosted by Buildy.",
    capability: "Planning, research, and multi-step drafts.",
    friendlyCapability: "Standard research and drafting.",
    status: "active",
    icon: Bot,
    color: "text-sky-400",
  },
  {
    id: "local_desktop_ai",
    tier: 2,
    label: "Desktop AI Helper",
    friendlyLabel: "Optional Desktop AI",
    description: "Connect your own computer for private, high-volume tasks.",
    friendlyDescription: "Connect your computer to keep your AI tasks private and run them for free.",
    capability: "Privacy-focused drafting and high-volume data processing.",
    friendlyCapability: "Private drafting and fast processing.",
    status: "setup-required",
    icon: Cpu,
    color: "text-amber-400",
    tools: [
      { name: "Ollama", url: "https://ollama.com", description: "Easy-to-use local AI app." },
      { name: "LM Studio", url: "https://lmstudio.ai", description: "Visual local model app." },
      { name: "LocalAI", url: "https://localai.io", description: "Advanced local AI alternative." },
      { name: "AnythingLLM", url: "https://anythingllm.com", description: "Desktop AI workspace." },
      { name: "Open WebUI", url: "https://openwebui.com", description: "Professional local interface." }
    ]
  },
  {
    id: "self_hosted_cloud",
    tier: 3,
    label: "Advanced Tools",
    friendlyLabel: "Advanced Hosted Tools",
    description: "Connect your own automation and custom workflow tools.",
    friendlyDescription: "Connect professional automation tools if you already use them.",
    capability: "Advanced automation using your own hosted tools.",
    friendlyCapability: "Custom automation workflows.",
    status: "setup-required",
    icon: Cloud,
    color: "text-purple-400",
    tools: [
      { name: "n8n", url: "https://n8n.io", description: "Visual workflow automation." },
      { name: "Flowise", url: "https://flowiseai.com", description: "Drag-and-drop AI agent builder." },
      { name: "Langflow", url: "https://www.langflow.org", description: "Visual IDE for AI pipelines." },
      { name: "ComfyUI", url: "https://github.com/comfyanonymous/ComfyUI", description: "Professional image generation." }
    ]
  },
  {
    id: "ubuntu_queued",
    tier: 4,
    label: "Real-World Review",
    friendlyLabel: "Real-World Actions",
    description: "Secure actions that stay queued for your personal review.",
    friendlyDescription: "Any action that involves other websites will always wait for your approval.",
    capability: "Platform tasks and automated steps that always wait for you.",
    friendlyCapability: "Secure steps that wait for you.",
    status: "queued",
    icon: Terminal,
    color: "text-emerald-400",
    tools: [
      { name: "Playwright", url: "https://playwright.dev", description: "Browser automation engine." },
      { name: "browser-use", url: "https://github.com/browser-use/browser-use", description: "AI browser assistant." }
    ]
  }
];

export const getTierById = (id: string) => AUTONOMY_TIERS.find(t => t.id === id);
