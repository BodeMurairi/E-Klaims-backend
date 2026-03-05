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
  { value: "under_review", label: "Under Review", color: "bg-purple-100 text-purple-800" },
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

export const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  distributor: "Agent / Broker",
  underwriter: "Underwriter",
  claims_officer: "Claims Officer",
  assessor: "Assessor",
  admin: "Admin",
};
