"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface ApiKeyDisplayProps {
  apiKey: string;
  onDone: () => void;
}

export function ApiKeyDisplay({ apiKey, onDone }: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const renderedApiKey = (key: string) => {
    const [first, rest] = key.split("-");

    const maskedRest = rest
      .split("")
      .map(() => "*")
      .join("");

    return `${first}-${maskedRest}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your New API Key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-200/50 text-red-500/80 p-3 rounded-md">
          <p>
            Make sure to copy your API key now. You won&apos;t be able to see it
            again!
          </p>
        </div>

        <div className="p-3 bg-muted rounded-md font-mono text-sm break-all relative">
          {renderedApiKey(apiKey)}
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-2 top-2"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onDone} className="w-full">
          I&apos;ve Saved My API Key
        </Button>
      </CardFooter>
    </Card>
  );
}
