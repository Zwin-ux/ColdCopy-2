import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import helmet from "helmet";
import compression from "compression";
import { z } from "zod";
import { ColdCopyPipeline, Tone, AngleKey } from "../pipeline";
import { loadConfig } from "../config";
import {
  TargetProfile,
  TargetSignals,
  OutreachAngles,
  DeliverabilityNote,
  StageLogEntry,
  SearchSuggestion,
} from "../types";

dotenv.config();

const config = loadConfig();
const app = express();
const clientDist = path.join(__dirname, "../..", "client", "dist");

app.use(helmet({
  contentSecurityPolicy: false, // Disabled for simplicity with inline styles/scripts if any, can be tightened later
}));
app.use(compression());
app.use(express.json());
app.use(cors());
app.use(express.static(clientDist));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const toneEnum = z.enum(["friendly", "professional", "aggressive", "minimalist"]);
industry: z.string().nullable(),
  role: z.string().nullable(),
    company: z.string().nullable(),
      recent_achievements: z.string().nullable(),
        notable_products_or_services: z.string().nullable(),
          public_pain_points: z.string().nullable(),
            writing_tone: z.string().nullable(),
              values_or_preferences: z.string().nullable(),
});

const signalsSchema = z.object({
  buying_reason: z.string(),
  credibility_hook: z.string(),
  emotional_hook: z.string(),
});

const anglesSchema = z.object({
  value_angle: z.string(),
  curiosity_angle: z.string(),
  social_angle: z.string(),
});

const requestSchema = z.object({
  offer: z.string().min(5),
  targetText: z.string().min(5).optional(),
  tone: toneEnum,
  selectedAngle: angleEnum.optional(),
  cachedProfile: profileSchema.optional(),
  cachedSignals: signalsSchema.optional(),
  cachedAngles: anglesSchema.optional(),
});

const deliverabilitySchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]),
  cues: z.string(),
  recommends: z.string(),
});

const crmEntrySchema = z.object({
  offer: z.string().min(5),
  tone: toneEnum,
  research: z.object({
    profile: profileSchema,
    signals: signalsSchema,
    angles: anglesSchema,
    deliverability: deliverabilitySchema,
  }),
  email: z.object({
    body: z.string(),
    meta: z.object({
      selected_angle: angleEnum,
      deliverability: deliverabilitySchema,
    }),
  }),
});

const crmSchema = z.object({
  entries: z.array(crmEntrySchema).min(1),
});

const batchSchema = z.object({
  entries: z
    .array(
      z.object({
        offer: z.string().min(5),
        targetText: z.string().min(5),
        tone: toneEnum,
        selectedAngle: angleEnum.optional(),
      })
    )
    .min(1),
});

const serpSchema = z.object({
  query: z.string().min(3),
  company: z.string().min(2),
  context: z.string().min(5),
  keywords: z.array(z.string()).optional(),
});

type GenerationInput = {
  offer: string;
  tone: Tone;
  targetText?: string;
  selectedAngle?: z.infer<typeof angleEnum>;
  cachedProfile?: TargetProfile;
  cachedSignals?: TargetSignals;
  cachedAngles?: OutreachAngles;
};

const fallbackSuggestions: SearchSuggestion[] = [
  {
    type: "person",
    name: "Anika Li",
    role: "Revenue Operations Lead",
    detail: "Designs compliance-ready deliverability programs for fintech founders.",
    angles: ["value: reduce reporting time", "curiosity: board-ready inbox stats"],
  },
  {
    type: "concept",
    detail: "Many compliance teams cite Gmail filtering as their biggest blocker for scaling demos.",
    metrics: ["78% of Revenue Ops execs cite deliverability as a blocker"],
    angles: ["social: peers finally automate compliance proofs"],
  },
  {
    type: "metric",
    detail: "Boards demand a 2x reduction in inbox work to justify pipeline spend.",
    context: "Use this to highlight ROI/efficiency angles.",
  },
];

let lastSerpResponse:
  | {
    suggestions: SearchSuggestion[];
    timestamp: string;
    source?: string;
    fallback: boolean;
    query?: string;
  }
  | null = null;

const buildSerpResponse = (suggestions: SearchSuggestion[], opts: { fallback?: boolean; source?: string; query?: string }) => {
  const payload = {
    suggestions,
    timestamp: new Date().toISOString(),
    fallback: !!opts.fallback,
    source: opts.source,
    query: opts.query,
  };
  lastSerpResponse = payload;
  return payload;
};

const normalizeSuggestion = (raw: any): SearchSuggestion => ({
  type:
    raw.type && ["person", "concept", "metric"].includes(raw.type)
      ? (raw.type as SearchSuggestion["type"])
      : "concept",
  name: typeof raw.name === "string" ? raw.name : undefined,
  role: typeof raw.role === "string" ? raw.role : undefined,
  detail:
    typeof raw.detail === "string"
      ? raw.detail
      : typeof raw.summary === "string"
        ? raw.summary
        : "",
  source: typeof raw.source === "string" ? raw.source : undefined,
  metrics: Array.isArray(raw.metrics) ? raw.metrics.filter((entry) => typeof entry === "string") : undefined,
  angles: Array.isArray(raw.angles) ? raw.angles.filter((entry) => typeof entry === "string") : undefined,
  context: typeof raw.context === "string" ? raw.context : undefined,
});

const fallbackScoutSuggestions = [
  {
    name: "Callie Mercer",
    role: "Revenue Operations Lead",
    detail: "Leads compliance automation reviews for SaaS teams — (415) 555-0192",
  },
  {
    name: "Luis Ortega",
    role: "Compliance Program Manager",
    detail: "Runs deliverability health checks and policy documentation.",
  },
  {
    name: "Zoe Patel",
    role: "Head of GTM Enablement",
    detail: "Coordinates multi-channel playbooks and reports to the CRO.",
  },
];

const createSerpResponse = (suggestions: typeof fallbackScoutSuggestions, fallback = false) => ({
  suggestions,
  timestamp: new Date().toISOString(),
  fallback,
});

app.post("/api/serp", async (req, res) => {
  try {
    const payload = serpSchema.parse(req.body);
    if (!config.SERP_API_URL) {
      return res.json(createSerpResponse(fallbackScoutSuggestions, true));
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.SERP_API_KEY) {
      headers["x-api-key"] = config.SERP_API_KEY;
    }
    const response = await fetch(config.SERP_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`SERP provider responded with ${response.status}`);
    }
    const data = (await response.json()) as {
      suggestions?: { name: string; role: string; detail: string; source?: string }[];
      source?: string;
    };
    const suggestions = Array.isArray(data.suggestions) && data.suggestions.length
      ? data.suggestions
      : fallbackScoutSuggestions;
    res.json({ suggestions, timestamp: new Date().toISOString(), source: data.source ?? "serp", fallback: false });
  } catch (error) {
    console.error("/api/serp error", error);
    res.json(createSerpResponse(fallbackScoutSuggestions, true));
  }
});

const runPipeline = async (input: GenerationInput) => {
  const { offer, tone, selectedAngle, cachedProfile, cachedSignals, cachedAngles, targetText } =
    input;
  const useCache = cachedProfile && cachedSignals && cachedAngles;
  if (!useCache && !targetText) {
    throw new Error("Target text is required when no cached data is provided.");
  }

  const stageLog: StageLogEntry[] = [];
  const pipeline = new ColdCopyPipeline({
    apiKey: config.OPENAI_API_KEY,
    model: config.OPENAI_MODEL,
    onStageLog: (entry) => stageLog.push(entry),
  });

  const profile = cachedProfile ?? (await pipeline.scrapeTarget(targetText!));
  const signals = cachedSignals ?? (await pipeline.extractSignals(profile));
  const angles = cachedAngles ?? (await pipeline.generateAngles(signals));

  const angleKey = (selectedAngle ?? "value_angle") as AngleKey;
  const email = await pipeline.craftEmail(offer, tone, profile, signals, angles, angleKey);

  const deliverability = email.meta.deliverability;
  stageLog.push({
    stage: "Deliverability",
    output: `${deliverability.riskLevel} risk - ${deliverability.cues}`,
    timestamp: new Date().toISOString(),
  });

  return { profile, signals, angles, email, deliverability, stageLog };
};

const PORT = config.PORT;

const escapeCsv = (input: string) => `"${input.replace(/"/g, '""')}"`;

const crmHeaders = [
  "Offer",
  "Company",
  "Role",
  "Tone",
  "Angle",
  "Deliverability Risk",
  "Deliverability Cues",
  "Deliverability Recommendation",
  "Email Body",
];

const createCrmCsv = (
  entries: z.infer<typeof crmEntrySchema>[]
): string => {
  const rows = entries.map((entry) => {
    const angleLabel = entry.email.meta.selected_angle.replace("_", " ");
    return [
      entry.offer,
      entry.research.profile.company ?? "Unknown",
      entry.research.profile.role ?? "Unknown",
      entry.tone,
      angleLabel,
      entry.research.deliverability.riskLevel,
      entry.research.deliverability.cues,
      entry.research.deliverability.recommends,
      entry.email.body,
    ];
  });
  return [crmHeaders, ...rows]
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\n");
};

app.post("/api/generate", async (req, res) => {
  try {
    const payload = requestSchema.parse(req.body);
    const result = await runPipeline(payload);
    res.json({
      research: {
        profile: result.profile,
        signals: result.signals,
        angles: result.angles,
        deliverability: result.deliverability,
      },
      email: result.email,
      stageLog: result.stageLog,
    });
  } catch (error) {
    console.error("/api/generate error", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the email.",
    });
  }
});

app.post("/api/batch", async (req, res) => {
  try {
    const payload = batchSchema.parse(req.body);
    const exports = await Promise.all(
      payload.entries.map(async (entry) => {
        const result = await runPipeline(entry);
        return {
          research: {
            profile: result.profile,
            signals: result.signals,
            angles: result.angles,
            deliverability: result.deliverability,
          },
          email: result.email,
          stageLog: result.stageLog,
        };
      })
    );
    res.json({ exports });
  } catch (error) {
    console.error("/api/batch error", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while exporting the batch.",
    });
  }
});

app.post("/api/crm", (req, res) => {
  try {
    const payload = crmSchema.parse(req.body);
    const csv = createCrmCsv(payload.entries);
    res.header("Content-Type", "text/csv");
    res.send(csv);
  } catch (error) {
    console.error("/api/crm error", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while preparing CRM export.",
    });
  }
});

app.post("/api/serp", async (req, res) => {
  try {
    const payload = serpSchema.parse(req.body);
    const queryConfig = {
      query: payload.query,
      company: payload.company,
      context: payload.context,
      keywords: payload.keywords ?? [],
    };

    if (!config.SERP_API_URL) {
      return res.json(buildSerpResponse(fallbackSuggestions, { fallback: true, query: payload.query }));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.SERP_API_KEY) {
      headers["x-api-key"] = config.SERP_API_KEY;
    }

    const response = await fetch(config.SERP_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(queryConfig),
    });

    if (!response.ok) {
      throw new Error(`SERP provider responded with ${response.status}`);
    }

    const data = (await response.json()) as { suggestions?: any[]; source?: string };
    const suggestions =
      (Array.isArray(data.suggestions) && data.suggestions.length
        ? data.suggestions.map(normalizeSuggestion)
        : fallbackSuggestions) ?? fallbackSuggestions;

    return res.json(
      buildSerpResponse(suggestions, { source: data.source, query: payload.query })
    );
  } catch (error) {
    console.warn("/api/serp fallback", error);
    return res.json(buildSerpResponse(fallbackSuggestions, { fallback: true }));
  }
});

app.get("/api/serp/latest", (_, res) => {
  if (lastSerpResponse) {
    return res.json(lastSerpResponse);
  }
  res.json(buildSerpResponse(fallbackSuggestions, { fallback: true }));
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(clientDist, "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.info(`ColdCopy API listening on http://localhost:${PORT}`);
  });
}

export { app, runPipeline };
