// Static demo fixtures for DEMO_MODE judge navigation
// These mirror the Convex seed data shape without needing live DB

export const DEMO_CLAIMS = [
  {
    _id: "demo_claim_1",
    claimId: "CLM-2025-0001",
    policyId: "demo_policy_1",
    clientId: "demo_client",
    submittedBy: "demo_client",
    status: "assessor_assigned",
    dateOfLoss: Date.now() - 14 * 24 * 60 * 60 * 1000,
    description: "Vehicle collision at Westlands roundabout. Other vehicle ran a red light and struck my front-left door.",
    location: "Westlands Roundabout, Nairobi",
    estimatedLoss: 280000,
    documents: [],
    statusHistory: [
      { status: "submitted", timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000, userId: "demo_client" as any, notes: "Claim submitted" },
      { status: "documents_pending", timestamp: Date.now() - 13 * 24 * 60 * 60 * 1000, userId: "demo_officer" as any, notes: "Police abstract required" },
      { status: "under_review", timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, userId: "demo_officer" as any, notes: "All documents received" },
      { status: "assessor_assigned", timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, userId: "demo_officer" as any, notes: "Assigned to Peter Njoroge" },
    ],
    voiceNoteTranscript: "I was involved in a collision on the 14th of February 2025 at around 3PM near the Westlands roundabout. The other vehicle ran a red light and hit my front-left door. Estimated damage is KES 280,000.",
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
];

export const DEMO_POLICIES = [
  {
    _id: "demo_policy_1",
    policyNumber: "POL-2025-0001",
    clientId: "demo_client" as any,
    distributorId: "demo_distributor" as any,
    underwriterId: "demo_underwriter" as any,
    productType: "motor",
    sumInsured: 2500000,
    premium: 45000,
    status: "active" as const,
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    endDate: Date.now() + 335 * 24 * 60 * 60 * 1000,
    documents: [],
    notes: "Toyota Corolla 2020 - KCA 123X",
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
];

export const DEMO_PROPOSALS = [
  {
    _id: "demo_proposal_1",
    productType: "motor",
    sumInsured: 1800000,
    premium: 36000,
    status: "under_review" as const,
    aiRiskScore: 38,
    aiRiskSummary: "Low-moderate risk. Experienced driver, clean history, vehicle in good condition.",
    documents: [],
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
];

export const DEMO_USERS = {
  client: { name: "James Kamau", email: "james.kamau@demo.com", role: "client" },
  distributor: { name: "Sarah Otieno", email: "sarah.otieno@demo.com", role: "distributor" },
  underwriter: { name: "Dr. Mwangi Kariuki", email: "mwangi.kariuki@demo.com", role: "underwriter" },
  claims_officer: { name: "Fatuma Hassan", email: "fatuma.hassan@demo.com", role: "claims_officer" },
  assessor: { name: "Peter Njoroge", email: "peter.njoroge@demo.com", role: "assessor" },
  admin: { name: "Admin User", email: "admin@eklaims.com", role: "admin" },
};
