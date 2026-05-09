"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { TextAnimImg } from "./text-anim-img";

interface TextAnimNavigatorsProps {
  content: string;
  delay?: number;
  highlight?: string;
  animateWhenInView?: boolean;
  repeatWhenInView?: boolean;
  type?: string;
  align?: string;
}

export const TextAnimNavigators = ({
  content,
  delay = 0,
  highlight: _highlight,
  animateWhenInView = false,
  repeatWhenInView = false,
}: TextAnimNavigatorsProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const stagger = 0.08;           // delay between each word appearing
  const wordFadeIn = 0.4;         // how long each word takes to fade in
  const previewDuration = 0.5;    // how long the preview flash plays per word
  // preview keyframe: flash in quickly, hold briefly, fade out
  const previewTimes = [0, 0.25, 0.6, 1] as const;

  const isInView = useInView(ref, {
    once: !repeatWhenInView,
    amount: 0.4,
  });

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  // Word text: starts hidden, fades in and stays
  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { ease: "easeOut", duration: wordFadeIn },
    },
  };

  // Preview span: flashes in then fades out as the word appears
  const previewVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      transition: {
        ease: "easeOut",
        duration: previewDuration,
        times: previewTimes,
      },
    },
  };

  const renderPreviewSpan = () => (
    <motion.span
      variants={previewVariants}
      className="absolute left-0 inline-flex items-center justify-center w-full h-[90%] top-[5%] px-2 rounded-xl bg-slate-200/30 backdrop-blur-sm border border-slate-300/20"
    >
      <span className="w-full h-full" />
    </motion.span>
  );

  const renderWord = (word: string, wordIndex: number): React.ReactNode => {
    // Check if the word contains an image markdown syntax
    const imageMatch = word.match(/!\[([^\]]*)\]\((.*?)\)/);

    if (imageMatch) {
      const [, altText, url] = imageMatch;
      const imageUrl = url.startsWith("//") ? `https:${url}` : url;
      return (
        <div className="inline-block relative mr-2" key={wordIndex}>
          <motion.span variants={wordVariants} className="inline-block">
            <TextAnimImg imageUrl={imageUrl} altText={altText} index={wordIndex} />
          </motion.span>
          {renderPreviewSpan()}
        </div>
      );
    }

    // Check for bold/highlighted segments indicated by __
    const segments = word.split("__");
    if (segments.length > 1) {
      return (
        <div className="inline-block relative mr-2" key={wordIndex}>
          <motion.span variants={wordVariants} className="inline-block">
            {segments.map((segment, segmentIndex) => (
              <React.Fragment key={segmentIndex}>
                {segmentIndex % 2 === 0 ? (
                  <span>{segment}</span>
                ) : (
                  <span className="inline-flex relative py-0">
                    <span style={{ color: 'var(--text-accent)' }} className="z-10 px-3">
                      {segment}
                    </span>
                    <span
                      className="absolute z-0 w-full h-[80%] top-[10%] rounded-xl"
                      style={{ backgroundColor: 'var(--surface1)', color: 'var(--text-accent)' }}
                    />
                  </span>
                )}
              </React.Fragment>
            ))}
          </motion.span>
          {renderPreviewSpan()}
        </div>
      );
    }

    return (
      <div className="inline-block relative mr-2" key={wordIndex}>
        <motion.span variants={wordVariants} className="inline-block">
          {word}
        </motion.span>
        {renderPreviewSpan()}
      </div>
    );
  };

  // Prevent hydration mismatch by only rendering animations on the client
  if (!isClient) {
    return (
      <div className="flex flex-wrap">
        <span>{content}</span>
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={animateWhenInView ? (isInView ? "visible" : "hidden") : "visible"}
      className="flex flex-wrap gap-y-1"
    >
      {content.split(" ").map((word, wordIndex) => renderWord(word, wordIndex))}
    </motion.div>
  );
};
