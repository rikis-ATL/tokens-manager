"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { TextAnimImg } from "./text-anim-img";

interface TextAnimFigmaProps {
  content: string;
  delay?: number;
  highlight?: string;
  type?: string;
  animateWhenInView?: boolean;
  repeatWhenInView?: boolean;
}

interface BoldSegment {
  content: string;
  isBold: boolean;
}

/** Split a line by __bold__ markers into typed segments. */
function parseBoldSegments(line: string): BoldSegment[] {
  const parts = line.split("__");
  return parts.map((part, i) => ({ content: part, isBold: i % 2 !== 0 }));
}

/** Convert _italic_ markers to <em> tags; returns the HTML string and whether any were found. */
function processItalicText(word: string): { processed: string; hasItalic: boolean } {
  const processed = word.replace(/_([^_]+)_/g, "<em>$1</em>");
  return { processed, hasItalic: processed !== word };
}

export const TextAnimFigma = ({
  content,
  delay = 0,
  highlight: _highlight,
  animateWhenInView = false,
  repeatWhenInView = false,
}: TextAnimFigmaProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isInView = useInView(ref, {
    once: !repeatWhenInView,
    amount: 0.4,
  });

  if (!content) return null;

  const segmentVariants: Variants = {
    hidden: { opacity: 0, x: 10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: delay + i * 0.1, duration: 0.3, ease: "easeOut" },
    }),
  };

  const renderHighlightedSegment = (segment: string) => (
    <span className="inline-flex relative py-0">
      <span style={{ color: "var(--text-accent)" }} className="z-10 px-3">
        {segment}
      </span>
      <span
        className="absolute z-0 w-full h-[80%] top-[10%] rounded-xl"
        style={{ backgroundColor: "var(--surface1)", color: "var(--text-accent)" }}
      />
    </span>
  );

  const renderWord = (word: string, wordIndex: number): React.ReactNode => {
    if (!word) return null;

    // Image markdown: ![alt](url)
    const imageMatch = word.match(/!\[([^\]]*)\]\((.*?)\)/);
    if (imageMatch) {
      const [, altText, rawUrl] = imageMatch;
      const imageUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
      return <TextAnimImg key={wordIndex} imageUrl={imageUrl} altText={altText} index={wordIndex} />;
    }

    // Italic text
    const { processed, hasItalic } = processItalicText(word);
    if (hasItalic) {
      return (
        <motion.span
          key={wordIndex}
          variants={segmentVariants}
          custom={wordIndex}
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    }

    return (
      <motion.span key={wordIndex} variants={segmentVariants} custom={wordIndex}>
        {word}
      </motion.span>
    );
  };

  const renderContent = (text: string): React.ReactNode => {
    const lines = text.split("\n").filter(line => line.trim() !== "");

    return lines.map((line, lineIndex) => {
      const boldSegments = parseBoldSegments(line);

      return (
        <motion.div
          key={lineIndex}
          className="inline-flex gap-2 items-center leading-snug flex-wrap"
          initial="hidden"
          animate="visible"
        >
          {boldSegments.map((segmentData, segmentIndex) => {
            if (segmentData.isBold) {
              return (
                <motion.span key={`bold-${segmentIndex}`} variants={segmentVariants} custom={segmentIndex}>
                  {renderHighlightedSegment(segmentData.content)}
                </motion.span>
              );
            }

            // Regular text — check for images first
            const imageMatch = segmentData.content.match(/!\[[^\]]*\]\((.*?)\)/);
            if (imageMatch) {
              const before = segmentData.content.substring(0, imageMatch.index ?? 0).trim();
              const after = segmentData.content.substring((imageMatch.index ?? 0) + imageMatch[0].length).trim();
              return (
                <React.Fragment key={`img-${segmentIndex}`}>
                  {before.split(" ").filter(Boolean).map((word, wi) => (
                    <React.Fragment key={`before-${wi}`}>
                      {renderWord(word, wi)}
                      {wi < before.split(" ").filter(Boolean).length - 1 && " "}
                    </React.Fragment>
                  ))}
                  {after.split(" ").filter(Boolean).map((word, wi) => (
                    <React.Fragment key={`after-${wi}`}>
                      {renderWord(word, wi)}
                      {wi < after.split(" ").filter(Boolean).length - 1 && " "}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              );
            }

            const words = segmentData.content.split(" ").filter(Boolean);
            return (
              <React.Fragment key={`text-${segmentIndex}`}>
                {words.map((word, wi) => (
                  <React.Fragment key={wi}>
                    {renderWord(word, wi)}
                    {wi < words.length - 1 && " "}
                  </React.Fragment>
                ))}
                {segmentIndex < boldSegments.length - 1 && " "}
              </React.Fragment>
            );
          })}
        </motion.div>
      );
    });
  };

  // Prevent hydration mismatch — static fallback on server
  if (!isClient) {
    return (
      <span className="flex flex-col gap-3" style={{ color: "var(--heading-color)" }}>
        {content}
      </span>
    );
  }

  return (
    <motion.span
      ref={ref}
      initial={{ x: 20 }}
      animate={animateWhenInView ? (isInView ? { x: 0 } : { x: 20 }) : { x: 0 }}
      className="flex flex-col gap-3"
      style={{ color: "var(--heading-color)" }}
    >
      {renderContent(content)}
    </motion.span>
  );
};
