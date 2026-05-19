import { invokeLLM } from "@/integrations/core";
import { GalaxyScannerSource, VeloWorkflowTemplate, DecisionRule } from "@/entities";

export interface ExpansionResult {
  type: 'scanner_source' | 'workflow_template' | 'filter_rule' | 'general';
  message: string;
  createdId?: string;
}

const SCANNER_KEYWORDS = [
  "create scanner source", "add scanner source", "new scanner source",
  "add source", "create source", "register source", "scan source"
];

const WORKFLOW_KEYWORDS = [
  "save workflow", "create workflow template", "new workflow template",
  "save as workflow", "add workflow", "create playbook", "save playbook"
];

const FILTER_KEYWORDS = [
  "add filter", "create filter", "new filter", "add rule", "create rule",
  "filter out", "only show", "block", "skip", "ignore", "exclude"
];

function isScannerCommand(text: string) {
  const t = text.toLowerCase();
  return SCANNER_KEYWORDS.some(k => t.includes(k));
}

function isWorkflowCommand(text: string) {
  const t = text.toLowerCase();
  return WORKFLOW_KEYWORDS.some(k => t.includes(k));
}

function isFilterCommand(text: string) {
  const t = text.toLowerCase();
  return FILTER_KEYWORDS.some(k => t.includes(k));
}

export async function handleExpansionCommand(
  text: string,
  userEmail: string,
  userId: string
): Promise<ExpansionResult> {
  if (isScannerCommand(text)) {
    return createScannerSourceFromChat(text, userEmail, userId);
  }
  if (isWorkflowCommand(text)) {
    return createWorkflowTemplateFromChat(text, userEmail, userId);
  }
  if (isFilterCommand(text)) {
    return createFilterRuleFromChat(text, userEmail, userId);
  }
  return { type: 'general', message: "" };
}

async function createScannerSourceFromChat(
  text: string,
  userEmail: string,
  userId: string
): Promise<ExpansionResult> {
  try {
    const extracted = await invokeLLM({
      prompt: `Extract structured data for a Galaxy Scanner Source from the user's command.

User Command: "${text}"

Return a JSON object with these fields (infer reasonable defaults if missing):
- name: string (required, concise source name)
- department: string (one of: freelance, crypto, trade, market, commerce, general)
- source_type: string (one of: api, scraper, manual, feed)
- cost_mode: string (one of: free, paid, open-source)
- access_mode: string (one of: automatic, connector-ready, manual)
- status: string (default: testing)
- fallback_path: string (brief description of manual fallback)
- setup_notes: string (any setup instructions inferred)
- metadata: object (any extra inferred config)

If the command is too vague, return { "error": "vague" }`,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          department: { type: "string" },
          source_type: { type: "string" },
          cost_mode: { type: "string" },
          access_mode: { type: "string" },
          status: { type: "string" },
          fallback_path: { type: "string" },
          setup_notes: { type: "string" },
          metadata: { type: "object" },
          error: { type: "string" }
        }
      }
    });

    if (extracted?.error === "vague" || !extracted?.name) {
      return {
        type: 'scanner_source',
        message: `I need a bit more detail to create a scanner source. Try: "Create a scanner source called [Name] for [Department] of type [API/Scraper]".`
      };
    }

    const created = await GalaxyScannerSource.create({
      name: extracted.name,
      department: extracted.department || "general",
      source_type: extracted.source_type || "manual",
      cost_mode: extracted.cost_mode || "free",
      access_mode: extracted.access_mode || "manual",
      status: extracted.status || "testing",
      fallback_path: extracted.fallback_path || "Manual fallback not specified.",
      setup_notes: extracted.setup_notes || "",
      confidence: 0.5,
      metadata: {
        ...extracted.metadata,
        created_from_chat: true,
        creator_email: userEmail
      }
    });

    return {
      type: 'scanner_source',
      message: `Scanner source **${created.name}** created successfully.\n- Department: ${created.department}\n- Type: ${created.source_type}\n- Status: ${created.status}\n- ID: \`${created.id}\``,
      createdId: created.id
    };
  } catch (err) {
    console.error("[Expansion] Scanner source creation failed:", err);
    return {
      type: 'scanner_source',
      message: "I ran into an issue creating the scanner source. Please check your command and try again."
    };
  }
}

async function createWorkflowTemplateFromChat(
  text: string,
  userEmail: string,
  userId: string
): Promise<ExpansionResult> {
  try {
    const extracted = await invokeLLM({
      prompt: `Extract structured data for a Workflow Template from the user's command.

User Command: "${text}"

Return a JSON object with these fields (infer reasonable defaults if missing):
- name: string (required, concise template name)
- department: string (e.g., Command Officer, Freelance Station, Commerce Hub)
- workflow_type: string (e.g., proposal_drafting, task_decomposition, outreach_sequence)
- trigger_context: string (when should this template be suggested?)
- safe_execution_mode: string (one of: staged_packet, local_browser_assist, manual_submit)
- steps: array of objects with { title: string, mode: string } (mode: auto, manual, review)
- required_inputs: array of strings
- notes: string
- metadata: object (any extra inferred config)

If the command is too vague, return { "error": "vague" }`,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          department: { type: "string" },
          workflow_type: { type: "string" },
          trigger_context: { type: "string" },
          safe_execution_mode: { type: "string" },
          steps: { type: "array", items: { type: "object" } },
          required_inputs: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
          metadata: { type: "object" },
          error: { type: "string" }
        }
      }
    });

    if (extracted?.error === "vague" || !extracted?.name) {
      return {
        type: 'workflow_template',
        message: `I need a bit more detail to save a workflow template. Try: "Save a workflow template called [Name] for [Department] with steps: 1. ..., 2. ...".`
      };
    }

    const created = await VeloWorkflowTemplate.create({
      name: extracted.name,
      department: extracted.department || "Command Officer",
      workflow_type: extracted.workflow_type || "general",
      trigger_context: extracted.trigger_context || "User-requested workflow",
      safe_execution_mode: extracted.safe_execution_mode || "staged_packet",
      steps: Array.isArray(extracted.steps) ? extracted.steps : [],
      required_inputs: Array.isArray(extracted.required_inputs) ? extracted.required_inputs : [],
      notes: extracted.notes || "Created from chat command.",
      status: "draft",
      metadata: {
        ...extracted.metadata,
        created_from_chat: true,
        creator_email: userEmail
      }
    });

    return {
      type: 'workflow_template',
      message: `Workflow template **${created.name}** saved successfully.\n- Department: ${created.department}\n- Type: ${created.workflow_type}\n- Status: ${created.status}\n- Steps: ${Array.isArray(created.steps) ? created.steps.length : 0}\n- ID: \`${created.id}\``,
      createdId: created.id
    };
  } catch (err) {
    console.error("[Expansion] Workflow template creation failed:", err);
    return {
      type: 'workflow_template',
      message: "I ran into an issue saving the workflow template. Please check your command and try again."
    };
  }
}

async function createFilterRuleFromChat(
  text: string,
  userEmail: string,
  userId: string
): Promise<ExpansionResult> {
  try {
    const extracted = await invokeLLM({
      prompt: `Extract structured data for a Decision Rule from the user's command.

User Command: "${text}"

Return a JSON object with these fields (infer reasonable defaults if missing):
- name: string (required, concise filter name like "Skip low-budget gigs")
- department: string (one of: freelance, galaxy-scanner, commerce, general)
- trigger: string (condition trigger, e.g., "BUDGET_BELOW_500")
- logic: string (human-readable logic, e.g., "Opportunity payout is below $500")
- action: string (one of: BLOCK, STAGE, NOTIFY, FLAG)
- risk_level: string (one of: low, medium, high)
- metadata: object (any extra inferred config like min_amount, keywords, etc.)

If the command is too vague, return { "error": "vague" }`,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          department: { type: "string" },
          trigger: { type: "string" },
          logic: { type: "string" },
          action: { type: "string" },
          risk_level: { type: "string" },
          metadata: { type: "object" },
          error: { type: "string" }
        }
      }
    });

    if (extracted?.error === "vague" || !extracted?.name) {
      return {
        type: 'filter_rule',
        message: `I need more detail to create a filter. Try: "Add a filter to skip gigs under $250" or "Create a rule to block anything requiring a degree".`
      };
    }

    const created = await DecisionRule.create({
      name: extracted.name,
      department: extracted.department || "general",
      trigger: extracted.trigger || "MANUAL_REVIEW",
      logic: extracted.logic || extracted.name,
      action: extracted.action || "STAGE",
      risk_level: extracted.risk_level || "low",
      is_active: true,
      metadata: {
        ...extracted.metadata,
        created_from_chat: true,
        creator_email: userEmail
      }
    });

    return {
      type: 'filter_rule',
      message: `Filter rule **${created.name}** created successfully.\n- Department: ${created.department}\n- Action: ${created.action}\n- Risk: ${created.risk_level}\n- ID: \`${created.id}\``,
      createdId: created.id
    };
  } catch (err) {
    console.error("[Expansion] Filter rule creation failed:", err);
    return {
      type: 'filter_rule',
      message: "I ran into an issue creating the filter rule. Please try again with more detail."
    };
  }
}
