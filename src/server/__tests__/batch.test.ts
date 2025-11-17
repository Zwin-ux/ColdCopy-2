import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const mockProfile = {
  industry: "SaaS",
  role: "Revenue Ops",
  company: "SignalLoop",
  recent_achievements: "Launched compliance automation",
  notable_products_or_services: "deliverability monitoring",
  public_pain_points: "Manual inbox reporting",
  writing_tone: "concise",
  values_or_preferences: "privacy-first",
};

const mockSignals = {
  buying_reason: "Need clean deliverability signals before the next launch.",
  credibility_hook: "SignalLoop secures inbox health reports for regulators.",
  emotional_hook: "Ops teams feel pressure from manual dashboards.",
};

const mockAngles = {
  value_angle: "Automate the weekly compliance report with a trusted data layer.",
  curiosity_angle: "What if inbox health could update the board without bugging ops?",
  social_angle: "Revenue Ops peers finally hand off filters to compliance-first automation.",
};

const templateDraft = "line1 reason\nline2 value\nline3 proof\nline4 cta";
const tonedDraft = "line1 reason toned\nline2 value toned\nline3 proof toned\nline4 cta toned";
const humanizedDraft = "humanized final email";
const stageOutputs = [
  JSON.stringify(mockProfile),
  JSON.stringify(mockSignals),
  JSON.stringify(mockAngles),
  templateDraft,
  tonedDraft,
  humanizedDraft,
];
const expectedDeliverability = {
  riskLevel: "medium",
  cues: "Talks about inbox health or compliance.",
  recommends: "Lean into compliance proof and keep sentences concise to avoid AI flagging.",
};

let stageCallIndex = 0;

vi.mock("openai", () => {
  return {
    OpenAI: class {
      chat = {
        completions: {
          create: async () => {
            const output = stageOutputs[stageCallIndex % stageOutputs.length];
            stageCallIndex += 1;
            return {
              choices: [
                {
                  message: {
                    content: output,
                  },
                },
              ],
            };
          },
        },
      };
    },
  };
});

const loadApp = async () => {
  vi.resetModules();
  const server = await import("../index");
  return server.app;
};

beforeEach(() => {
  stageCallIndex = 0;
});

describe("batch + regenerate endpoints", () => {
  const entries = [
    {
      offer: "Compliance automation",
      targetText: "Integrate deliverability reporting into ops dashboards.",
      tone: "professional" as const,
    },
  ];

  it("returns research and deliverability per entry and honors cached regeneration", async () => {
    const app = await loadApp();
    const res = await request(app).post("/api/batch").send({ entries }).expect(200);
    const exportsArray = res.body.exports;
    expect(exportsArray).toHaveLength(entries.length);
    for (const entry of exportsArray) {
      expect(entry.research.deliverability).toEqual(expectedDeliverability);
      expect(entry.email.meta.selected_angle).toBe("value_angle");
      expect(entry.research.profile.company).toBe(mockProfile.company);
      expect(entry.research.signals.buying_reason).toContain("deliverability");
    }

    const firstExport = exportsArray[0];
    const regenerate = await request(app)
      .post("/api/generate")
      .send({
        offer: entries[0].offer,
        tone: entries[0].tone,
        selectedAngle: "curiosity_angle",
        cachedProfile: firstExport.research.profile,
        cachedSignals: firstExport.research.signals,
        cachedAngles: firstExport.research.angles,
      })
      .expect(200);

    expect(regenerate.body.email.meta.selected_angle).toBe("curiosity_angle");
    expect(regenerate.body.research.deliverability).toEqual(expectedDeliverability);
  });

  it("cycles angles through /api/generate while keeping deliverability constant", async () => {
    const app = await loadApp();
    const cachedResearch = {
      cachedProfile: mockProfile,
      cachedSignals: mockSignals,
      cachedAngles: mockAngles,
    };
    const basePayload = {
      offer: "Compliance automation",
      tone: "professional" as const,
      ...cachedResearch,
    };

    const firstResponse = await request(app).post("/api/generate").send(basePayload).expect(200);
    expect(firstResponse.body.email.meta.selected_angle).toBe("value_angle");
    expect(firstResponse.body.research.deliverability).toEqual(expectedDeliverability);

    const secondResponse = await request(app)
      .post("/api/generate")
      .send({ ...basePayload, selectedAngle: "social_angle" })
      .expect(200);
    expect(secondResponse.body.email.meta.selected_angle).toBe("social_angle");
    expect(secondResponse.body.research.deliverability).toEqual(expectedDeliverability);
  });
});
