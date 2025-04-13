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
import { Input } from "@/components/ui/input";
import SliderControl from "@/components/ui/slider-control";
import { Check, Eye, FileText, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Props = {
  userId: string;
  agentId: string;
};

export default function UploadKnowledgeForm({ userId, agentId }: Props) {
  const router = useRouter();
  const [chunkSize, setChunkSize] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;

    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a PDF file");
        setFile(null);
        setPdfUrl(null);
        return;
      }

      // Revoke previous URL if it exists
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Create a URL for the file preview
      const fileObjectUrl = URL.createObjectURL(selectedFile);

      setFile(selectedFile);
      setPdfUrl(fileObjectUrl);
      setError(null);
    } else {
      setFile(null);
      setPdfUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0] || null;

    if (droppedFile) {
      if (droppedFile.type !== "application/pdf") {
        setError("Please select a PDF file");
        return;
      }

      // Revoke previous URL if it exists
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Create a URL for the file preview
      const fileObjectUrl = URL.createObjectURL(droppedFile);

      setFile(droppedFile);
      setPdfUrl(fileObjectUrl);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("chunkSize", chunkSize.toString());
    // formData.append("agentId", agentId);

    setIsUploading(true);

    try {
      const res = await fetch(`/api/v1/agents/${agentId}/knowledgebases`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Upload failed");
      }

      toast.success("File uploaded and embedded!");
      router.refresh();

      // Clear the form
      setFile(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setPreviewMode(false);
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
    setPreviewMode(!previewMode);
  };

  const clearSelection = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setFile(null);
    setPdfUrl(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="shadow-lg bg-white dark:bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Upload Knowledge PDF
          </CardTitle>
          <CardDescription>
            Upload PDF documents to train your chatbot with custom knowledge
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors ${
                  file ? "border-primary" : "border-border"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById("pdf-upload")?.click()}
              >
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium mb-1">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePreviewMode();
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {previewMode ? "Hide Preview" : "Preview"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSelection();
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
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
              </div>

              {/* {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )} */}

              <div className="mt-2 space-y-4">
                <SliderControl
                  label="Chunk Size"
                  minValue={0}
                  maxValue={1000}
                  step={10}
                  defaultValue={[chunkSize]}
                  onChange={(chunkSize) => setChunkSize(chunkSize[0])}
                />
                <p className="text-xs">
                  Higher values may result in less accurate response
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
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Upload & Embed
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div
              className={`${previewMode && pdfUrl ? "block" : "hidden"} md:block`}
            >
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
