import {
  getPlanTierLimitsForDisplay,
  getPlanFeaturesForDisplay,
} from "@/lib/billing/pricing-public";

export function FeatureComparisonTable() {
  const freeLimits = getPlanTierLimitsForDisplay("free");
  const proLimits = getPlanTierLimitsForDisplay("pro");
  const teamLimits = getPlanTierLimitsForDisplay("team");
  const freeFeatures = getPlanFeaturesForDisplay("free");
  const proFeatures = getPlanFeaturesForDisplay("pro");
  const teamFeatures = getPlanFeaturesForDisplay("team");
  const selfHostedFeatures = getPlanFeaturesForDisplay("selfHosted");

  const rows: Array<{
    label: string;
    free: string;
    pro: string;
    team: string;
    selfHosted: string;
    isHeader?: boolean;
  }> = [
    {
      label: "Limits",
      free: "",
      pro: "",
      team: "",
      selfHosted: "",
      isHeader: true,
    },
    {
      label: "Collections",
      free: freeLimits.collections,
      pro: proLimits.collections,
      team: teamLimits.collections,
      selfHosted: "Unlimited",
    },
    {
      label: "Themes / collection",
      free: freeLimits.themesPerCollection,
      pro: proLimits.themesPerCollection,
      team: teamLimits.themesPerCollection,
      selfHosted: "Unlimited",
    },
    {
      label: "Tokens (org total)",
      free: freeLimits.tokens,
      pro: proLimits.tokens,
      team: teamLimits.tokens,
      selfHosted: "Unlimited",
    },
    {
      label: "Exports / month",
      free: freeLimits.exportsPerMonth,
      pro: proLimits.exportsPerMonth,
      team: teamLimits.exportsPerMonth,
      selfHosted: "Unlimited",
    },
    {
      label: "Core Features",
      free: "",
      pro: "",
      team: "",
      selfHosted: "",
      isHeader: true,
    },
    {
      label: "Graph-based token generation",
      free: freeFeatures.graphEditor,
      pro: proFeatures.graphEditor,
      team: teamFeatures.graphEditor,
      selfHosted: selfHostedFeatures.graphEditor,
    },
    {
      label: "Math nodes & expressions",
      free: freeFeatures.mathNodes,
      pro: proFeatures.mathNodes,
      team: teamFeatures.mathNodes,
      selfHosted: selfHostedFeatures.mathNodes,
    },
    {
      label: "Token references",
      free: freeFeatures.tokenReferences,
      pro: proFeatures.tokenReferences,
      team: teamFeatures.tokenReferences,
      selfHosted: selfHostedFeatures.tokenReferences,
    },
    {
      label: "Multi-format export",
      free: freeFeatures.multiFormatExport,
      pro: proFeatures.multiFormatExport,
      team: teamFeatures.multiFormatExport,
      selfHosted: selfHostedFeatures.multiFormatExport,
    },
    {
      label: "Bulk token operations",
      free: freeFeatures.bulkOperations,
      pro: proFeatures.bulkOperations,
      team: teamFeatures.bulkOperations,
      selfHosted: selfHostedFeatures.bulkOperations,
    },
    {
      label: "Visual color swatches",
      free: freeFeatures.colorSwatches,
      pro: proFeatures.colorSwatches,
      team: teamFeatures.colorSwatches,
      selfHosted: selfHostedFeatures.colorSwatches,
    },
    {
      label: "Integrations",
      free: "",
      pro: "",
      team: "",
      selfHosted: "",
      isHeader: true,
    },
    {
      label: "GitHub import/export",
      free: freeFeatures.githubExport,
      pro: proFeatures.githubExport,
      team: teamFeatures.githubExport,
      selfHosted: selfHostedFeatures.githubExport,
    },
    {
      label: "Figma import/export",
      free: freeFeatures.figmaExport,
      pro: proFeatures.figmaExport,
      team: teamFeatures.figmaExport,
      selfHosted: selfHostedFeatures.figmaExport,
    },
    {
      label: "NPM publish",
      free: freeFeatures.npmPublish,
      pro: proFeatures.npmPublish,
      team: teamFeatures.npmPublish,
      selfHosted: selfHostedFeatures.npmPublish,
    },
    {
      label: "Platform",
      free: "",
      pro: "",
      team: "",
      selfHosted: "",
      isHeader: true,
    },
    {
      label: "Version history",
      free: freeFeatures.versionHistory,
      pro: proFeatures.versionHistory,
      team: teamFeatures.versionHistory,
      selfHosted: selfHostedFeatures.versionHistory,
    },
    {
      label: "AI chat assistant",
      free: freeFeatures.aiChat,
      pro: proFeatures.aiChat,
      team: teamFeatures.aiChat,
      selfHosted: selfHostedFeatures.aiChat,
    },
    {
      label: "Team collaboration",
      free: freeFeatures.teamMembers,
      pro: proFeatures.teamMembers,
      team: teamFeatures.teamMembers,
      selfHosted: selfHostedFeatures.teamMembers,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-4 text-sm font-semibold text-left">Feature</th>
            <th className="px-6 py-4 text-sm font-semibold text-center border-r-2 border-l-2 bg-primary/10 border-primary/20">
              <div className="flex gap-2 justify-center items-center">
                Free
                <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">Current</span>
              </div>
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-center">Pro</th>
            <th className="px-6 py-4 text-sm font-semibold text-center">Team</th>
            <th className="px-6 py-4 text-sm font-semibold text-center">Self-hosted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            if (row.isHeader) {
              return (
                <tr key={idx} className="border-t border-border">
                  <td className="px-6 py-3 text-sm font-semibold bg-muted/20">{row.label}</td>
                  <td className="px-6 py-3 text-sm font-semibold border-r-2 border-l-2 bg-muted/20 border-primary/20" />
                  <td className="px-6 py-3 text-sm font-semibold bg-muted/20" />
                  <td className="px-6 py-3 text-sm font-semibold bg-muted/20" />
                  <td className="px-6 py-3 text-sm font-semibold bg-muted/20" />
                </tr>
              );
            }
            return (
              <tr key={idx} className="border-t border-border hover:bg-muted/10">
                <td className="px-6 py-3 text-sm">{row.label}</td>
                <td className="px-6 py-3 text-sm tabular-nums text-center border-r-2 border-l-2 bg-primary/5 border-primary/20">
                  <CellValue value={row.free} />
                </td>
                <td className="px-6 py-3 text-sm tabular-nums text-center">
                  <CellValue value={row.pro} />
                </td>
                <td className="px-6 py-3 text-sm tabular-nums text-center">
                  <CellValue value={row.team} />
                </td>
                <td className="px-6 py-3 text-sm tabular-nums text-center">
                  <CellValue value={row.selfHosted} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({ value }: { value: string }) {
  const className =
    value === "—" ? "text-muted-foreground" : value === "✓" ? "text-green-400" : "";
  return <span className={className}>{value}</span>;
}
