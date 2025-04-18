"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface SliderControlProps {
  className?: string;
  minValue: number;
  maxValue: number;
  step: number;
  defaultValue: [number];
  value?: [number];
  onChange?: (value: [number]) => void;
  label?: string;
}

export default function SliderControl({
  className,
  minValue,
  maxValue,
  step,
  defaultValue,
  value,
  onChange,
  label,
}: SliderControlProps) {
  const isControlled = value !== undefined && onChange !== undefined;
  const initialValue = value ?? defaultValue;

  const [sliderValue, setSliderValue] = useState<[number]>(initialValue);
  const [inputValue, setInputValue] = useState<string>(
    initialValue[0].toString(),
  );

  const showReset = useMemo(() => {
    return sliderValue[0] !== defaultValue[0];
  }, [sliderValue, defaultValue]);

  // Sync internal state with controlled value
  useEffect(() => {
    if (isControlled && value) {
      setSliderValue(value);
      setInputValue(value[0].toString());
    }
  }, [value]);

  const handleSliderChange = (newValue: [number]) => {
    setSliderValue(newValue);
    setInputValue(newValue[0].toString());
    if (isControlled && onChange) onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const validateAndUpdateValue = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(minValue, Math.min(maxValue, parsed));
      const rounded = Math.round(clamped / step) * step;
      const newVal: [number] = [parseFloat(rounded.toFixed(2))];
      setSliderValue(newVal);
      if (isControlled && onChange) onChange(newVal);
    } else {
      // Reset input to current slider value
      setInputValue(sliderValue[0].toString());
    }
  };

  const resetToDefault = () => {
    setSliderValue(defaultValue);
    setInputValue(defaultValue[0].toString());
    if (isControlled && onChange) onChange(defaultValue);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="font-normal">{label}</Label>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "size-7 transition-all text-muted-foreground/70 hover:text-foreground hover:bg-transparent",
                    showReset ? "opacity-100" : "opacity-0 pointer-events-none",
                  )}
                  aria-label="Reset"
                  onClick={resetToDefault}
                  type="button"
                >
                  <RefreshCcw size={16} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="dark px-2 py-1 text-xs">
                Reset to default
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            className="h-6 w-11 px-1 py-0 border-none tabular-nums text-right bg-transparent shadow-none focus:bg-background"
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={validateAndUpdateValue}
            aria-label="Enter value"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          className="grow [&>*:first-child]:bg-black/10"
          value={sliderValue}
          onValueChange={handleSliderChange}
          min={minValue}
          max={maxValue}
          step={step}
          aria-label={label}
        />
      </div>
    </div>
  );
}
