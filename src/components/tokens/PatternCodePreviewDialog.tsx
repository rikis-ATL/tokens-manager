"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import a11yOneLight from "react-syntax-highlighter/dist/esm/styles/prism/a11y-one-light.js";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type PatternTokenValue,
  type TokenType,
  isPatternTokenType,
  inferTokenTypeForPatternValue,
} from "@/types";
import { showSuccessToast, showErrorToast } from "@/utils/toast.utils";

export type PatternPreviewSection = {
  id: string;
  label: string;
  language: "css" | "markup";
  code: string;
};

function sectionsForPattern(
  tokenType: TokenType,
  pattern: PatternTokenValue,
): PatternPreviewSection[] {
  const effective = isPatternTokenType(tokenType)
    ? tokenType
    : inferTokenTypeForPatternValue(pattern, tokenType);

  if (effective === "cssClass") {
    return [
      { id: "css", label: "CSS", language: "css", code: pattern.body },
    ];
  }
  if (effective === "htmlTemplate") {
    return [
      { id: "html", label: "HTML", language: "markup", code: pattern.body },
    ];
  }
  if (effective === "htmlCssComponent") {
    return [
      { id: "html", label: "HTML", language: "markup", code: pattern.body },
      {
        id: "css",
        label: "CSS",
        language: "css",
        code: pattern.css ?? "",
      },
    ];
  }
  return [
    {
      id: "content",
      label: "Content",
      language: "markup",
      code: pattern.body,
    },
  ];
}

function combinedCopyText(sections: PatternPreviewSection[]): string {
  if (sections.length === 1) return sections[0].code;
  return sections
    .map((s) => `/* ${s.label} */\n${s.code}`)
    .join("\n\n---\n\n");
}

export interface PatternCodePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tokenType: TokenType;
  pattern: PatternTokenValue;
}

export function PatternCodePreviewDialog({
  open,
  onClose,
  title,
  tokenType,
  pattern,
}: PatternCodePreviewDialogProps) {
  const sections = useMemo(
    () => sectionsForPattern(tokenType, pattern),
    [tokenType, pattern.name, pattern.body, pattern.css],
  );

  const [activeTab, setActiveTab] = useState(sections[0]?.id ?? "html");

  const firstSectionId = sections[0]?.id;
  useEffect(() => {
    if (open && firstSectionId) setActiveTab(firstSectionId);
  }, [open, firstSectionId]);

  const copyText = useCallback(
    async (text: string, message: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showSuccessToast(message);
      } catch {
        showErrorToast("Could not copy to clipboard");
      }
    },
    [],
  );

  const handleCopySection = useCallback(() => {
    const current = sections.find((s) => s.id === activeTab) ?? sections[0];
    if (!current) return;
    void copyText(current.code, `${current.label} copied`);
  }, [sections, activeTab, copyText]);

  const handleCopyAll = useCallback(() => {
    void copyText(
      combinedCopyText(sections),
      sections.length > 1 ? "All sections copied" : "Copied",
    );
  }, [sections, copyText]);

  const body = (section: PatternPreviewSection) => (
    <div className="rounded-md border border-gray-200 overflow-hidden bg-gray-50">
      <SyntaxHighlighter
        language={section.language}
        style={a11yOneLight}
        customStyle={{
          margin: 0,
          maxHeight: "min(50vh, 420px)",
          overflow: "auto",
          borderRadius: "0.375rem",
          fontSize: "0.75rem",
          lineHeight: 1.5,
        }}
        codeTagProps={{ className: "font-mono text-xs" }}
        showLineNumbers={section.code.split("\n").length > 8}
        wrapLines
        wrapLongLines
      >
        {section.code || "(empty)"}
      </SyntaxHighlighter>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0">
        <DialogHeader>
          <DialogTitle className="pr-8">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 py-4">
          {sections.length === 1 ? (
            body(sections[0])
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-2">
                {sections.map((s) => (
                  <TabsTrigger key={s.id} value={s.id}>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {sections.map((s) => (
                <TabsContent key={s.id} value={s.id} className="mt-0">
                  {body(s)}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-row flex-wrap justify-end border-t pt-4">
          <Button type="button" variant="outline" onClick={() => void handleCopySection()}>
            Copy {sections.find((s) => s.id === activeTab)?.label ?? "section"}
          </Button>
          {sections.length > 1 && (
            <Button type="button" variant="outline" onClick={() => void handleCopyAll()}>
              Copy all
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
