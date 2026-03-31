"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

type DatePickerProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
};

function parseDateInputValue(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export function DatePicker({
  name,
  defaultValue,
  placeholder = "Pick a date",
  className,
  disabled,
  minYear = new Date().getFullYear() - 10,
  maxYear = new Date().getFullYear() + 10,
}: Readonly<DatePickerProps>) {
  const initialDate = React.useMemo(
    () => parseDateInputValue(defaultValue),
    [defaultValue],
  );
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    initialDate,
  );
  const [open, setOpen] = React.useState(false);

  const displayValue = selectedDate ? format(selectedDate, "PPP") : placeholder;
  const inputValue = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  return (
    <>
      <input type="hidden" name={name} value={inputValue} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-44 justify-between font-normal",
              !selectedDate && "text-muted-foreground",
              className,
            )}
            disabled={disabled}
          >
            {displayValue}
            <CalendarIcon aria-hidden="true" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={new Date(minYear, 0)}
            endMonth={new Date(maxYear, 11)}
            defaultMonth={selectedDate}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
