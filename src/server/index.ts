import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
import { ColdCopyPipeline, Tone, AngleKey } from "../pipeline";
import { loadConfig } from "../config";
import {
  TargetProfile,
  TargetSignals,
  OutreachAngles,
  DeliverabilityNote,
  StageLogEntry,
} from "../types";

dotenv.config();

const config = loadConfig();
const app = express();
app.use(express.json());
app.use(cors());

const toneEnum = z.enum(["friendly", "professional", "aggressive", "minimalist"]);
const angleEnum = z.enum(["value_angle", "curiosity_angle", "social_angle"]);

const profileSchema = z.object({
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

type GenerationInput = {
  offer: string;
  tone: Tone;
  targetText?: string;
  selectedAngle?: z.infer<typeof angleEnum>;
  cachedProfile?: TargetProfile;
  cachedSignals?: TargetSignals;
  cachedAngles?: OutreachAngles;
};

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

app.get("/", (_, res) => {
  res.send({ status: "ColdCopy backend ready" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.info(`ColdCopy API listening on http://localhost:${PORT}`);
  });
}

export { app, runPipeline };
