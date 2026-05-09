"use client";

import { motion } from "framer-motion";
import React from "react";

interface ImageProps {
  url: string;
  index?: number;
  altText: string;
}

interface TextAnimImgProps {
  imageUrl: string;
  altText: string;
  index?: number;
  theme?: 'pill' | 'inline' | 'none';
  delay?: number;
}

const segmentVariants = {
  hidden: { opacity: 0, x: 10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.1, duration: 0.3, ease: "easeOut" },
  }),
};

const delayInterval = 0.1;

const ImagePill = ({ url, index = 0, altText }: ImageProps) => (
  <motion.div
    key={index}
    initial={{ width: '1em', opacity: 0 }}
    animate={{ width: '3em', opacity: 1 }}
    transition={{ duration: 0.5, ease: "easeOut", delay: index * delayInterval }}
    className="inline-flex justify-center items-center rounded-xl h-[1em]"
    style={{
      backgroundImage: `url(${url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
  >
    <motion.img
      className="inline h-[1em]"
      src={url}
      alt={altText}
      variants={segmentVariants}
      custom={index}
      animate="visible"
      initial="hidden"
    />
  </motion.div>
);

const ImageInline = ({ url, index = 0, altText }: ImageProps) => (
  <motion.img
    key={index}
    className="inline h-[1em]"
    src={url}
    alt={altText}
    variants={segmentVariants}
    custom={index}
    animate="visible"
    initial="hidden"
  />
);

const getImgStyle = (imgUrl: string, index: number, theme: TextAnimImgProps['theme'], altText: string) => {
  switch (theme) {
    case 'pill':
      return <ImagePill url={imgUrl} index={index} altText={altText} />;
    case 'inline':
      return <ImageInline url={imgUrl} index={index} altText={altText} />;
    default:
      return null;
  }
};

export const TextAnimImg = ({ imageUrl, altText, index = 0, theme = 'inline' }: TextAnimImgProps) => {
  return <>{getImgStyle(imageUrl, index, theme, altText)}</>;
};
