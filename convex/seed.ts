import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDemoData = mutation({
  args: { adminClerkId: v.string() },
  handler: async (ctx, { adminClerkId }) => {
    const existing = await ctx.db.query("users").collect();
    if (existing.length > 0) return { message: "Data already seeded" };

    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    // Create demo users
    const clientId = await ctx.db.insert("users", {
      clerkId: "demo_client",
      name: "James Kamau",
      email: "james.kamau@demo.com",
      role: "client",
      phone: "+254700123456",
      onboardingComplete: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const distributorId = await ctx.db.insert("users", {
      clerkId: "demo_distributor",
      name: "Sarah Otieno",
      email: "sarah.otieno@demo.com",
      role: "distributor",
      phone: "+254700234567",
      onboardingComplete: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const underwriterId = await ctx.db.insert("users", {
      clerkId: "demo_underwriter",
      name: "Dr. Mwangi Kariuki",
      email: "mwangi.kariuki@demo.com",
      role: "underwriter",
      phone: "+254700345678",
      onboardingComplete: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const officerId = await ctx.db.insert("users", {
      clerkId: "demo_claims_officer",
      name: "Fatuma Hassan",
      email: "fatuma.hassan@demo.com",
      role: "claims_officer",
      phone: "+254700456789",
      onboardingComplete: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const assessorId = await ctx.db.insert("users", {
      clerkId: "demo_assessor",
      name: "Peter Njoroge",
      email: "peter.njoroge@demo.com",
      role: "assessor",
      phone: "+254700567890",
      onboardingComplete: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const adminId = await ctx.db.insert("users", {
      clerkId: adminClerkId,
      name: "Admin User",
      email: "admin@eklaims.com",
      role: "admin",
      phone: "+254700678901",
      onboardingComplete: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create demo policy
    const policyId = await ctx.db.insert("policies", {
      policyNumber: "POL-2025-0001",
      clientId,
      distributorId,
      underwriterId,
      productType: "motor",
      sumInsured: 2500000,
      premium: 45000,
      status: "active",
      startDate: now - 30 * 24 * 60 * 60 * 1000,
      endDate: now + oneYear,
      documents: [],
      notes: "Toyota Corolla 2020 - KCA 123X",
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      updatedAt: now - 30 * 24 * 60 * 60 * 1000,
    });

    // Create demo claim with full status history
    const claimId = await ctx.db.insert("claims", {
      claimId: "CLM-2025-0001",
      policyId,
      clientId,
      submittedBy: clientId,
      status: "assessor_assigned",
      dateOfLoss: now - 14 * 24 * 60 * 60 * 1000,
      description:
        "Vehicle collision at Westlands roundabout. Other vehicle ran a red light and struck my front-left door causing significant damage.",
      location: "Westlands Roundabout, Nairobi",
      estimatedLoss: 280000,
      documents: [],
      statusHistory: [
        {
          status: "submitted",
          timestamp: now - 14 * 24 * 60 * 60 * 1000,
          userId: clientId,
          notes: "Claim submitted by client",
        },
        {
          status: "documents_pending",
          timestamp: now - 13 * 24 * 60 * 60 * 1000,
          userId: officerId,
          notes: "Police abstract and photos of damage required",
        },
        {
          status: "under_review",
          timestamp: now - 10 * 24 * 60 * 60 * 1000,
          userId: officerId,
          notes: "All required documents received. Claim under review.",
        },
        {
          status: "assessor_assigned",
          timestamp: now - 7 * 24 * 60 * 60 * 1000,
          userId: officerId,
          notes: "Assigned to Peter Njoroge for site assessment",
        },
      ],
      assignedAssessorId: assessorId,
      assignedClaimsOfficerId: officerId,
      voiceNoteTranscript:
        "I was involved in a collision on the 14th of February 2025 at around 3PM near the Westlands roundabout. The other vehicle ran a red light and hit my front-left door. I have photos of the damage and a copy of the police abstract.",
      createdAt: now - 14 * 24 * 60 * 60 * 1000,
      updatedAt: now - 7 * 24 * 60 * 60 * 1000,
    });

    // Create demo proposal
    await ctx.db.insert("proposals", {
      clientId,
      distributorId,
      underwriterId,
      productType: "motor",
      riskDetails: {
        data: {
          vehicleReg: "KCA 456Y",
          vehicleValue: 1800000,
          yearOfMfr: 2019,
          make: "Honda CRV",
          driverAge: 34,
        },
      },
      sumInsured: 1800000,
      premium: 36000,
      status: "under_review",
      aiRiskScore: 38,
      aiRiskSummary:
        "Low-moderate risk. Experienced driver with clean history. Vehicle in good condition.",
      documents: [],
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      updatedAt: now - 2 * 24 * 60 * 60 * 1000,
    });

    // Document requirements for motor claim
    await ctx.db.insert("documentRequirements", {
      productType: "motor",
      entityType: "claim",
      requiredDocuments: [
        {
          name: "Claim Form",
          description: "Completed and signed claim form",
          required: true,
          acceptedFormats: ["pdf"],
        },
        {
          name: "Police Abstract",
          description: "Official police abstract/report for the incident",
          required: true,
          acceptedFormats: ["pdf", "jpg", "png"],
        },
        {
          name: "Driver's License",
          description: "Valid driver's license of the insured driver",
          required: true,
          acceptedFormats: ["pdf", "jpg", "png"],
        },
        {
          name: "Vehicle Logbook",
          description: "Vehicle registration document",
          required: true,
          acceptedFormats: ["pdf", "jpg", "png"],
        },
        {
          name: "Photos of Damage",
          description: "Clear photos showing all areas of damage",
          required: true,
          acceptedFormats: ["jpg", "png"],
        },
        {
          name: "Repair Estimate",
          description: "Garage repair estimate for the damage",
          required: false,
          acceptedFormats: ["pdf"],
        },
      ],
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    });

    // Document requirements for property claim
    await ctx.db.insert("documentRequirements", {
      productType: "property",
      entityType: "claim",
      requiredDocuments: [
        {
          name: "Claim Form",
          description: "Completed claim form",
          required: true,
          acceptedFormats: ["pdf"],
        },
        {
          name: "Fire Brigade Report",
          description: "Official fire brigade report (for fire claims)",
          required: true,
          acceptedFormats: ["pdf"],
        },
        {
          name: "Valuation Report",
          description: "Current property valuation report",
          required: true,
          acceptedFormats: ["pdf"],
        },
        {
          name: "Proof of Ownership",
          description: "Title deed or tenancy agreement",
          required: true,
          acceptedFormats: ["pdf"],
        },
        {
          name: "Photos",
          description: "Photos of the damaged property",
          required: true,
          acceptedFormats: ["jpg", "png"],
        },
      ],
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      message: "Demo data seeded successfully",
      userIds: { clientId, distributorId, underwriterId, officerId, assessorId, adminId },
      policyId,
      claimId,
    };
  },
});
