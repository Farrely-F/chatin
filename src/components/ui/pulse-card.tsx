import { cn } from "@/lib/utils";
import React from "react";

interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
  className?: string;
  variant?: "emerald" | "blue" | "purple" | "amber" | "rose";
  size?: "sm" | "md" | "lg";
  glowEffect?: boolean;
  hoverScale?: number;
  interactive?: boolean;
  showGridLines?: boolean;
}

const VARIANTS = {
  emerald: {
    accent: "emerald-500",
    gradient: "from-emerald-500/20 to-emerald-500/0",
    shine:
      "205deg, transparent 0deg, hsl(160deg 95% 39%) 20deg, hsl(160deg 100% 85% / 0.3) 280deg",
    border: "emerald-500/20",
    color: "rgb(16 185 129)",
  },
  blue: {
    accent: "blue-500",
    gradient: "from-blue-500/20 to-blue-500/0",
    shine:
      "205deg, transparent 0deg, hsl(220deg 95% 39%) 20deg, hsl(220deg 100% 85% / 0.3) 280deg",
    border: "blue-500/20",
    color: "rgb(59 130 246)",
  },
  purple: {
    accent: "purple-500",
    gradient: "from-purple-500/20 to-purple-500/0",
    shine:
      "205deg, transparent 0deg, hsl(280deg 95% 39%) 20deg, hsl(280deg 100% 85% / 0.3) 280deg",
    border: "purple-500/20",
    color: "rgb(168 85 247)",
  },
  amber: {
    accent: "amber-500",
    gradient: "from-amber-500/20 to-amber-500/0",
    shine:
      "205deg, transparent 0deg, hsl(40deg 95% 39%) 20deg, hsl(40deg 100% 85% / 0.3) 280deg",
    border: "amber-500/20",
    color: "rgb(245 158 11)",
  },
  rose: {
    accent: "rose-500",
    gradient: "from-rose-500/20 to-rose-500/0",
    shine:
      "205deg, transparent 0deg, hsl(340deg 95% 39%) 20deg, hsl(340deg 100% 85% / 0.3) 280deg",
    border: "rose-500/20",
    color: "rgb(244 63 94)",
  },
};

const SIZES = {
  sm: {
    padding: "p-6 pt-12",
    iconSize: "h-5 w-5",
    titleSize: "text-sm",
    descSize: "text-xs",
  },
  md: {
    padding: "p-8 pt-16",
    iconSize: "h-6 w-6",
    titleSize: "text-base",
    descSize: "text-[15px]",
  },
  lg: {
    padding: "p-10 pt-20",
    iconSize: "h-7 w-7",
    titleSize: "text-lg",
    descSize: "text-base",
  },
};

const GRID_STRUCTURE = {
  columns: [
    { start: 0, width: 22.5 },
    { start: 25, width: 25 },
    { start: 50, width: 25 },
    { start: 75, width: 22.5 },
  ],
  rows: [
    { start: 0, height: 10 },
    { start: 10, height: 22.5 },
    { start: 32.5, height: 22.5 },
  ],
};

export function PulseCard({
  icon,
  actionButton,
  title,
  description,
  className,
  variant = "emerald",
  size = "md",
  hoverScale = 1.01,
  interactive = true,
  glowEffect = false,
  showGridLines = true,
}: Readonly<CardProps>) {
  const variantConfig = VARIANTS[variant];
  const sizeConfig = SIZES[size];

  return (
    <div
      className={cn(
        "group relative z-30 cursor-pointer overflow-hidden rounded-2xl",
        sizeConfig.padding,
        interactive && "transition-transform duration-200",
        interactive && "hover:[transform:scale(var(--card-hover-scale))]",
        // Light mode styles
        "bg-white/80 before:bg-linear-to-b before:from-white/5 before:to-white/20 before:backdrop-blur-3xl",
        "after:bg-linear-to-b after:from-transparent after:via-transparent after:to-white/20",
        // Dark mode styles
        "dark:bg-black/5 dark:before:bg-linear-to-b dark:before:from-black/5 dark:before:to-black/20",
        "dark:after:to-black/20",
        // Common styles
        "before:absolute before:inset-0 before:rounded-[inherit] before:content-['']",
        "after:absolute after:inset-0 after:rounded-[inherit] after:content-['']",
        glowEffect && `hover:before:bg-${variantConfig.accent}/10`,
        // Shadows
        "shadow-[0px_3px_8px_rgba(0,0,0,0.04),0px_12px_20px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0px_5px_15px_rgba(0,0,0,0.03),0px_25px_35px_rgba(0,0,0,0.2)]",
        "dark:shadow-[0px_3px_8px_rgba(0,0,0,0.08),0px_12px_20px_rgba(0,0,0,0.15)]",
        "dark:hover:shadow-[0px_5px_15px_rgba(0,0,0,0.06),0px_25px_35px_rgba(0,0,0,0.4)]",
        className,
      )}
      style={
        {
          "--card-color": variantConfig.color,
          "--card-hover-scale": `${hoverScale}`,
        } as React.CSSProperties
      }
    >
      {/* Moving Border */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[inherit]"
        style={{
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          padding: "2px",
        }}
      >
        <div
          className="absolute inset-[-200%] opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:animate-none"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 340deg, var(--card-color) 360deg)`,
            animation: "spin 4s linear infinite",
          }}
        />
      </div>
      {/* Action Button */}
      {!!actionButton && <>{actionButton}</>}

      {/* Icon */}
      <span className="relative z-50 table rounded-xl p-2.5">
        <span
          className={cn(
            "absolute inset-[4.5px] rounded-[inherit]",
            "bg-linear-to-b from-black/5 to-black/10 backdrop-blur-3xl",
            "dark:from-white/10 dark:to-white/5",
            "transition-[background-color,opacity] duration-300",
          )}
        />
        <span
          className={cn(
            "relative z-1 block transition-colors duration-300",
            "text-black/60 group-hover:text-[var(--card-color)]",
            "dark:text-zinc-400 grid place-content-center",
            sizeConfig.iconSize,
          )}
        >
          {icon}
        </span>
      </span>

      {/* Content */}
      <div className="relative z-30 mt-2 min-w-0">
        <h3
          className={cn(
            "font-medium transition-colors duration-300",
            "text-black/80 group-hover:text-[var(--card-color)]",
            "dark:text-white/80",
            "truncate",
            sizeConfig.titleSize,
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "mt-1 transition-colors duration-300",
            "text-black/60",
            "dark:text-white/40",
            "line-clamp-2 break-words",
            sizeConfig.descSize,
          )}
        >
          {description}
        </p>
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 z-20 overflow-hidden rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:opacity-0">
        <div
          className="absolute bottom-[55%] left-1/2 aspect-square w-[200%] -translate-x-1/2 rounded-[50%]"
          style={{
            background: `conic-gradient(from ${variantConfig.shine}, transparent 360deg)`,
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:radial-gradient(circle_at_70%_8%,black_0%,black_15%,transparent_60%)]">
        <div className="absolute inset-0">
          {/* Grid Lines */}
          {showGridLines && (
            <div className="duration-[350ms] opacity-1 absolute inset-0 transition-opacity group-hover:opacity-100">
              {/* Horizontal Lines */}
              {GRID_STRUCTURE.rows.map((row) => (
                <div
                  key={`h-${row.start}`}
                  className={cn(
                    "duration-[350ms] absolute inset-x-0 h-[1px] origin-[0%_50%] scale-x-0 transition-transform group-hover:scale-x-100",
                    `bg-linear-to-r from-${variantConfig.accent}/0 via-${variantConfig.accent}/20 to-${variantConfig.accent}/0`,
                  )}
                  style={{
                    top: `${row.start}%`,
                    transitionDelay: `${(2 - row.start / 10) * 150}ms`,
                  }}
                />
              ))}
              {/* Vertical Lines */}
              {GRID_STRUCTURE.columns.map((col) => (
                <div
                  key={`v-${col.start}`}
                  className={cn(
                    "duration-[350ms] absolute inset-y-0 w-[1px] origin-[50%_0%] scale-y-0 transition-transform group-hover:scale-y-100",
                    `bg-linear-to-b from-${variantConfig.accent}/0 via-${variantConfig.accent}/20 to-${variantConfig.accent}/0`,
                  )}
                  style={{
                    left: `${col.start + col.width}%`,
                    transitionDelay: `${(2 - col.start / 25) * 150}ms`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Grid Cells */}
          <div className="group-hover:delay-[500ms] absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100 motion-reduce:hidden">
            {GRID_STRUCTURE.rows.map((row, rowIndex) => (
              <React.Fragment key={`row-${row.start}`}>
                {GRID_STRUCTURE.columns.map((col, colIndex) => (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={cn(
                      "absolute animate-tile opacity-0 motion-reduce:animate-none",
                      `bg-linear-to-br ${variantConfig.gradient}`,
                    )}
                    style={{
                      top: `${row.start}%`,
                      left: `${col.start}%`,
                      width: `${col.width}%`,
                      height: `${row.height}%`,
                      animationDelay: `${((rowIndex + colIndex) % 3) * 2}s`,
                    }}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
