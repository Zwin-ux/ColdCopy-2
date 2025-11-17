import { OpenAI } from "openai";
import {
  targetScrapePrompt,
  signalExtractionPrompt,
  angleGenerationPrompt,
  templateAssemblyPrompt,
  toneAdapterPrompt,
  humanizerPrompt,
} from "../prompts";
import {
  TargetProfile,
  TargetSignals,
  OutreachAngles,
  EmailDraft,
  FinalEmail,
  DeliverabilityNote,
  StageLogEntry,
} from "../types";

export type Tone = "friendly" | "professional" | "aggressive" | "minimalist";
export type AngleKey = keyof OutreachAngles;

const DEFAULT_MODEL = "gpt-5.1-mini";

export type StageExecutor = (opts: {
  stage: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  model: string;
}) => Promise<string>;

const deliveryPatterns: Array<{
  matcher: RegExp;
  risk: DeliverabilityNote["riskLevel"];
  cues: string;
  recommends: string;
}> = [
  {
    matcher: /spam|filter|blocked|suspension|ai filters/i,
    risk: "high",
    cues: "Mentions spam or blocked inbox signals.",
    recommends: "Trim claims, avoid trigger words, and mention a trustworthy sender name.",
  },
  {
    matcher: /deliverability|inbox|gmail|compliance|filters/i,
    risk: "medium",
    cues: "Talks about inbox health or compliance.",
    recommends: "Lean into compliance proof and keep sentences concise to avoid AI flagging.",
  },
];

export const analyzeDeliverability = (signals: TargetSignals): DeliverabilityNote => {
  const text = `${signals.buying_reason} ${signals.credibility_hook} ${signals.emotional_hook}`;
  for (const pattern of deliveryPatterns) {
    if (pattern.matcher.test(text)) {
      return {
        riskLevel: pattern.risk,
        cues: pattern.cues,
        recommends: pattern.recommends,
      };
    }
  }
  return {
    riskLevel: "low",
    cues: "No obvious deliverability flags detected.",
    recommends: "Stay consistent, mention clean sender reputation, and monitor Gmail responses.",
  };
};

const logStage = (entry: StageLogEntry): void => {
  console.group(`Stage ${entry.stage}`);
  console.debug(entry.output);
  console.groupEnd();
};

const parseJson = <T>(raw: string): T => {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${raw}`);
  }
};

export interface PipelineOptions {
  apiKey?: string;
  model?: string;
  executor?: StageExecutor;
  onStageLog?: (entry: StageLogEntry) => void;
}

export class ColdCopyPipeline {
  private stageExecutor: StageExecutor;
  private model: string;
  constructor({ apiKey, model, executor, onStageLog }: PipelineOptions) {
    this.model = model ?? DEFAULT_MODEL;
    this.stageLogHook = onStageLog;
    if (executor) {
      this.stageExecutor = executor;
    } else {
      if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY for ColdCopy pipeline");
      }
      const client = new OpenAI({ apiKey });
      this.stageExecutor = async ({ stage, systemPrompt, userPrompt, temperature }) => {
        const response = await client.chat.completions.create({
          model: this.model,
          temperature,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        const payload = response.choices[0]?.message?.content?.trim();
        if (!payload) {
          throw new Error(`Empty response at stage ${stage}`);
        }
        return payload;
      };
    }
  }

  private stageLogHook?: (entry: StageLogEntry) => void;

  private async runStage<T>(
    stage: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    parser: (raw: string) => T
  ): Promise<T> {
    const payload = await this.stageExecutor({
      stage,
      systemPrompt,
      userPrompt,
      temperature,
      model: this.model,
    });
    const output = parser(payload);
    const logEntry: StageLogEntry = {
      stage,
      output: payload,
      timestamp: new Date().toISOString(),
    };
    logStage(logEntry);
    this.stageLogHook?.(logEntry);
    return output;
  }

  public async scrapeTarget(targetText: string): Promise<TargetProfile> {
    return this.runStage("Target Scrape", targetScrapePrompt, targetText, 0.15, (raw) =>
      parseJson<TargetProfile>(raw)
    );
  }

  public async extractSignals(profile: TargetProfile): Promise<TargetSignals> {
    const payload = `Target profile:\n${JSON.stringify(profile, null, 2)}`;
    return this.runStage("Signal Extraction", signalExtractionPrompt, payload, 0.3, (raw) =>
      parseJson<TargetSignals>(raw)
    );
  }

  public async generateAngles(signals: TargetSignals): Promise<OutreachAngles> {
    const payload = `Signals:\n${JSON.stringify(signals, null, 2)}`;
    return this.runStage("Angle Generation", angleGenerationPrompt, payload, 0.45, (raw) =>
      parseJson<OutreachAngles>(raw)
    );
  }

  private formatSignals(profile: TargetProfile, signals: TargetSignals): string {
    return `Profile:\n${JSON.stringify(profile, null, 2)}\nSignals:\n${JSON.stringify(signals, null, 2)}`;
  }

  public async buildTemplate(
    offer: string,
    selectedAngle: string,
    profile: TargetProfile,
    signals: TargetSignals,
    angleLabel: keyof OutreachAngles
  ): Promise<EmailDraft> {
    const payload = `Offer: ${offer}\nAngle (${angleLabel}): ${selectedAngle}\n${this.formatSignals(profile, signals)}`;
    return this.runStage("Template Assembly", templateAssemblyPrompt, payload, 0.42, (raw) => ({ body: raw }));
  }

  public async adaptTone(draft: EmailDraft, tone: Tone): Promise<EmailDraft> {
    const payload = `Tone: ${tone}\nEmail:\n${draft.body}`;
    return this.runStage("Tone Adapter", toneAdapterPrompt, payload, 0.5, (raw) => ({ body: raw }));
  }

  public async humanizeEmail(
    draft: EmailDraft,
    angleKey: keyof OutreachAngles,
    deliverability: DeliverabilityNote
  ): Promise<FinalEmail> {
    const payload = `Email:\n${draft.body}`;
    const body = await this.runStage("Humanizer", humanizerPrompt, payload, 0.55, (raw) => raw);
    return {
      body,
      meta: {
        selected_angle: angleKey,
        deliverability,
      },
    };
  }

  public async craftEmail(
    offer: string,
    tone: Tone,
    profile: TargetProfile,
    signals: TargetSignals,
    angles: OutreachAngles,
    angleKey: keyof OutreachAngles
  ): Promise<FinalEmail> {
    const selectedAngle = angles[angleKey];
    const deliverability = analyzeDeliverability(signals);
    const template = await this.buildTemplate(offer, selectedAngle, profile, signals, angleKey);
    const toned = await this.adaptTone(template, tone);
    return this.humanizeEmail(toned, angleKey, deliverability);
  }
}
