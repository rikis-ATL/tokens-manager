"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getPlanTierLimitsForDisplay,
  getPlanFeaturesForDisplay,
} from "@/lib/billing/pricing-public";
import { TextAnimNavigators } from "../ui/motion/text-anim-navigators";

export function DemoLanding({ demoUrl }: { demoUrl: string }) {
  const free = getPlanTierLimitsForDisplay("free");
  const pro = getPlanTierLimitsForDisplay("pro");
  const team = getPlanTierLimitsForDisplay("team");

  return (
    <div
      data-marketing="true"
      className="overflow-hidden relative min-h-screen bg-background"
    >
      {/* Dot matrix background — white dots on dark canvas */}
      <div
        className="absolute inset-0 opacity-[0.22] z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <header className="relative z-10 grid min-h-screen w-full grid-cols-12 grid-rows-[40px_1fr_auto_auto_40px] gap-4">
        <div className="col-span-12 row-start-3 grid grid-cols-12 gap-8 p-16">
          <div className="col-span-4 flex flex-col gap-4">
            <h1 className="text-5xl font-bold tracking-tight text-foreground">
              <TextAnimNavigators
                content="Fully roided token generation and management workflow."
                delay={0}
                highlight="background"
              />
            </h1>
            <p className="text-xl text-muted-foreground">
              Token generation and management for humans with eyes
            </p>
          </div>

          <div className="col-span-6 col-start-7 grid grid-cols-2 gap-4 self-end">
            <Link
              href="/auth/signup"
              className="relative flex flex-col gap-4 self-end rounded-md border border-lime-500/30 bg-card/40 p-8 shadow-xl transition-all duration-300 hover:bg-card/80"
            >
              <div className="absolute right-0 top-0 h-3 w-3 translate-x-[50%] translate-y-[-50%] animate-pulse rounded-full bg-lime-500" />
              <h2 className="text-md font-semibold">Create a free org</h2>
              <p className="flex-1 text-sm text-muted-foreground">
                Register to get your own workspace will all features. Limited to 1
                collection with no integrations. Upgrade to a paid plan when you
                need higher limits.
              </p>
              <span className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
                Sign up
              </span>
            </Link>
            <Link
              href={demoUrl}
              className="relative flex flex-col gap-4 self-end rounded-md border border-lime-500/30 bg-card/40 p-8 shadow-xl transition-all duration-300 hover:bg-card/80"
            >
              <div className="absolute right-0 top-0 h-3 w-3 translate-x-[50%] translate-y-[-50%] animate-pulse rounded-full bg-lime-500" />
              <h2 className="text-md font-semibold">Try the shared demo</h2>
              <p className="flex-1 text-sm text-muted-foreground">
                Explore a live playground with sample token collections. No
                sign-up required. Mess around with the playground app theme to see
                live changes. Or view examples of token collections.
              </p>
              <span className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
                Enter demo
              </span>
            </Link>
          </div>
        </div>
      </header>
      <div className="relative z-10 px-5 py-16 mx-auto space-y-16 max-w-6xl">
       

        {/* Feature Table */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Feature comparison</h2>
            <Button asChild>
              <Link href="/upgrade">Upgrade plan</Link>
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border shadow-xl bg-card border-border">
            <FeatureTable />
          </div>
        </div>

        {/* About Section */}
        <div className="mx-auto max-w-6xl">
          <div className="p-8 rounded-2xl border shadow-xl bg-card border-border">
            <h2 className="mb-4 text-xl font-semibold">Feedback</h2>
            <div className="space-y-4 text-muted-foreground">
              {/* <p>
                This project is built to help manage design tokens for our internal design system.
                I created this to avoid the pains of editing tokens in json format. 
                It is a hosted Style Dictionary build environment with a visual UI, advanced tokens generation and synchronization capabilities.
              </p> */}
              <p>
                If you have any feedback or suggestions, feel free to reach out
                at{" "}
                <a
                  href="mailto:tokenflow666@gmail.com"
                  className="font-medium text-foreground hover:underline"
                >
                  tokenflow666@gmail.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureTable() {
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
            <th className="px-6 py-4 text-sm font-semibold text-left">
              Feature
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-center border-r-2 border-l-2 bg-primary/10 border-primary/20">
              <div className="flex gap-2 justify-center items-center">
                Free
                <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">
                  Current
                </span>
              </div>
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-center">Pro</th>
            <th className="px-6 py-4 text-sm font-semibold text-center">
              Team
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-center">
              Self-hosted
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            if (row.isHeader) {
              return (
                <tr key={idx} className="border-t border-border">
                  <td className="px-6 py-3 text-sm font-semibold bg-muted/20">
                    {row.label}
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold border-r-2 border-l-2 bg-muted/20 border-primary/20"></td>
                  <td className="px-6 py-3 text-sm font-semibold bg-muted/20"></td>
                  <td className="px-6 py-3 text-sm font-semibold bg-muted/20"></td>
                  <td className="px-6 py-3 text-sm font-semibold bg-muted/20"></td>
                </tr>
              );
            }
            return (
              <tr
                key={idx}
                className="border-t border-border hover:bg-muted/10"
              >
                <td className="px-6 py-3 text-sm">{row.label}</td>
                <td className="px-6 py-3 text-sm tabular-nums text-center border-r-2 border-l-2 bg-primary/5 border-primary/20">
                  <span
                    className={
                      row.free === "—"
                        ? "text-muted-foreground"
                        : row.free === "✓"
                          ? "text-green-400"
                          : ""
                    }
                  >
                    {row.free}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm tabular-nums text-center">
                  <span
                    className={
                      row.pro === "—"
                        ? "text-muted-foreground"
                        : row.pro === "✓"
                          ? "text-green-400"
                          : ""
                    }
                  >
                    {row.pro}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm tabular-nums text-center">
                  <span
                    className={
                      row.team === "—"
                        ? "text-muted-foreground"
                        : row.team === "✓"
                          ? "text-green-400"
                          : ""
                    }
                  >
                    {row.team}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm tabular-nums text-center">
                  <span
                    className={
                      row.selfHosted === "—"
                        ? "text-muted-foreground"
                        : row.selfHosted === "✓"
                          ? "text-green-400"
                          : ""
                    }
                  >
                    {row.selfHosted}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlanCard({
  name,
  badge,
  rows,
  cta,
}: {
  name: string;
  badge?: string;
  rows: [string, string][];
  cta?: ReactNode;
}) {
  return (
    <div className="flex flex-col p-4 rounded-lg border border-border">
      <div className="flex gap-2 justify-between items-center mb-3">
        <h3 className="font-semibold">{name}</h3>
        {badge ? (
          <span className="text-xs bg-muted px-2 py-0.5 rounded">{badge}</span>
        ) : null}
      </div>
      <ul className="text-sm space-y-1.5 text-muted-foreground">
        {rows.map(([k, v]) => (
          <li key={k} className="flex gap-2 justify-between">
            <span>{k}</span>
            <span className="font-medium tabular-nums text-foreground">
              {v}
            </span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}
