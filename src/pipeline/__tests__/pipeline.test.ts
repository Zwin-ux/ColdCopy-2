import { describe, it, expect, vi } from "vitest";
import { ColdCopyPipeline, StageExecutor, Tone } from "../index";
import type { OutreachAngles, TargetProfile, TargetSignals } from "../../types";

const profileResponse = JSON.stringify({
  industry: "SaaS",
  role: "Revenue Ops",
  company: "SignalLoop",
  recent_achievements: null,
  notable_products_or_services: "deliverability monitoring",
  public_pain_points: "manual reporting",
  writing_tone: "concise",
  values_or_preferences: "privacy-first",
});

const signalsResponse = JSON.stringify({
  buying_reason: "They need a reliable pulse on deliverability before their next launch.",
  credibility_hook: "SignalLoop is the only vendor the board trusts for compliance-aware data.",
  emotional_hook: "Their ops team is burned out by manual spreadsheets.",
});

const anglesResponse = JSON.stringify({
  value_angle: "Cut the weekly report time by half and keep Gmail climates friendly.",
  curiosity_angle: "What if you could tell the board you fixed inbox health in two meetings?",
  social_angle: "Revenue Ops folks I know are finally automating compliance-first signals.",
});

describe("ColdCopyPipeline", () => {
  it("walks through every stage and exposes the selected angle", async () => {
    const responses = [
      profileResponse,
      signalsResponse,
      anglesResponse,
      "draft email line 1\nline 2",
      "toned draft",
      "humanized final",
    ];
    const executor = vi.fn(async () => responses.shift()!);
    const pipeline = new ColdCopyPipeline({
      apiKey: "test",
      executor: executor as unknown as StageExecutor,
    });

    const profile = await pipeline.scrapeTarget("target copy");
    expect(profile.industry).toBe("SaaS");

    const signals = await pipeline.extractSignals(profile);
    expect(signals.buying_reason).toContain("deliverability");

    const angles = await pipeline.generateAngles(signals);
    expect(angles.social_angle).toContain("Revenue Ops");

    const finalEmail = await pipeline.craftEmail(
      "Offer",
      "friendly" satisfies Tone,
      profile,
      signals,
      angles,
      "curiosity_angle"
    );

    expect(finalEmail.body).toBe("humanized final");
    expect(finalEmail.meta.selected_angle).toBe("curiosity_angle");
    expect(finalEmail.meta.deliverability.riskLevel).toBe("medium");
    expect(executor).toHaveBeenCalledTimes(6);
    const executorCalls = executor.mock.calls as unknown as [Parameters<StageExecutor>[0]][];
    expect(executorCalls.map(([call]) => call.stage)).toEqual([
      "Target Scrape",
      "Signal Extraction",
      "Angle Generation",
      "Template Assembly",
      "Tone Adapter",
      "Humanizer",
    ]);
  });
});
