"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextAnimNavigators } from "../ui/motion/text-anim-navigators";
import { MarketingDotMatrix } from "@/components/marketing/MarketingDotMatrix";
import { FeatureComparisonTable } from "@/components/marketing/FeatureComparisonTable";
import { PaidTiersComingSoonDialog } from "@/components/demo/PaidTiersComingSoonDialog";

export function DemoLanding({ demoUrl }: { demoUrl: string }) {
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  return (
    <div
      data-marketing="true"
      className="overflow-hidden relative min-h-screen bg-background"
    >
      <MarketingDotMatrix />

      <header className="flex relative z-10 flex-col gap-4 justify-center items-center w-full min-h-[calc(100vh-15rem)]">
       
       <div className="flex flex-col gap-8 max-w-3xl">

     
          <div className="flex flex-col col-span-4 gap-8">
          <h1 className="text-6xl font-bold tracking-tight text-foreground text-balance">
              <TextAnimNavigators
                content="The visual editor and library for design tokens at scale."
                delay={0}
                highlight="background"
              />
            </h1>
            <p className="text-xl text-muted-foreground">
            Your central token store.
             Edit visually and ship to design and code.<br/>
             <span className="text-foreground">
             Create your organization to get started.
             </span>
            </p>
          </div>

          <div className="grid grid-cols-2 col-span-6 col-start-7 gap-10 items-stretch self-end pt-8 group">
            {/* <Link
              href="/auth/signup">
                  <Button className="mt-2 w-full h-11 text-md">Create a free org</Button>
              </Link> */}
            
            <Link
              href="/auth/signup"
              className="flex relative flex-col gap-4 self-end h-full"
            >
              {/* <div className="absolute right-0 top-0 h-3 w-3 translate-x-[50%] translate-y-[-50%] animate-pulse rounded-full bg-lime-500" /> */}
              <h2 className="font-semibold text-md">Create a free org</h2>
              <p className="flex-1 text-sm text-muted-foreground">
                Register for your own workspace. <br/>
                Free includes 1 collection, 2 themes per
                collection, GitHub and Figma sync, and up to 100 exports per month. 
                Upgrade to Pro or self-host for unlimited use.
              </p>
              <Button className="mt-2 w-full h-11 text-md">Create a Free Org</Button>
            </Link>



            <Link
              href={demoUrl}
         className="flex relative flex-col gap-4 self-end h-full"
            >
              {/* <div className="absolute right-0 top-0 h-3 w-3 translate-x-[50%] translate-y-[-50%] animate-pulse rounded-full bg-lime-500" /> */}
              <h2 className="font-semibold text-md">Try the shared demo</h2>
              <p className="flex-1 text-sm text-muted-foreground text-balance">
                Explore a live playground with sample collections. <br/>
                Edit the app theme to see live updates in action. <br/>
                View collections from popular design systems. <br/>
                Any changes will be saved to local storag.

              </p>
              <Button variant="secondary" className="mt-2 w-full h-11 text-md">Try the Demo</Button>

            </Link>
          </div>
          </div>
      </header>
      <div className="relative z-10 px-5 py-16 mx-auto space-y-16 max-w-6xl">
       

        {/* Feature Table */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg">Feature comparison</h2>
            <Button type="button" onClick={() => setUpgradeDialogOpen(true)}>
              Upgrade plan
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border shadow-xl bg-card border-border">
            <FeatureComparisonTable />
          </div>
        </div>

        {/* About Section */}
        {/* <div className="mx-auto max-w-6xl">
          <div className="p-8 rounded-2xl border shadow-xl bg-card border-border">
            <h2 className="mb-4 text-xl font-semibold">Feedback</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                This project is built to help manage design tokens for our internal design system.
                I created this to avoid the pains of editing tokens in json format. 
                It is a hosted Style Dictionary build environment with a visual UI, advanced tokens generation and synchronization capabilities.
              </p>
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
        </div> */}
      </div>

      <PaidTiersComingSoonDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
      />
    </div>
  );
}
