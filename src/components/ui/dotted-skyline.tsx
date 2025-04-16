"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export default function DottedSkyline({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const width = (canvas.width = 800);
    const height = (canvas.height = 400);

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    // Define building shapes (x, width, height)
    const buildings = [
      { x: 0, width: 80, height: 180 },
      { x: 90, width: 60, height: 220 },
      { x: 160, width: 70, height: 280 },
      { x: 240, width: 100, height: 200 },
      { x: 350, width: 80, height: 300 },
      { x: 440, width: 120, height: 250 },
      { x: 570, width: 90, height: 320 },
      { x: 670, width: 130, height: 270 },
    ];

    // Dot properties
    const dotSize = 4;
    const dotSpacing = 8;
    const dotColor = "rgba(20, 30, 50, 0.8)";

    // Draw buildings using dots
    buildings.forEach((building) => {
      const buildingTop = height - building.height;

      // Calculate dot positions within building
      for (
        let x = building.x;
        x < building.x + building.width;
        x += dotSpacing
      ) {
        for (let y = buildingTop; y < height; y += dotSpacing) {
          // Add some randomness to create a more organic look
          if (Math.random() > 0.1) {
            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    });

    // Add some random dots in the skyline for texture
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.5 + height * 0.5;

      if (isPointInBuilding(x, y, buildings, height)) {
        ctx.fillStyle = "rgba(20, 30, 50, 0.4)";
        ctx.beginPath();
        ctx.arc(x, y, dotSize / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // Helper function to check if a point is inside any building
  function isPointInBuilding(
    x: number,
    y: number,
    buildings: { x: number; width: number; height: number }[],
    canvasHeight: number,
  ) {
    for (const building of buildings) {
      const buildingTop = canvasHeight - building.height;
      if (
        x >= building.x &&
        x <= building.x + building.width &&
        y >= buildingTop &&
        y <= canvasHeight
      ) {
        return true;
      }
    }
    return false;
  }

  return (
    <div
      className={cn("relative w-full max-w-[800px] mx-auto", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full h-auto"
      />
    </div>
  );
}
