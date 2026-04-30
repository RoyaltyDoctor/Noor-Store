import React, { useRef, useState, useLayoutEffect, useEffect } from "react";

export const TextFitter: React.FC<{
  children: React.ReactNode;
  origin?: "right" | "center" | "left";
  className?: string;
}> = ({ children, origin = "right", className = "w-full" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const content = container.firstElementChild as HTMLElement;
    if (!content) return;

    let animationFrameId: number;

    const updateScale = () => {
      // Reset scale to 1 temporarily to get the natural unscaled width of the content
      // and the natural width of the container
      
      const containerWidth = container.offsetWidth;
      // We must measure the content width WITHOUT the scale applied, 
      // but since scale is applied dynamically via JS, we should just read scrollWidth / currentScale ?
      // No, scrollWidth gets floor'd. It's safer to read the scrollWidth if we hadn't scaled it.
      // Easiest is to measure the bounding rect and divide by current scale.
      
      // Let's use getBoundingClientRect() to avoid integer rounding issues
      const contentRect = content.getBoundingClientRect();
      // current visual width of the element:
      const currentVisualWidth = contentRect.width;
      
      // The unscaled width is:
      let unscaledContentWidth = currentVisualWidth;
      
      // The component applies transform: scale() to the element. 
      // Fortunately getBoundingClientRect includes transforms. 
      // However scrollWidth is unaffected by transform scale (it reports pre-transform width).
      // Let's use scrollWidth for the content to guarantee we capture overflowing text!
      const contentWidth = content.scrollWidth + 1; // 1px buffer

      if (contentWidth > containerWidth && containerWidth > 0) {
        setScale(containerWidth / contentWidth);
      } else {
        setScale(1);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      // Debounce slightly using requestAnimationFrame to prevent 'ResizeObserver loop limit exceeded'
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateScale);
    });

    resizeObserver.observe(container);
    resizeObserver.observe(content);

    // Initial check
    updateScale();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [children]);

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

