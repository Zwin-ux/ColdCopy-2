process.env.OPENAI_API_KEY = "test";
process.env.OPENAI_MODEL = "gpt-5.1-mini";
process.env.PORT = "4000";

import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "../index";

const baseEntry = {
  offer: "Compliance automation",
  tone: "professional" as const,
  research: {
    profile: {
      industry: "SaaS",
      role: "Revenue Ops",
      company: "SignalLoop",
      recent_achievements: "",
      notable_products_or_services: "deliverability monitoring",
      public_pain_points: "manual reporting",
      writing_tone: "concise",
      values_or_preferences: "privacy-first",
    },
    signals: {
      buying_reason: "Need to automate inbox health reporting.",
      credibility_hook: "SignalLoop already leads compliance-aware delivery.",
      emotional_hook: "Ops teams are tired of chasing Gmail filters.",
    },
    angles: {
      value_angle: "Value pitch",
      curiosity_angle: "Curiosity pitch",
      social_angle: "Social proof pitch",
    },
    deliverability: {
      riskLevel: "medium",
      cues: "Mentions inbox health.",
      recommends: "Keep tone concise and cite compliance wins.",
    },
  },
  email: {
    body: "Final email body",
    meta: {
      selected_angle: "value_angle" as const,
      deliverability: {
        riskLevel: "medium",
        cues: "Mentioned compliance.",
        recommends: "Keep follow-ups tight.",
      },
    },
  },
};

describe("/api/crm", () => {
  it("returns CRM-ready CSV", async () => {
    const res = await request(app)
      .post("/api/crm")
      .send({ entries: [baseEntry] })
      .expect("Content-Type", /text\/csv/)
      .expect(200);

    const [header] = res.text.split("\n");
    expect(header).toContain('"Offer"');
    expect(header).toContain('"Company"');
    expect(header).toContain('"Role"');
    expect(res.text).toContain("Compliance automation");
    expect(res.text).toContain("SignalLoop");
    expect(res.text).toContain("medium");
    expect(res.text.split("\n")).toHaveLength(2);
  });
});
