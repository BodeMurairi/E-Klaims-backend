"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// ─── Risk Scoring ──────────────────────────────────────────────────────────
export const runRiskScore = action({
  args: {
    proposalId: v.id("proposals"),
    productType: v.string(),
    riskDetails: v.any(),
  },
  handler: async (ctx, { proposalId, productType, riskDetails }) => {
    // Simulate API latency
    await new Promise((r) => setTimeout(r, 800));

    const mockScores: Record<string, { score: number; summary: string }> = {
      motor: {
        score: 42,
        summary:
          "Moderate risk — driver profile and vehicle value suggest standard premium. No major red flags detected.",
      },
      health: {
        score: 28,
        summary:
          "Low risk — favorable health profile. Non-smoker with no pre-existing conditions declared.",
      },
      property: {
        score: 61,
        summary:
          "Elevated risk — property is in a flood-prone zone with older construction materials. Consider exclusions.",
      },
      life: {
        score: 35,
        summary:
          "Average risk profile — age and lifestyle factors within normal parameters.",
      },
    };

    const result = mockScores[productType] ?? mockScores.motor;

    await ctx.runMutation(api.proposals.setAiRiskScore, {
      proposalId,
      aiRiskScore: result.score,
      aiRiskSummary: result.summary,
    });

    return result;
  },
});

// ─── Voice Transcription ───────────────────────────────────────────────────
export const transcribeVoiceNote = action({
  args: { storageId: v.string() },
  handler: async (_ctx, { storageId }) => {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      transcript:
        "I was involved in a collision on the 14th of February 2025 at around 3PM near the Westlands roundabout. The other vehicle ran a red light and hit my front-left door. I have photos of the damage and a copy of the police abstract. The estimated damage to my vehicle is approximately KES 280,000.",
    };
  },
});

// ─── Document Verification ─────────────────────────────────────────────────
export const verifyDocument = action({
  args: {
    documentId: v.id("documents"),
    fileUrl: v.string(),
    documentName: v.string(),
  },
  handler: async (ctx, { documentId, fileUrl, documentName }) => {
    await new Promise((r) => setTimeout(r, 600));

    // 90% pass rate for demo
    const pass = Math.random() > 0.1;
    const result = {
      verified: pass,
      flagged: !pass,
      confidence: pass ? 0.94 : 0.71,
      reason: pass
        ? undefined
        : "Possible document alteration detected in header region",
    };

    if (pass) {
      await ctx.runMutation(api.documents.markVerified, {
        documentId,
        verifiedBy: undefined as unknown as any,
      });
    } else if (result.reason) {
      await ctx.runMutation(api.documents.markFlagged, {
        documentId,
        flagReason: result.reason,
      });
    }

    return result;
  },
});

// ─── AI Chatbot ────────────────────────────────────────────────────────────
export const sendChatMessage = action({
  args: {
    message: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (_ctx, { message }) => {
    await new Promise((r) => setTimeout(r, 600));

    const responses: Record<string, string> = {
      default:
        "I'm here to help you with your insurance needs. You can ask me about our products, the claims process, or required documents.",
      claim:
        "To file a claim, you'll need to provide your policy number, date of loss, a description of the incident, location, and estimated loss amount. Would you like me to guide you through the process?",
      policy:
        "We offer Motor, Health, Property, and Life insurance products. Each comes with comprehensive coverage tailored to your needs. Would you like details on a specific product?",
      document:
        "For a motor claim, you'll typically need: the claim form, police abstract, driver's license, vehicle logbook, and photos of damage. Shall I explain each document?",
    };

    const lower = message.toLowerCase();
    if (lower.includes("claim")) return { reply: responses.claim };
    if (lower.includes("policy") || lower.includes("product")) return { reply: responses.policy };
    if (lower.includes("document")) return { reply: responses.document };
    return { reply: responses.default };
  },
});
