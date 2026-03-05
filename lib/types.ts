import { Id } from "@/convex/_generated/dataModel";

export type UserRole =
  | "client"
  | "distributor"
  | "underwriter"
  | "claims_officer"
  | "assessor"
  | "admin";

export type ClaimStatus =
  | "submitted"
  | "documents_pending"
  | "under_review"
  | "assessor_assigned"
  | "assessment_completed"
  | "approved"
  | "rejected"
  | "payment_processing"
  | "paid";

export type ProposalStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "more_documents";

export type PolicyStatus =
  | "draft"
  | "active"
  | "expired"
  | "cancelled"
  | "suspended";

export type ProductType = "motor" | "health" | "property" | "life";

export interface StatusHistoryEntry {
  status: string;
  timestamp: number;
  userId: Id<"users">;
  notes?: string;
}

export interface MotorRiskDetails {
  vehicleReg: string;
  vehicleValue: number;
  yearOfMfr: number;
  make: string;
  driverAge: number;
}

export interface HealthRiskDetails {
  age: number;
  preExistingConditions: string[];
  coverageType: string;
}

export interface PropertyRiskDetails {
  address: string;
  propertyValue: number;
  constructionType: string;
}

export type RiskDetails = MotorRiskDetails | HealthRiskDetails | PropertyRiskDetails;
