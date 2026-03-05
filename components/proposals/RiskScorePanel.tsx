import { TrendingUp } from "lucide-react";

interface RiskScorePanelProps {
  score?: number;
  summary?: string;
}

export function RiskScorePanel({ score, summary }: RiskScorePanelProps) {
  if (score === undefined) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 border">
        <p className="text-sm text-gray-400">AI risk score not yet calculated</p>
      </div>
    );
  }

  const category = score < 40 ? "Low" : score < 65 ? "Medium" : score < 80 ? "High" : "Very High";
  const color = score < 40 ? "text-green-600 bg-green-50 border-green-200" : score < 65 ? "text-yellow-600 bg-yellow-50 border-yellow-200" : "text-red-600 bg-red-50 border-red-200";
  const barColor = score < 40 ? "bg-green-500" : score < 65 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} />
        <span className="text-sm font-semibold">AI Risk Assessment</span>
        <span className="ml-auto text-lg font-bold">{score}/100</span>
      </div>
      <div className="w-full h-2 bg-white/50 rounded-full mb-3">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 bg-white/60 rounded-full">{category} Risk</span>
      </div>
      {summary && <p className="text-xs leading-relaxed opacity-80">{summary}</p>}
    </div>
  );
}
