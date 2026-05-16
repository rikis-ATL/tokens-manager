type MarketingDotMatrixProps = {
  className?: string;
};

export function MarketingDotMatrix({ className = "opacity-[0.22]" }: MarketingDotMatrixProps) {
  return (
    <div
      className={`absolute inset-0 z-0 ${className}`}
      aria-hidden
      style={{
        backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}
