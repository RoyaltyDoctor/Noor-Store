import React, { useRef, useState, useEffect } from "react";

export const TextFitter: React.FC<{
  children: React.ReactNode;
  origin?: "right" | "center" | "left";
  className?: string;
}> = ({ children, origin = "right", className = "w-full" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const content = container.firstElementChild as HTMLElement;
    if (!content) return;

    const containerWidth = container.offsetWidth;
    // adding a tiny buffer (1px) to avoid precision rounding issues that could cause clip
    const contentWidth = content.scrollWidth + 1;

    if (contentWidth > containerWidth && containerWidth > 0) {
      setScale(containerWidth / contentWidth);
    } else {
      setScale(1);
    }
  };

  useEffect(() => {
    updateScale();
  }, [children]);

  useEffect(() => {
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  let justifyContent = "flex-start";
  if (origin === "center") justifyContent = "center";
  if (origin === "left") justifyContent = "flex-end"; // RTL flex-end is visually left

  return (
    <div
      ref={containerRef}
      className={`flex min-w-0 max-w-full items-center overflow-hidden ${className}`}
      style={{ justifyContent }}
    >
      <div
        className="whitespace-nowrap transition-transform duration-100 ease-out"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: origin,
        }}
      >
        {children}
      </div>
    </div>
  );
};
