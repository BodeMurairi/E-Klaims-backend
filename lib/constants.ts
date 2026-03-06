export const ROLES = [
  { value: "client", label: "Client", description: "Purchase and manage insurance policies" },
  { value: "distributor", label: "Agent / Broker", description: "Onboard clients and submit proposals" },
  { value: "underwriter", label: "Underwriter", description: "Review and approve insurance proposals" },
  { value: "claims_officer", label: "Claims Officer", description: "Manage and process insurance claims" },
  { value: "assessor", label: "Assessor / Surveyor", description: "Conduct field assessments for claims" },
  { value: "admin", label: "Admin", description: "Manage platform users and configurations" },
] as const;

export const CLAIM_STATUSES = [
  { value: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-800" },
  { value: "documents_pending", label: "Documents Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "under_review", label: "Under Review", color: "bg-blue-100 text-blue-800" },
  { value: "assessor_assigned", label: "Assessor Assigned", color: "bg-indigo-100 text-indigo-800" },
  { value: "assessment_completed", label: "Assessment Completed", color: "bg-teal-100 text-teal-800" },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
  { value: "payment_processing", label: "Payment Processing", color: "bg-orange-100 text-orange-800" },
  { value: "paid", label: "Paid", color: "bg-green-200 text-green-900" },
] as const;

export const PROPOSAL_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "under_review", label: "Under Review", color: "bg-purple-100 text-purple-800" },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
  { value: "more_documents", label: "More Documents", color: "bg-orange-100 text-orange-800" },
] as const;

export const POLICY_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
  { value: "expired", label: "Expired", color: "bg-yellow-100 text-yellow-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "suspended", label: "Suspended", color: "bg-orange-100 text-orange-800" },
] as const;

export const PRODUCT_TYPES = [
  { value: "motor", label: "Motor Insurance" },
  { value: "health", label: "Health Insurance" },
  { value: "property", label: "Property Insurance" },
  { value: "life", label: "Life Insurance" },
] as const;

export const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  client: "/client",
  distributor: "/distributor",
  underwriter: "/underwriter",
  claims_officer: "/claims-officer",
  assessor: "/assessor",
  admin: "/admin",
};

export const PRODUCT_COVERAGE: Record<string, { label: string; benefits: { name: string; description: string }[] }> = {
  motor: {
    label: "Motor Insurance",
    benefits: [
      { name: "Third-Party Liability", description: "Covers bodily injury and property damage to third parties arising from road accidents" },
      { name: "Own Vehicle Damage", description: "Covers repair costs for your vehicle following a collision or accident" },
      { name: "Theft & Fire", description: "Full coverage against vehicle theft and fire damage" },
      { name: "Medical Expenses", description: "Medical and hospitalisation costs arising from road traffic accidents" },
      { name: "Roadside Assistance", description: "24/7 emergency breakdown and towing service nationwide" },
      { name: "Natural Catastrophes", description: "Damage from flood, hail, windstorm, and earthquake" },
    ],
  },
  health: {
    label: "Health Insurance",
    benefits: [
      { name: "Inpatient Hospitalization", description: "Full room, board, nursing care, and medications during hospital admission" },
      { name: "Outpatient Consultation", description: "GP and specialist visits including diagnostic tests and prescribed medication" },
      { name: "Surgical Procedures", description: "Elective and emergency surgery including anaesthesia and theatre fees" },
      { name: "Emergency & Ambulance", description: "Emergency treatment and ambulance transport to nearest facility" },
      { name: "Maternity Care", description: "Prenatal visits, normal and caesarean delivery, and postnatal follow-up" },
      { name: "Dental & Optical", description: "Routine dental check-ups and corrective eyewear allowance" },
    ],
  },
  property: {
    label: "Property Insurance",
    benefits: [
      { name: "Building Structure", description: "Covers structural damage to walls, roof, floors, and foundation" },
      { name: "Contents & Belongings", description: "Personal property and home contents covered up to sum insured" },
      { name: "Fire & Explosion", description: "Damage caused by fire, explosions, or electrical faults" },
      { name: "Flood & Water Damage", description: "Internal and external flooding and water ingress" },
      { name: "Theft & Burglary", description: "Loss or damage resulting from break-ins and burglary" },
      { name: "Public Liability", description: "Third-party injury or property damage occurring on your premises" },
    ],
  },
  life: {
    label: "Life Insurance",
    benefits: [
      { name: "Death Benefit", description: "Lump-sum payment to named beneficiaries upon the insured's death" },
      { name: "Terminal Illness", description: "Early benefit payout upon diagnosis of a terminal illness" },
      { name: "Permanent Disability", description: "Full sum insured paid on total and permanent disability" },
      { name: "Accidental Death Benefit", description: "Additional payout in the event of accidental death" },
      { name: "Critical Illness Rider", description: "Coverage for cancer, stroke, heart attack, and kidney failure" },
      { name: "Premium Waiver", description: "Future premiums waived upon disability or critical illness diagnosis" },
    ],
  },
};

export const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  distributor: "Agent / Broker",
  underwriter: "Underwriter",
  claims_officer: "Claims Officer",
  assessor: "Assessor",
  admin: "Admin",
};
