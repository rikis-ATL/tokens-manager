"use client";

import React from "react";
import { TextAnimNavigators } from "./text-anim-navigators";

export const HighlightStyle = {
  NONE: "none",
  TEXT: "text",
  BACKGROUND: "background",
  HIGHLIGHT: "highlight",
  UNDERLINE: "underline",
} as const;

export const AnimStyle = {
  NAVIGATORS: "navigators",
} as const;

export const AnimTextOrder = {
  ONE: 0,
  TWO: 0.3,
  THREE: 0.6,
  FOUR: 0.9,
  FIVE: 1.2,
} as const;

type AnimStyleValue = typeof AnimStyle[keyof typeof AnimStyle];
type HighlightStyleValue = typeof HighlightStyle[keyof typeof HighlightStyle];

interface AnimatedTextProps {
  content: string;
  type?: AnimStyleValue;
  highlight?: HighlightStyleValue | string;
  delay?: number;
  align?: string;
}

const AnimatedText = ({ type, highlight = HighlightStyle.BACKGROUND, content, delay, align }: AnimatedTextProps) => {
  if (!content) return null;

  switch (type) {
    case AnimStyle.NAVIGATORS:
    default:
      return <TextAnimNavigators content={content} highlight={highlight} delay={delay} align={align} />;
  }
};

export default AnimatedText;
