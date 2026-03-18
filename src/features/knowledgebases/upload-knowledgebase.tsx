"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import SliderControl from "@/components/ui/slider-control";
import { cn } from "@/lib/utils";
import { ModelDetails } from "@/service/model";
import { Eye, FileText, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";

type Props = {
  userId: string;
  agentId: string;
  models: ModelDetails[];
};

// Maximum file size, CONSIDER USING HIGHER PROB 10mb
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Zod schema for file validation
const fileSchema = z
  .instanceof(File)
  .refine((file) => file.type === "application/pdf", {
    message: "Please select a PDF file",
  })
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: "File size must be less than 10MB",
  });

export default function UploadKnowledgeForm({
  userId,
  agentId,
  models,
}: Readonly<Props>) {
  const router = useRouter();
  const [chunkSize, setChunkSize] = useState(500);
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [parseMethod, setParseMethod] = useState<"pdf" | "agentic">("pdf");
  const [parseModelId, setParseModelId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableAgenticModels = models.filter(
    (model) => model.isAvailable && model.supportsObjectGeneration,
  );

  useEffect(() => {
    if (availableAgenticModels.length === 0) {
      setParseModelId("");
      return;
    }

    const modelExists = availableAgenticModels.some(
      (model) => model.id === parseModelId,
    );

    if (!modelExists) {
      setParseModelId(availableAgenticModels[0].id);
    }
  }, [availableAgenticModels, parseModelId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const validateFile = (selectedFile: File) => {
    const result = fileSchema.safeParse(selectedFile);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || "Invalid file";
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;

    if (selectedFile) {
      if (!validateFile(selectedFile)) {
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        setFile(null);
        setPdfUrl(null);
        setPreviewMode(false);
        return;
      }

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const fileObjectUrl = URL.createObjectURL(selectedFile);

      setFile(selectedFile);
      setPdfUrl(fileObjectUrl);
      setError(null);
      setPreviewMode(true);
    } else {
      setFile(null);
      setPdfUrl(null);
      setPreviewMode(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0] || null;

    if (droppedFile) {
      if (!validateFile(droppedFile)) {
        return;
      }

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const fileObjectUrl = URL.createObjectURL(droppedFile);

      setFile(droppedFile);
      setPdfUrl(fileObjectUrl);
      setError(null);
      setPreviewMode(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      // Allow re-selecting the same file by clearing previous input value first.
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }

    if (parseMethod === "agentic" && !parseModelId) {
      toast.error("Please select an agentic parsing model");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("chunkSize", chunkSize.toString());
    formData.append("parseMethod", parseMethod);

    if (parseMethod === "agentic") {
      formData.append("parseModelId", parseModelId);
    }

    setIsUploading(true);

    try {
      const res = await fetch(
        `/api/v1/agents/${agentId}/knowledgebases/document`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Upload failed");
      }

      const result = await res.json();

      toast.success(
        result.message || "File uploaded and embedded successfully",
      );
      router.refresh();

      setFile(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setPreviewMode(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
        setError(err.message);
      } else {
        toast.error("Upload failed");
        setError("Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const togglePreviewMode = () => {
    setPreviewMode((prev) => !prev);
  };

  const clearSelection = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setFile(null);
    setPdfUrl(null);
    setPreviewMode(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="shadow-lg bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Upload Knowledge PDF
          </CardTitle>
          <CardDescription>
            Upload PDF documents to train your chatbot with custom knowledge.
            Please make sure the PDF is not password-protected and text based
            (not scanned).
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
            className={cn("grid gap-6 md:grid-cols-2", {
              "md:grid-cols-1": !file || !previewMode,
            })}
          >
            <div>
              <button
                type="button"
                className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors ${
                  file ? "border-primary" : "border-border"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={openFilePicker}
              >
                <input
                  id="pdf-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center @container">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <p
                      className="mb-1 w-full max-w-full break-all px-2 text-center font-medium leading-snug"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">
                      Drag and drop your PDF here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse files
                    </p>
                  </>
                )}
              </button>

              {file && (
                <div className="my-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={togglePreviewMode}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {previewMode ? "Hide Preview" : "Preview"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              )}

              {error && (
                <p className="mt-2 text-sm text-destructive">{error}</p>
              )}

              <Separator className="my-6" />

              <div className="mt-2 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">PDF Parse Method</p>
                  <Select
                    value={parseMethod}
                    onValueChange={(value: "pdf" | "agentic") =>
                      setParseMethod(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parse method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Parse</SelectItem>
                      <SelectItem value="agentic">Agentic Parse</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    PDF Parse uses standard extraction. Agentic Parse uses an
                    LLM for complex layouts.
                  </p>
                </div>

                {parseMethod === "agentic" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Agentic Parse Model</p>
                    <Select
                      value={parseModelId}
                      onValueChange={setParseModelId}
                      disabled={availableAgenticModels.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAgenticModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.provider} / {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableAgenticModels.length === 0 && (
                      <p className="text-xs text-destructive">
                        No available models support object generation.
                      </p>
                    )}
                  </div>
                )}

                <SliderControl
                  label="Chunk Size"
                  minValue={300}
                  maxValue={1500}
                  step={50}
                  defaultValue={[chunkSize]}
                  value={[chunkSize]}
                  onChange={(value) => setChunkSize(value[0])}
                />
                <p className="text-xs">
                  The text will be chunked into smaller parts of this size.
                </p>
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !file}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                      Uploading & Embedding...
                    </>
                  ) : (
                    <>Upload & Embed</>
                  )}
                </Button>
              </div>
            </div>

            <div className={previewMode && pdfUrl ? "block" : "hidden"}>
              <div className="rounded-lg border overflow-hidden h-[400px] bg-muted/30">
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Upload a PDF to preview it here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <p>Supported format: PDF</p>
          {file && <p>Selected: {file.name}</p>}
        </CardFooter>
      </Card>
    </div>
  );
}
