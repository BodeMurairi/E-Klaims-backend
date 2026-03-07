"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import {
  CheckCircle, ChevronRight, Upload, X, FileText,
  Bot, User, Send, Loader2, ArrowLeft, Search, UserCheck,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardStep = "client_lookup" | "chatbot" | "documents" | "review" | "submitted";

interface ProductData {
  type: string;
  label: string;
  sumInsured: number;
  riskDetails: Record<string, string>;
}

interface UploadedFile {
  storageId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

type ChatPhase = "greeting" | "product_intro" | "questioning" | "quoting" | "confirmed";

interface Quote {
  premium: number;
  sumInsured: number;
  rateLabel: string;
  breakdown: string[];
}

interface ConvoState {
  phase: ChatPhase;
  product: string;
  productLabel: string;
  questionIndex: number;
  answers: Record<string, string>;
  quote: Quote | null;
}

interface ChatMessage {
  from: "bot" | "user";
  text: string;
  quickReplies?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_FOOTER = "\n\nType **Menu** to return to the Main Menu\nType **Exit** to end this chat";

const PRODUCT_INTROS: Record<string, string> = {
  motor: "Our **Motor Insurance** policy protects you against financial loss in the event that your vehicle, its accessories or spare parts are stolen or damaged in an accident, fire, riot or strikes.",
  health: "Our **Health Insurance** plan gives you and your family access to quality healthcare, covering hospitalisation, outpatient treatment, and specialist consultations.",
  property: "Our **Property Insurance** policy protects your building and its contents against damage from fire, flooding, theft and other insured perils.",
  life: "Our **Life Insurance** plan ensures your loved ones are financially protected in the event of your passing, with a lump-sum payout to your named beneficiaries.",
  travel: "Our **Travel Insurance** policy covers medical emergencies, trip cancellations, lost luggage and other unexpected events while you are travelling outside Rwanda.",
};

interface Question {
  key: string;
  ask: (answers: Record<string, string>) => string;
  quickReplies?: string[];
}

const PRODUCT_QUESTIONS: Record<string, Question[]> = {
  motor: [
    { key: "coverType", ask: () => "Please select the client's preferred policy:\n\n1. **Comprehensive Motor (Rate 4.5%)**\n2. **Third Party Fire & Theft (Rate 3%)**\n3. **Third Party Only (Rate 0.5%)**", quickReplies: ["1. Comprehensive Motor", "2. Third Party Fire & Theft", "3. Third Party Only"] },
    { key: "usage", ask: () => "What will the vehicle be used for?\n\n1. **Private use**\n2. **Commercial purposes**\n3. **Agricultural Vehicle**\n4. **Motorcycle**", quickReplies: ["1. Private use", "2. Commercial purposes", "3. Agricultural Vehicle", "4. Motorcycle"] },
    { key: "make", ask: () => "What is the **make** of the vehicle?\n_(e.g. Toyota, Nissan, BMW)_" },
    { key: "model", ask: (a) => `What is the **model** of the ${a.make}?\n_(e.g. Corolla, Harrier, X5)_` },
    { key: "year", ask: (a) => `What **year** was the ${a.make} ${a.model} manufactured?\n_(e.g. 2019)_` },
    { key: "registration", ask: () => "What is the vehicle's **registration number**?\n_(e.g. RAB 123A)_" },
    { key: "value", ask: (a) => `What is the current market value of the ${a.make} ${a.model} in RWF?\n_(e.g. RWF 10,000,000)_` },
  ],
  travel: [
    { key: "destination", ask: () => "Which country or countries is the client travelling to?\n_(e.g. Kenya, France, USA)_" },
    { key: "region", ask: (a) => `Which coverage plan suits the trip to **${a.destination}**?\n\n1. **Africa / Asia**\n2. **Europe Basic**\n3. **Europe Plus**\n4. **Worldwide Basic**\n5. **Worldwide Silver**\n6. **Worldwide Gold**`, quickReplies: ["1. Africa / Asia", "2. Europe Basic", "3. Europe Plus", "4. Worldwide Basic", "5. Worldwide Silver", "6. Worldwide Gold"] },
    { key: "departure", ask: () => "What is the departure date?\n_(DD/MM/YYYY — e.g. 15/04/2026)_" },
    { key: "returnDate", ask: () => "What is the return date?\n_(DD/MM/YYYY — e.g. 29/04/2026)_" },
    { key: "purpose", ask: () => "What is the purpose of travel?\n\n1. **Business**\n2. **Leisure / Holiday**\n3. **Medical**\n4. **Education**\n5. **Other**", quickReplies: ["1. Business", "2. Leisure / Holiday", "3. Medical", "4. Education", "5. Other"] },
    { key: "preExisting", ask: () => "Does the client have any pre-existing medical conditions?\n\n1. **Yes**\n2. **No**", quickReplies: ["1. Yes", "2. No"] },
    { key: "nextOfKin", ask: () => "Who is the client's next of kin?\n_(Name and phone number)_" },
  ],
  health: [
    { key: "dob", ask: () => "What is the client's date of birth?\n_(DD/MM/YYYY — e.g. 01/05/1990)_" },
    { key: "occupation", ask: () => "What is their occupation?\n_(e.g. Teacher, Engineer, Business owner)_" },
    { key: "dependants", ask: () => "How many family members (including client) should be covered?\n\n1. **Just them**\n2. **2 people**\n3. **3 people**\n4. **4 people**\n5. **5 or more**", quickReplies: ["1. Just them", "2. 2 people", "3. 3 people", "4. 4 people", "5. 5 or more"] },
    { key: "preExisting", ask: () => "Does the client have any pre-existing medical conditions?\n\n1. **Yes**\n2. **No**", quickReplies: ["1. Yes", "2. No"] },
    { key: "sumInsured", ask: () => "What annual sum insured are you targeting in RWF?\n\n1. **RWF 5,000,000**\n2. **RWF 10,000,000**\n3. **RWF 20,000,000**\n4. **RWF 50,000,000**", quickReplies: ["1. RWF 5,000,000", "2. RWF 10,000,000", "3. RWF 20,000,000", "4. RWF 50,000,000"] },
  ],
  property: [
    { key: "address", ask: () => "What is the full address of the property?\n_(e.g. KG 15 Ave, Kigali)_" },
    { key: "type", ask: () => "What type of property is this?\n\n1. **Residential**\n2. **Commercial**\n3. **Industrial**", quickReplies: ["1. Residential", "2. Commercial", "3. Industrial"] },
    { key: "construction", ask: () => "What are the walls and roof made of?\n\n1. **Stone / Iron Sheet**\n2. **Brick / Tiles**\n3. **Concrete / Concrete**", quickReplies: ["1. Stone / Iron Sheet", "2. Brick / Tiles", "3. Concrete / Concrete"] },
    { key: "yearBuilt", ask: () => "What year was the property built?\n_(e.g. 2010)_" },
    { key: "contents", ask: () => "Also insure contents (furniture, electronics, appliances)?\n\n1. **Yes**\n2. **No**", quickReplies: ["1. Yes", "2. No"] },
    { key: "value", ask: () => "What is the estimated rebuilding value in RWF?\n_(e.g. RWF 50,000,000)_" },
  ],
  life: [
    { key: "dob", ask: () => "What is the client's date of birth?\n_(DD/MM/YYYY — e.g. 01/05/1985)_" },
    { key: "occupation", ask: () => "What is their occupation?\n_(e.g. Teacher, Engineer, Business owner)_" },
    { key: "smoker", ask: () => "Does the client smoke or use tobacco products?\n\n1. **Yes**\n2. **No**", quickReplies: ["1. Yes", "2. No"] },
    { key: "planType", ask: () => "Which type of life cover?\n\n1. **Term Life** (fixed period)\n2. **Whole Life**\n3. **Endowment**", quickReplies: ["1. Term Life", "2. Whole Life", "3. Endowment"] },
    { key: "sumInsured", ask: () => "What sum insured in RWF?\n\n1. **RWF 5,000,000**\n2. **RWF 10,000,000**\n3. **RWF 30,000,000**\n4. **RWF 50,000,000**", quickReplies: ["1. RWF 5,000,000", "2. RWF 10,000,000", "3. RWF 30,000,000", "4. RWF 50,000,000"] },
    { key: "beneficiary", ask: () => "Who is the primary beneficiary?\n_(Name and relationship — e.g. Jane Doe, Spouse)_" },
  ],
};

// ─── Quote calculator ─────────────────────────────────────────────────────────

function parseAmount(raw: string): number { return Number(raw.replace(/[^0-9.]/g, "")) || 0; }

function parseDateDiff(dep: string, ret: string): number {
  const p = (s: string) => { const [d, m, y] = s.split("/").map(Number); return new Date(y, m - 1, d); };
  const days = Math.ceil((p(ret).getTime() - p(dep).getTime()) / 86_400_000);
  return Math.max(1, isNaN(days) ? 7 : days);
}

function calculateQuote(product: string, answers: Record<string, string>): Quote {
  switch (product) {
    case "motor": {
      const value = parseAmount(answers.value);
      const cover = answers.coverType ?? "Comprehensive Motor";
      const rate = cover.toLowerCase().includes("third party only") ? 0.005 : cover.toLowerCase().includes("fire") ? 0.03 : 0.045;
      const basicPremium = Math.max(30_000, Math.round(value * rate));
      const trainingLevy = Math.round(basicPremium * 0.005);
      const stampDuty = 5_000;
      const totalPremium = basicPremium + trainingLevy + stampDuty;
      return { sumInsured: value, premium: totalPremium, rateLabel: `${(rate * 100).toFixed(1)}%`, breakdown: [`Sum Insured: RWF ${value.toLocaleString()}`, `Basic Premium (${(rate * 100).toFixed(1)}%): RWF ${basicPremium.toLocaleString()}`, `Training Levy (0.5%): RWF ${trainingLevy.toLocaleString()}`, `Stamp Duty: RWF ${stampDuty.toLocaleString()}`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    case "travel": {
      const days = parseDateDiff(answers.departure, answers.returnDate);
      const USD_TO_RWF = 1350;
      const TRAVEL_RATES: [number, number, number, number, number, number, number][] = [[8,24.54,24.54,26.85,29.03,33.05,33.58],[14,25.80,25.80,28.80,29.97,34.27,34.78],[21,27.70,27.70,33.18,34.44,37.43,38.05],[32,35.28,35.28,39.53,42.31,52.83,53.81],[49,41.60,41.60,52.15,58.41,70.09,71.41],[62,52.15,52.15,60.57,66.36,79.92,81.46],[92,60.14,60.14,77.74,84.54,94.81,96.67],[180,79.56,79.56,111.16,131.11,160.28,163.59]];
      const REGION_IDX: Record<string, number> = { "Africa / Asia": 1, "Europe Basic": 2, "Europe Plus": 3, "Worldwide Basic": 4, "Worldwide Silver": 5, "Worldwide Gold": 6 };
      const colIdx = REGION_IDX[answers.region] ?? 1;
      const bracket = TRAVEL_RATES.find(([max]) => days <= max) ?? TRAVEL_RATES[TRAVEL_RATES.length - 1];
      const basePremium = Math.round(bracket[colIdx] * USD_TO_RWF);
      const adminFee = 2_000; const stampDuty = 3_000; const totalPremium = basePremium + adminFee + stampDuty;
      const coverage = (answers.region?.startsWith("Worldwide") ? 100_000 : 30_000) * USD_TO_RWF;
      return { sumInsured: coverage, premium: totalPremium, rateLabel: `${answers.region}`, breakdown: [`Destination: ${answers.destination}`, `Plan: ${answers.region ?? "Africa / Asia"}`, `Duration: ${days} day${days !== 1 ? "s" : ""}`, `Medical Cover: RWF ${coverage.toLocaleString()}`, `Base Premium: RWF ${basePremium.toLocaleString()}`, `Admin Fee: RWF ${adminFee.toLocaleString()}`, `Stamp Duty: RWF ${stampDuty.toLocaleString()}`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    case "health": {
      const si = parseAmount(answers.sumInsured);
      const depCount = answers.dependants?.includes("Just") || answers.dependants === "1" ? 1 : answers.dependants?.includes("more") || answers.dependants?.includes("5") ? 5 : parseAmount(answers.dependants) || 1;
      const rate = 0.04 + (depCount > 1 ? (depCount - 1) * 0.015 : 0);
      const basicPremium = Math.max(80_000, Math.round(si * rate));
      const adminFee = Math.round(basicPremium * 0.03); const stampDuty = 3_000; const totalPremium = basicPremium + adminFee + stampDuty;
      return { sumInsured: si, premium: totalPremium, rateLabel: `${(rate * 100).toFixed(1)}%`, breakdown: [`Sum Insured: RWF ${si.toLocaleString()}`, `Lives Covered: ${depCount}`, `Basic Premium (${(rate * 100).toFixed(1)}%): RWF ${basicPremium.toLocaleString()}`, `Admin Fee (3%): RWF ${adminFee.toLocaleString()}`, `Stamp Duty: RWF ${stampDuty.toLocaleString()}`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    case "property": {
      const value = parseAmount(answers.value);
      const hasContents = answers.contents?.toLowerCase().includes("yes") ?? false;
      const buildingPremium = Math.round(value * 0.0035);
      const contentsPremium = hasContents ? Math.round(value * 0.005) : 0;
      const basePremium = Math.max(50_000, buildingPremium + contentsPremium);
      const stampDuty = 5_000; const totalPremium = basePremium + stampDuty;
      return { sumInsured: value, premium: totalPremium, rateLabel: "0.35%", breakdown: [`Sum Insured: RWF ${value.toLocaleString()}`, `Building Premium (0.35%): RWF ${buildingPremium.toLocaleString()}`, ...(hasContents ? [`Contents Premium (0.5%): RWF ${contentsPremium.toLocaleString()}`] : []), `Stamp Duty: RWF ${stampDuty.toLocaleString()}`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    case "life": {
      const si = parseAmount(answers.sumInsured);
      const smoker = answers.smoker?.toLowerCase().includes("yes") ?? false;
      const rate = smoker ? 0.025 : 0.015;
      const basicPremium = Math.max(50_000, Math.round(si * rate));
      const adminFee = Math.round(basicPremium * 0.03); const stampDuty = 3_000; const totalPremium = basicPremium + adminFee + stampDuty;
      return { sumInsured: si, premium: totalPremium, rateLabel: `${(rate * 100).toFixed(1)}%`, breakdown: [`Sum Insured: RWF ${si.toLocaleString()}`, `Basic Premium (${(rate * 100).toFixed(1)}%): RWF ${basicPremium.toLocaleString()}`, ...(smoker ? ["Smoker Loading: included"] : []), `Admin Fee (3%): RWF ${adminFee.toLocaleString()}`, `Stamp Duty: RWF ${stampDuty.toLocaleString()}`, `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`] };
    }
    default:
      return { sumInsured: 0, premium: 0, rateLabel: "—", breakdown: [] };
  }
}

// ─── Chatbot helpers ──────────────────────────────────────────────────────────

const PRODUCT_ORDER = ["motor", "health", "property", "life", "travel"] as const;
const PRODUCT_QUICK_REPLIES = ["1. Motor Insurance", "2. Health Insurance", "3. Property Insurance", "4. Life Insurance", "5. Travel Insurance", "6. Customer Service Support"];
const PRODUCT_LABELS: Record<string, string> = { motor: "Motor Insurance", health: "Health Insurance", property: "Property Insurance", life: "Life Insurance", travel: "Travel Insurance" };

function makeGreeting(clientName: string): ChatMessage {
  return {
    from: "bot",
    text: `Hello! 👋 I'll now help you build a quote for **${clientName}**.\n\nPlease choose the insurance product by typing 1, 2, 3, 4 or 5:\n\n1. **Motor Insurance**\n2. **Health Insurance**\n3. **Property Insurance**\n4. **Life Insurance**\n5. **Travel Insurance**\n6. **Customer Service Support**${MENU_FOOTER}`,
    quickReplies: PRODUCT_QUICK_REPLIES,
  };
}

const ACK = ["Got it! 👍", "Perfect, noted!", "Great, thanks!", "Understood!", "Noted! ✅", "Thanks for that!", "Excellent!", "Recorded 📝"];
let ackIdx = 0;
const nextAck = () => ACK[ackIdx++ % ACK.length];

// ─── Doc specs ────────────────────────────────────────────────────────────────

interface DocSpec { name: string; required: boolean; accept: string; formatsLabel: string; }

const REQUIRED_DOCS: Record<string, DocSpec[]> = {
  motor: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Driving License", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Vehicle Logbook / Registration", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
  ],
  health: [{ name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" }],
  property: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Title Deed / Lease Agreement", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Valuation Report", required: false, accept: "application/pdf", formatsLabel: "PDF only" },
  ],
  life: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Medical Certificate", required: false, accept: "application/pdf", formatsLabel: "PDF only" },
  ],
  travel: [{ name: "Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" }],
};

// ─── Markdown renderer (simple) ───────────────────────────────────────────────

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    let key = 0;
    while (rest) {
      const boldMatch = rest.match(/^(.*?)\*\*(.*?)\*\*(.*)/s);
      const italicMatch = rest.match(/^(.*?)_(.*?)_(.*)/s);
      if (boldMatch && (!italicMatch || boldMatch[1].length <= italicMatch[1].length)) {
        if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
        parts.push(<strong key={key++}>{boldMatch[2]}</strong>);
        rest = boldMatch[3];
      } else if (italicMatch) {
        if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
        parts.push(<em key={key++} className="text-gray-400">{italicMatch[2]}</em>);
        rest = italicMatch[3];
      } else { parts.push(<span key={key++}>{rest}</span>); rest = ""; }
    }
    return <p key={i} className={line === "" ? "h-2" : ""}>{parts}</p>;
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DistributorOnboardPage() {
  const { user } = useUser();
  const { convexUser } = useCurrentUser();
  const [step, setStep] = useState<OnboardStep>("client_lookup");
  const [isLoading, setIsLoading] = useState(false);

  // Client lookup
  const [clientUsernameInput, setClientUsernameInput] = useState("");
  const [searchedUsername, setSearchedUsername] = useState<string | null>(null);
  const [confirmedClientId, setConfirmedClientId] = useState<string | null>(null);
  const [confirmedClientName, setConfirmedClientName] = useState<string>("");

  // Application data
  const [product, setProduct] = useState<ProductData>({ type: "", label: "", sumInsured: 0, riskDetails: {} });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());

  // Chatbot state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [convo, setConvo] = useState<ConvoState>({
    phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null,
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  const submitAgentOnboarding = useMutation(api.proposals.submitAgentOnboarding);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  // Client lookup query — only fires when searchedUsername is set
  const foundClient = useQuery(
    api.users.getByUsername,
    searchedUsername ? { username: searchedUsername } : "skip"
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step !== "submitted") return;
    const timer = setTimeout(() => { window.location.href = "/distributor"; }, 4000);
    return () => clearTimeout(timer);
  }, [step]);

  // ── Client lookup ──────────────────────────────────────────────────────────

  const handleSearch = () => {
    const cleaned = clientUsernameInput.trim().toLowerCase();
    if (!cleaned) { toast.error("Enter a username."); return; }
    setSearchedUsername(cleaned);
  };

  const handleConfirmClient = () => {
    if (!foundClient || foundClient.role !== "client") return;
    setConfirmedClientId(foundClient._id);
    setConfirmedClientName(foundClient.name);
    const greeting = makeGreeting(foundClient.name);
    setMessages([greeting]);
    setStep("chatbot");
  };

  // ── Message helpers ────────────────────────────────────────────────────────

  const addMsg = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
  const botSay = (text: string, quickReplies?: string[]) => addMsg({ from: "bot", text, quickReplies });
  const userSay = (text: string) => addMsg({ from: "user", text });

  // ── Input handler ──────────────────────────────────────────────────────────

  const handleInput = (input: string) => {
    if (!input.trim()) return;
    const trimmed = input.trim();
    userSay(trimmed);
    setInputValue("");

    const lower = trimmed.toLowerCase();

    if (lower === "menu" || lower === "main menu") {
      setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
      setTimeout(() => setMessages([makeGreeting(confirmedClientName)]), 300);
      return;
    }
    if (lower === "exit" || lower === "quit") {
      setTimeout(() => botSay("Thank you! You can return any time to complete the application. 👋", []), 400);
      return;
    }

    // ── Greeting ──
    if (convo.phase === "greeting") {
      const num = parseInt(trimmed.replace(/^(\d+)[\.\s].*/, "$1")) || 0;
      if (num === 6 || lower.includes("customer service") || lower.includes("support")) {
        setTimeout(() => botSay(`Got it! 📞 Please contact our Customer Care team or visit a branch for specialist support.` + MENU_FOOTER, ["1. Start Over"]), 400);
        return;
      }
      const idx = num >= 1 && num <= 5 ? num - 1 : PRODUCT_ORDER.findIndex(p => lower.includes(p));
      if (idx < 0 || idx >= PRODUCT_ORDER.length) {
        setTimeout(() => botSay("Please type a number from **1 to 6** to select a product." + MENU_FOOTER, PRODUCT_QUICK_REPLIES), 400);
        return;
      }
      const productKey = PRODUCT_ORDER[idx];
      const productLabel = PRODUCT_LABELS[productKey];
      setConvo({ ...convo, phase: "product_intro", product: productKey, productLabel });
      setTimeout(() => botSay(
        `${PRODUCT_INTROS[productKey]}\n\nHere are your options:\n\n1. **Get an instant quote**\n2. **Return to Main Menu**` + MENU_FOOTER,
        ["1. Get an instant quote", "2. Return to Main Menu"]
      ), 400);
      return;
    }

    // ── Product intro ──
    if (convo.phase === "product_intro") {
      const clean = trimmed.replace(/^\d+\.\s*/, "").trim().toLowerCase();
      if (clean.includes("return") || clean.includes("main menu") || trimmed === "2") {
        setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
        setTimeout(() => setMessages([makeGreeting(confirmedClientName)]), 300);
        return;
      }
      const firstQ = PRODUCT_QUESTIONS[convo.product][0];
      setConvo({ ...convo, phase: "questioning" });
      setTimeout(() => botSay(`Great! Let's build the quote for **${confirmedClientName}** on **${convo.productLabel}**.\n\n${firstQ.ask({})}` + MENU_FOOTER, firstQ.quickReplies), 400);
      return;
    }

    // ── Questioning ──
    if (convo.phase === "questioning") {
      const questions = PRODUCT_QUESTIONS[convo.product] ?? [];
      const currentQ = questions[convo.questionIndex];
      const answer = trimmed.replace(/^\d+\.\s*/, "").trim();
      const newAnswers = { ...convo.answers, [currentQ.key]: answer };

      if (convo.questionIndex < questions.length - 1) {
        const nextQ = questions[convo.questionIndex + 1];
        setConvo({ ...convo, questionIndex: convo.questionIndex + 1, answers: newAnswers });
        setTimeout(() => botSay(`${nextAck()}\n\n${nextQ.ask(newAnswers)}` + MENU_FOOTER, nextQ.quickReplies), 500);
      } else {
        const quote = calculateQuote(convo.product, newAnswers);
        setConvo({ ...convo, answers: newAnswers, quote, phase: "quoting" });
        setProduct({ type: convo.product, label: convo.productLabel, sumInsured: quote.sumInsured, riskDetails: newAnswers });
        const breakdown = quote.breakdown.join("\n");
        setTimeout(() => botSay(
          `Thank you! 🎉 Here is the insurance quote for **${confirmedClientName}**:\n\n${breakdown}\n\nWhat would you like to do next?\n\n1. **Proceed to Document Upload**\n2. **Start Over**` + MENU_FOOTER,
          ["1. Proceed to Document Upload", "2. Start Over"]
        ), 600);
      }
      return;
    }

    // ── Quoting ──
    if (convo.phase === "quoting") {
      const clean = trimmed.replace(/^\d+\.\s*/, "").trim().toLowerCase();
      if (clean.includes("proceed") || clean.includes("document") || trimmed === "1") {
        setConvo({ ...convo, phase: "confirmed" });
        setTimeout(() => {
          botSay(`Excellent! ✅ Quote locked in for **${convo.productLabel}**.\n\nPlease click **Continue to Documents** below to upload the client's supporting documents.`);
        }, 400);
        return;
      }
      if (clean.includes("start over") || trimmed === "2") {
        setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
        setTimeout(() => setMessages([makeGreeting(confirmedClientName)]), 300);
        return;
      }
    }
  };

  // ── Document upload ────────────────────────────────────────────────────────

  const handleFileUpload = async (docName: string, file: File) => {
    setUploadingDocs(prev => new Set(prev).add(docName));
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      setUploadedFiles(prev => [...prev.filter(f => f.name !== docName), { storageId, name: docName, mimeType: file.type, sizeBytes: file.size }]);
    } catch {
      toast.error(`Failed to upload ${docName}`);
    } finally {
      setUploadingDocs(prev => { const s = new Set(prev); s.delete(docName); return s; });
    }
  };

  const handleContinueToReview = () => {
    const docs = REQUIRED_DOCS[product.type] ?? [];
    const missing = docs.filter(d => d.required && !uploadedFiles.find(f => f.name === d.name));
    if (missing.length > 0) {
      toast.error(`Please upload: ${missing.map(d => d.name).join(", ")}`);
      return;
    }
    setStep("review");
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user || !confirmedClientId || !searchedUsername) return;
    setIsLoading(true);
    try {
      await submitAgentOnboarding({
        agentClerkId: user.id,
        clientUsername: searchedUsername,
        productType: product.type,
        sumInsured: product.sumInsured,
        riskDetails: { data: product.riskDetails },
        uploadedFiles,
      });
      toast.success("Application sent to client for confirmation!");
      setStep("submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Progress ───────────────────────────────────────────────────────────────

  const STEPS: OnboardStep[] = ["client_lookup", "chatbot", "documents", "review", "submitted"];
  const STEP_LABELS = ["Find Client", "AI Quote", "Documents", "Review", "Done"];
  const stepIdx = STEPS.indexOf(step);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/distributor" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Onboard a Client</h2>
          <p className="text-sm text-gray-500 mt-0.5">Prepare an insurance application on behalf of a registered client</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < stepIdx ? "bg-brand-500 text-white" : i === stepIdx ? "bg-brand-500 text-white ring-4 ring-brand-50" : "bg-gray-100 text-gray-400"}`}>
                {i < stepIdx ? "✓" : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === stepIdx ? "text-brand-500 font-medium" : "text-gray-400"}`}>{STEP_LABELS[i]}</span>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < stepIdx ? "bg-brand-500" : "bg-gray-100"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">

        {/* ── Client Lookup ── */}
        {step === "client_lookup" && (
          <div className="space-y-5 max-w-md mx-auto">
            <div>
              <h3 className="font-semibold text-gray-900">Find the Client</h3>
              <p className="text-sm text-gray-500 mt-0.5">Enter the client's registered username to link this application.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Username</label>
              <div className="flex gap-2">
                <div className="flex items-center border rounded-lg overflow-hidden flex-1 focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="px-3 py-2 bg-gray-50 text-gray-400 border-r text-sm">@</span>
                  <input
                    type="text"
                    value={clientUsernameInput}
                    onChange={(e) => {
                      setClientUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                      setSearchedUsername(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="client_username"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <button onClick={handleSearch} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 flex items-center gap-2">
                  <Search className="w-4 h-4" /> Find
                </button>
              </div>
            </div>

            {/* Search result */}
            {searchedUsername && foundClient === null && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700">No client found with username <strong>@{searchedUsername}</strong>. Please check the username and try again.</p>
              </div>
            )}

            {foundClient && foundClient.role !== "client" && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700">This username belongs to a non-client account and cannot be onboarded this way.</p>
              </div>
            )}

            {foundClient && foundClient.role === "client" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{foundClient.name}</p>
                    <p className="text-xs text-gray-500">@{searchedUsername} · {foundClient.email}</p>
                    <p className="text-xs text-green-600 mt-0.5">Registered client</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  You will prepare an insurance application on behalf of this client. They will receive a confirmation request and must approve before it is submitted for review.
                </p>
                <button onClick={handleConfirmClient} className="w-full py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 flex items-center justify-center gap-2">
                  <ChevronRight className="w-4 h-4" /> Confirm & Start Application
                </button>
              </div>
            )}

            {foundClient === undefined && searchedUsername && (
              <div className="flex items-center justify-center py-4 gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            )}
          </div>
        )}

        {/* ── Chatbot ── */}
        {step === "chatbot" && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <p className="text-sm text-indigo-700">Preparing application for <strong>{confirmedClientName}</strong></p>
            </div>

            <div className="h-[400px] overflow-y-auto border border-gray-100 rounded-xl bg-gray-50 p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.from === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.from === "bot" ? "bg-brand-500" : "bg-gray-300"}`}>
                    {msg.from === "bot" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.from === "bot" ? "bg-white border border-gray-100 text-gray-800 rounded-tl-sm" : "bg-brand-500 text-white rounded-tr-sm"}`}>
                    {renderMarkdown(msg.text)}
                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
                        {msg.quickReplies.map((r) => (
                          <button key={r} onClick={() => handleInput(r)} className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs hover:bg-blue-100 transition-colors">
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {convo.phase === "confirmed" ? (
              <button onClick={() => setStep("documents")} className="w-full py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 flex items-center justify-center gap-2">
                Continue to Documents <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { handleInput(inputValue); } }}
                  placeholder="Type your reply…"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={() => handleInput(inputValue)} className="px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Documents ── */}
        {step === "documents" && (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900">Upload Client Documents</h3>
              <p className="text-sm text-gray-500 mt-0.5">Upload supporting documents for the client's {product.label} application.</p>
            </div>
            <div className="space-y-3">
              {(REQUIRED_DOCS[product.type] ?? []).map((doc) => {
                const uploaded = uploadedFiles.find(f => f.name === doc.name);
                const uploading = uploadingDocs.has(doc.name);
                return (
                  <div key={doc.name} className={`border rounded-xl p-4 ${uploaded ? "border-green-200 bg-green-50" : "border-gray-100"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${uploaded ? "text-green-600" : "text-gray-400"}`} />
                        <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                        {doc.required && <span className="text-xs text-red-500">*</span>}
                      </div>
                      {uploaded && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">Accepted: {doc.formatsLabel}</p>
                    {!uploaded ? (
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer text-sm ${uploading ? "border-blue-300 text-blue-500" : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"}`}>
                        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Choose file</>}
                        <input type="file" accept={doc.accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(doc.name, f); }} disabled={uploading} />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-green-700">
                        <span className="truncate">{uploaded.name}</span>
                        <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.name !== doc.name))} className="ml-2 text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("chatbot")} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
              <button onClick={handleContinueToReview} className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 flex items-center justify-center gap-2">
                Review Application <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Review ── */}
        {step === "review" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900">Review Application</h3>
              <p className="text-sm text-gray-500 mt-0.5">Confirm all details before sending to the client for approval.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Client</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{confirmedClientName}</p>
                    <p className="text-xs text-gray-500">@{searchedUsername}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Insurance Quote</p>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div><span className="text-gray-500">Product:</span> <span className="font-medium">{product.label}</span></div>
                  <div><span className="text-gray-500">Sum Insured:</span> <span className="font-medium">RWF {product.sumInsured.toLocaleString()}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">Annual Premium:</span> <span className="font-bold text-blue-700 text-base">RWF {convo.quote?.premium.toLocaleString()}</span></div>
                </div>
                {convo.quote && (
                  <div className="pt-3 border-t space-y-1.5">
                    {convo.quote.breakdown.map((line, i) => {
                      const isTotal = i === convo.quote!.breakdown.length - 1;
                      const parts = line.split(": ");
                      return (
                        <div key={i} className={`flex justify-between text-xs ${isTotal ? "font-bold text-blue-700 text-sm pt-1 mt-1 border-t" : "text-gray-500"}`}>
                          {parts.length === 2 ? <><span>{parts[0]}:</span><span className="font-medium">{parts[1]}</span></> : <span>{line}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Uploaded Documents</p>
                {uploadedFiles.length === 0
                  ? <p className="text-sm text-gray-400">No documents uploaded.</p>
                  : <ul className="space-y-1">{uploadedFiles.map((f) => <li key={f.name} className="flex items-center gap-2 text-sm text-green-700"><CheckCircle className="w-4 h-4" /> {f.name}</li>)}</ul>}
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">What happens next</p>
                <p className="text-xs text-amber-700">This application will be sent to <strong>{confirmedClientName}</strong> for their approval. Once they confirm, it will be submitted to an underwriter for review. The client is always the final authority.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("documents")} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
              <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send to Client for Approval"}
              </button>
            </div>
          </div>
        )}

        {/* ── Submitted ── */}
        {step === "submitted" && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Application Sent!</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                <strong>{confirmedClientName}</strong> has been notified and must confirm the application before it goes to underwriting.
              </p>
              <p className="text-xs text-blue-500">Redirecting to your dashboard…</p>
            </div>
            <button onClick={() => { window.location.href = "/distributor"; }} className="w-full py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 flex items-center justify-center gap-2">
              Go to Dashboard <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
