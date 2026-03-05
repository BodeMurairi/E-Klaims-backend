"use client";

import { useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ROLES, ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import { UserRole } from "@/lib/types";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronRight,
  Car,
  Heart,
  Home,
  Shield,
  Plane,
  Upload,
  X,
  FileText,
  Bot,
  User,
  Send,
  Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ClientStep = "role" | "profile" | "chatbot" | "product" | "documents" | "review" | "submitted";

interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
}

interface ProductData {
  type: string;
  sumInsured: number;
  riskDetails: Record<string, string>;
}

interface UploadedFile {
  storageId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

interface ChatMessage {
  from: "bot" | "user";
  text: string;
}

// ─── Product config ──────────────────────────────────────────────────────────

const PRODUCTS = [
  { value: "motor", label: "Motor Insurance", icon: Car, color: "blue", desc: "Protect your vehicle against accidents, theft and third-party liability." },
  { value: "health", label: "Health Insurance", icon: Heart, color: "red", desc: "Comprehensive medical coverage for you and your family." },
  { value: "property", label: "Property Insurance", icon: Home, color: "green", desc: "Safeguard your home and business premises." },
  { value: "life", label: "Life Insurance", icon: Shield, color: "purple", desc: "Financial security for your loved ones." },
  { value: "travel", label: "Travel Insurance", icon: Plane, color: "orange", desc: "Stay covered wherever you go." },
];

const RISK_FIELDS: Record<string, { label: string; placeholder: string; field: string }[]> = {
  motor: [
    { label: "Vehicle Make", placeholder: "e.g. Toyota", field: "make" },
    { label: "Vehicle Model", placeholder: "e.g. Corolla", field: "model" },
    { label: "Year of Manufacture", placeholder: "e.g. 2019", field: "year" },
    { label: "Registration Number", placeholder: "e.g. KAA 123A", field: "registration" },
  ],
  health: [
    { label: "Date of Birth", placeholder: "DD/MM/YYYY", field: "dob" },
    { label: "Occupation", placeholder: "e.g. Software Engineer", field: "occupation" },
    { label: "Number of Dependants", placeholder: "e.g. 2", field: "dependants" },
  ],
  property: [
    { label: "Property Address", placeholder: "Full address", field: "address" },
    { label: "Property Type", placeholder: "e.g. Residential, Commercial", field: "propertyType" },
    { label: "Year Built", placeholder: "e.g. 2010", field: "yearBuilt" },
  ],
  life: [
    { label: "Date of Birth", placeholder: "DD/MM/YYYY", field: "dob" },
    { label: "Occupation", placeholder: "e.g. Teacher", field: "occupation" },
    { label: "Smoker?", placeholder: "Yes / No", field: "smoker" },
  ],
  travel: [
    { label: "Destination", placeholder: "e.g. United Kingdom", field: "destination" },
    { label: "Departure Date", placeholder: "DD/MM/YYYY", field: "departure" },
    { label: "Return Date", placeholder: "DD/MM/YYYY", field: "returnDate" },
  ],
};

interface DocSpec {
  name: string;
  required: boolean;
  accept: string;          // for <input accept="...">
  formatsLabel: string;    // human-readable hint
}

const REQUIRED_DOCS: Record<string, DocSpec[]> = {
  motor: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Driving License", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Vehicle Logbook / Registration", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
  ],
  health: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
  ],
  property: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Title Deed / Lease Agreement", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Valuation Report", required: false, accept: "application/pdf", formatsLabel: "PDF only" },
  ],
  life: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Medical Certificate", required: false, accept: "application/pdf", formatsLabel: "PDF only" },
  ],
  travel: [
    { name: "Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
  ],
};

// ─── Chatbot config ──────────────────────────────────────────────────────────

const BOT_PRODUCT_INFO: Record<string, string> = {
  motor: "Motor Insurance covers your vehicle against accidents, theft, fire and third-party liability. Our plans start from as little as KES 15,000/year and include 24/7 roadside assistance.",
  health: "Health Insurance gives you access to quality medical care without worrying about bills. Our plans cover inpatient, outpatient, maternity and dental care across 300+ hospitals nationwide.",
  property: "Property Insurance protects your home or business against fire, theft, floods and other perils. We cover both the building structure and contents.",
  life: "Life Insurance ensures your family is financially secure if anything happens to you. Our term and whole-life plans offer flexible premiums and guaranteed payouts.",
  travel: "Travel Insurance covers medical emergencies, trip cancellations, lost baggage and more. Single-trip and annual multi-trip plans available.",
};

const QUICK_REPLIES_INITIAL = PRODUCTS.map((p) => p.label);

const QUICK_REPLIES_AFTER_PRODUCT = [
  "What documents do I need?",
  "How much does it cost?",
  "What is covered?",
  "I'm ready to continue →",
];

// ─── Application status config ───────────────────────────────────────────────

const APPLICATION_STATUSES = [
  { key: "submitted", label: "Submitted", desc: "Your application has been received." },
  { key: "under_review", label: "Under Review", desc: "An underwriter is reviewing your application." },
  { key: "more_info", label: "More Information Requested", desc: "The insurer may ask for additional details." },
  { key: "approved", label: "Approved", desc: "Your application has been approved." },
  { key: "declined", label: "Declined", desc: "Your application has been declined." },
  { key: "converted", label: "Converted to Policy", desc: "Your policy is now active." },
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState<ClientStep>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Client-specific state
  const [profile, setProfile] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    phone: "",
    nationalId: "",
  });
  const [product, setProduct] = useState<ProductData>({ type: "", sumInsured: 0, riskDetails: {} });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());
  const [submittedProposalId, setSubmittedProposalId] = useState<string | null>(null);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Hi! I'm Klaims AI, your personal insurance guide. 👋 Which type of insurance are you interested in today?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatProductSelected, setChatProductSelected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const submitFromOnboarding = useMutation(api.proposals.submitFromOnboarding);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  // Pre-fill name from Clerk
  const clerkFirstName = user?.firstName ?? "";
  const clerkLastName = user?.lastName ?? "";
  const clerkEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";

  // ── Helpers ────────────────────────────────────────────────────────────────

  const scrollChatToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const addBotMessage = (text: string) => {
    setChatMessages((prev) => [...prev, { from: "bot", text }]);
    scrollChatToBottom();
  };

  const addUserMessage = (text: string) => {
    setChatMessages((prev) => [...prev, { from: "user", text }]);
    scrollChatToBottom();
  };

  // ── Role selection ─────────────────────────────────────────────────────────

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);

    if (role !== "client") {
      // Non-client: complete onboarding immediately and redirect
      setIsLoading(true);
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, onboardingComplete: true }),
        });
        if (!res.ok) throw new Error("Failed to update role");
        await user?.reload();
        window.location.href = ROLE_DASHBOARD_PATHS[role];
      } catch {
        toast.error("Setup failed. Please try again.");
        setIsLoading(false);
      }
      return;
    }

    // Client: proceed to profile step with pre-filled name
    setProfile({
      firstName: clerkFirstName,
      lastName: clerkLastName,
      phone: "",
      nationalId: "",
    });
    setStep("profile");
  };

  // ── Profile step ───────────────────────────────────────────────────────────

  const handleProfileNext = () => {
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }
    if (!profile.phone.trim()) {
      toast.error("Phone number is required.");
      return;
    }
    if (!profile.nationalId.trim()) {
      toast.error("National ID / Passport number is required.");
      return;
    }
    setStep("chatbot");
  };

  // ── Chatbot step ───────────────────────────────────────────────────────────

  const handleQuickReply = (reply: string) => {
    addUserMessage(reply);

    const productMatch = PRODUCTS.find((p) => p.label === reply);
    if (productMatch) {
      setChatProductSelected(true);
      setTimeout(() => {
        addBotMessage(`Great choice! Here's what you need to know about **${productMatch.label}**:\n\n${BOT_PRODUCT_INFO[productMatch.value]}\n\nWould you like to know more, or are you ready to proceed?`);
      }, 600);
      return;
    }

    if (reply === "I'm ready to continue →") {
      setTimeout(() => {
        addBotMessage("Excellent! Let's get you covered. I'll guide you through selecting the right plan. 🚀");
        setTimeout(() => setStep("product"), 800);
      }, 400);
      return;
    }

    if (reply.includes("documents")) {
      setTimeout(() => addBotMessage("You'll need to upload your National ID or Passport. Depending on your product, you may also need a Driving License, Vehicle Logbook, Title Deed, or Medical Certificate. Don't worry — we'll show you exactly what's needed!"), 600);
      return;
    }

    if (reply.includes("cost")) {
      setTimeout(() => addBotMessage("Premiums vary based on your risk profile and coverage. After you fill in your details, our system will show you an estimated quote. Prices are competitive and fully transparent."), 600);
      return;
    }

    if (reply.includes("covered")) {
      setTimeout(() => addBotMessage("Our policies cover a wide range of events. Once you select your product type in the next step, you'll see the full coverage details and exclusions."), 600);
      return;
    }

    // Generic response for typed messages
    setTimeout(() => addBotMessage("That's a great question! Our team has designed E-Klaims to make insurance simple, affordable and accessible. Is there anything else you'd like to know before we continue?"), 600);
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    handleQuickReply(text);
  };

  // ── Product step ───────────────────────────────────────────────────────────

  const handleProductNext = () => {
    if (!product.type) {
      toast.error("Please select a product type.");
      return;
    }
    if (!product.sumInsured || product.sumInsured < 1000) {
      toast.error("Please enter a valid sum insured (min KES 1,000).");
      return;
    }
    setStep("documents");
  };

  // ── Documents step ─────────────────────────────────────────────────────────

  const handleFileUpload = async (file: File, docName: string) => {
    // Derive a safe content type — some browsers send empty string for PDFs
    const contentType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

    setUploadingDocs((prev) => new Set(prev).add(docName));
    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: file,
      });

      if (!result.ok) {
        const errText = await result.text().catch(() => "");
        throw new Error(errText || `Upload failed (HTTP ${result.status})`);
      }

      const json = await result.json();
      const storageId: string = json.storageId;
      if (!storageId) throw new Error("No storageId in upload response");

      setUploadedFiles((prev) => [
        ...prev.filter((f) => f.name !== docName),
        { storageId, name: docName, mimeType: contentType, sizeBytes: file.size },
      ]);
      toast.success(`${docName} uploaded.`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(`Upload failed for "${docName}": ${err instanceof Error ? err.message : "Please try again."}`);
    } finally {
      setUploadingDocs((prev) => {
        const next = new Set(prev);
        next.delete(docName);
        return next;
      });
    }
  };

  const removeFile = (docName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== docName));
  };

  const handleDocumentsNext = () => {
    const required = (REQUIRED_DOCS[product.type] ?? []).filter((d) => d.required);
    const missing = required.filter((d) => !uploadedFiles.find((f) => f.name === d.name));
    if (missing.length > 0) {
      toast.error(`Please upload: ${missing.map((d) => d.name).join(", ")}`);
      return;
    }
    setStep("review");
  };

  // ── Final submission ───────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();

      // 1. Create user + proposal + documents in Convex
      const { proposalId } = await submitFromOnboarding({
        clerkId: user.id,
        name: fullName,
        email: clerkEmail,
        phone: profile.phone || undefined,
        nationalId: profile.nationalId || undefined,
        productType: product.type,
        sumInsured: product.sumInsured,
        riskDetails: { data: product.riskDetails },
        uploadedFiles,
      });

      // 2. Update Clerk publicMetadata
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "client", onboardingComplete: true }),
      });
      if (!res.ok) throw new Error("Failed to update Clerk metadata");

      await user.reload();
      setSubmittedProposalId(proposalId);
      setStep("submitted");
      toast.success("Application submitted! Underwriters have been notified.");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error instanceof Error ? error.message : "Submission failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step progress bar ────────────────────────────────────────────────────

  const CLIENT_STEPS = ["profile", "chatbot", "product", "documents", "review", "submitted"];
  const CLIENT_STEP_LABELS = ["Profile", "Consultation", "Product", "Documents", "Review", "Done"];
  const currentStepIndex = CLIENT_STEPS.indexOf(step);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">E-Klaims</h1>
        </div>

        {/* Progress bar (only for client steps after role) */}
        {selectedRole === "client" && step !== "role" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {CLIENT_STEP_LABELS.map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i < currentStepIndex
                        ? "bg-blue-600 text-white"
                        : i === currentStepIndex
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i < currentStepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${i === currentStepIndex ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(currentStepIndex / (CLIENT_STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* ── STEP: Role selection ── */}
          {step === "role" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Welcome to E-Klaims</h2>
                <p className="text-sm text-gray-500 mt-1">Select your role to get started.</p>
              </div>
              {isLoading ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-gray-500 text-sm">Setting up your account…</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => handleRoleSelect(role.value as UserRole)}
                      className="text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <div className="font-medium text-gray-900 group-hover:text-blue-700">{role.label}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{role.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Profile ── */}
          {step === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Complete your profile</h2>
                <p className="text-sm text-gray-500 mt-1">We need a few details to set up your account.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={clerkEmail}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+254 700 000 000"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">National ID / Passport Number</label>
                <input
                  type="text"
                  value={profile.nationalId}
                  onChange={(e) => setProfile((p) => ({ ...p, nationalId: e.target.value }))}
                  placeholder="ID or Passport number"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleProfileNext}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP: AI Chatbot ── */}
          {step === "chatbot" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Talk to Klaims AI</h2>
                <p className="text-sm text-gray-500 mt-1">Our AI guide will help you find the right coverage.</p>
              </div>

              {/* Chat window */}
              <div className="h-72 overflow-y-auto border rounded-xl p-4 space-y-3 bg-gray-50">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.from === "bot" && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.from === "bot"
                          ? "bg-white border text-gray-800 rounded-tl-none shadow-sm"
                          : "bg-blue-600 text-white rounded-tr-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.from === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Quick replies */}
              <div className="flex flex-wrap gap-2">
                {(chatProductSelected ? QUICK_REPLIES_AFTER_PRODUCT : QUICK_REPLIES_INITIAL).map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      reply === "I'm ready to continue →"
                        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                        : "bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Chat input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                  placeholder="Ask a question…"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleChatSend}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setStep("product")}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Product Selection <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP: Product selection ── */}
          {step === "product" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Select your insurance product</h2>
                <p className="text-sm text-gray-500 mt-1">Choose the type of coverage you need.</p>
              </div>

              {/* Product cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRODUCTS.map((p) => {
                  const Icon = p.icon;
                  const selected = product.type === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => setProduct((prev) => ({ ...prev, type: p.value, riskDetails: {} }))}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        selected ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-5 h-5 ${selected ? "text-blue-600" : "text-gray-400"}`} />
                        <span className={`font-medium ${selected ? "text-blue-700" : "text-gray-800"}`}>{p.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Risk details form */}
              {product.type && (
                <div className="space-y-4 pt-2 border-t">
                  <p className="text-sm font-medium text-gray-700">Tell us about what you want to insure</p>
                  {(RISK_FIELDS[product.type] ?? []).map((field) => (
                    <div key={field.field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      <input
                        type="text"
                        value={product.riskDetails[field.field] ?? ""}
                        onChange={(e) =>
                          setProduct((p) => ({
                            ...p,
                            riskDetails: { ...p.riskDetails, [field.field]: e.target.value },
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sum Insured (KES)
                    </label>
                    <input
                      type="number"
                      value={product.sumInsured || ""}
                      onChange={(e) => setProduct((p) => ({ ...p, sumInsured: Number(e.target.value) }))}
                      placeholder="e.g. 1000000"
                      min={1000}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("chatbot")} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
                <button onClick={handleProductNext} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Documents ── */}
          {step === "documents" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Upload your documents</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Please upload the required documents for your{" "}
                  {PRODUCTS.find((p) => p.value === product.type)?.label} application.
                </p>
              </div>

              <div className="space-y-4">
                {(REQUIRED_DOCS[product.type] ?? []).map((doc) => {
                  const uploaded = uploadedFiles.find((f) => f.name === doc.name);
                  const isUploading = uploadingDocs.has(doc.name);

                  return (
                    <div
                      key={doc.name}
                      className={`border rounded-xl p-4 transition-colors ${
                        uploaded ? "border-green-200 bg-green-50" : "border-gray-200"
                      }`}
                    >
                      {/* Doc title row */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${uploaded ? "text-green-500" : "text-gray-400"}`} />
                          <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                          {doc.required ? (
                            <span className="text-xs text-red-500 font-medium">Required</span>
                          ) : (
                            <span className="text-xs text-gray-400">Optional</span>
                          )}
                        </div>
                        {uploaded && !isUploading && (
                          <button
                            onClick={() => removeFile(doc.name)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Accepted formats hint */}
                      <p className="text-xs text-gray-400 mb-3 ml-6">Accepted: {doc.formatsLabel}</p>

                      {/* State: uploading */}
                      {isUploading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading…</span>
                        </div>
                      )}

                      {/* State: uploaded */}
                      {!isUploading && uploaded && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-lg px-3 py-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="truncate">{uploaded.name}</span>
                          <span className="text-green-500 text-xs ml-auto flex-shrink-0">
                            {(uploaded.sizeBytes / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      )}

                      {/* State: idle — show upload button */}
                      {!isUploading && !uploaded && (
                        <label className="flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors text-center">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            Click to select file
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept={doc.accept}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              // Reset value so re-selecting same file triggers onChange again
                              e.target.value = "";
                              if (file) handleFileUpload(file, doc.name);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("product")}
                  disabled={uploadingDocs.size > 0}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleDocumentsNext}
                  disabled={uploadingDocs.size > 0}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploadingDocs.size > 0 ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  ) : (
                    <>Continue <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Review ── */}
          {step === "review" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review your application</h2>
                <p className="text-sm text-gray-500 mt-1">Please confirm the details below before submitting.</p>
              </div>

              <div className="space-y-4">
                {/* Profile summary */}
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your Profile</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Name:</span> <span className="font-medium">{profile.firstName} {profile.lastName}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-medium">{clerkEmail}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{profile.phone}</span></div>
                    <div><span className="text-gray-500">National ID:</span> <span className="font-medium">{profile.nationalId}</span></div>
                  </div>
                </div>

                {/* Product summary */}
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Insurance Product</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Product:</span> <span className="font-medium">{PRODUCTS.find((p) => p.value === product.type)?.label}</span></div>
                    <div><span className="text-gray-500">Sum Insured:</span> <span className="font-medium">KES {product.sumInsured.toLocaleString()}</span></div>
                    {Object.entries(product.riskDetails).map(([k, v]) => (
                      <div key={k}><span className="text-gray-500 capitalize">{k}:</span> <span className="font-medium">{v}</span></div>
                    ))}
                  </div>
                </div>

                {/* Documents summary */}
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Uploaded Documents</p>
                  {uploadedFiles.length === 0 ? (
                    <p className="text-sm text-gray-400">No documents uploaded.</p>
                  ) : (
                    <ul className="space-y-1">
                      {uploadedFiles.map((f) => (
                        <li key={f.name} className="flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="w-4 h-4" /> {f.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("documents")} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Application"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Submitted ── */}
          {step === "submitted" && (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-9 h-9 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Application Submitted!</h2>
                <p className="text-sm text-gray-500 max-w-sm">
                  Your application has been received and an underwriter has been notified. You can track the status below.
                </p>
              </div>

              {/* Application status tracker */}
              <div className="text-left bg-gray-50 rounded-xl p-5 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Application Status</p>
                {APPLICATION_STATUSES.map((s, i) => {
                  const isActive = i === 0;
                  const isDone = i === 0;
                  return (
                    <div key={s.key} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isDone ? "bg-green-500" : isActive ? "bg-blue-500" : "bg-gray-200"
                        }`}>
                          {isDone ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        {i < APPLICATION_STATUSES.length - 1 && (
                          <div className={`w-0.5 h-6 mt-1 ${i === 0 ? "bg-green-200" : "bg-gray-200"}`} />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className={`text-sm font-medium ${isDone ? "text-green-700" : "text-gray-400"}`}>{s.label}</p>
                        <p className="text-xs text-gray-400">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => { window.location.href = "/client"; }}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
