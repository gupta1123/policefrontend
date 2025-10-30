"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { Loader2, Upload, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import dynamic from "next/dynamic";

// Dynamically import PDF viewer only on client side
const PDFViewer = dynamic(
  () => import("@/components/pdf-viewer-temp").then((mod) => mod.PDFViewer),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>
  }
);

interface DocumentUploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  folderId?: string;
  onSuccess?: () => void;
}

type WizardStep = "upload" | "processing" | "review" | "saving";

interface UploadedFile {
  path: string;
  originalname: string;
  size: number;
  mimetype: string;
}

interface OCRPage {
  page_num: number;
  text: string;
  ocr_confidence: number;
}

interface AnalysisResult {
  success: boolean;
  ocr: {
    text: string;
    pages: OCRPage[];
    total_pages: number;
    avg_confidence: number;
  };
  metadata: any;
  extractionConfidence: number;
  warnings: string[];
}

const createInitialFormData = () => ({
  acts: [] as string[],
  sections: [] as string[],
  informant: {
    name: "",
    phone: "",
    addr: "",
  },
});

export function DocumentUploadWizard({
  isOpen,
  onClose,
  folderId,
  onSuccess,
}: DocumentUploadWizardProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(() => createInitialFormData());

  const formatDateForInput = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  };

  const handleDateChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value ? new Date(value).toISOString() : null,
    }));
  };

  // Reset wizard state
  const resetWizard = () => {
    setStep("upload");
    setSelectedFile(null);
    setUploadedFile(null);
    setAnalysisResult(null);
    setProcessing(false);
    setSaving(false);
    setError(null);
    setFormData(createInitialFormData());
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  // Step 1: Upload file temporarily
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setProcessing(true);
      setError(null);

      const result = await apiClient.documents.uploadTemp(
        selectedFile,
        folderId,
        selectedFile.name
      );

      setUploadedFile(result.file);
      setStep("upload"); // Stay on upload step, show Analyze button
      setProcessing(false);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setProcessing(false);
    }
  };

  // Step 2: Analyze document
  const handleAnalyze = async () => {
    if (!uploadedFile) return;

    try {
      setProcessing(true);
      setError(null);
      setStep("processing");

      const result: AnalysisResult = await apiClient.documents.analyze(
        uploadedFile.path
      );

      setAnalysisResult(result);
      
      // Pre-fill form with extracted metadata
      const domainMetadata = result.metadata || {};
      setFormData({
        ...createInitialFormData(),
        ...domainMetadata,
        sections: Array.isArray(domainMetadata.sections) ? domainMetadata.sections : [],
        acts: Array.isArray(domainMetadata.acts) ? domainMetadata.acts : [],
        informant: domainMetadata.informant || {
          name: "",
          phone: "",
          addr: "",
        },
      });
      
      setStep("review");
      setProcessing(false);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
      setStep("upload");
      setProcessing(false);
    }
  };

  // Step 3: Save document
  const handleSave = async () => {
    if (!uploadedFile || !analysisResult) return;

    try {
      setSaving(true);
      setError(null);

      await apiClient.documents.save({
        filePath: uploadedFile.path,
        title: formData.title || uploadedFile.originalname,
        folderId: folderId,
        metadata: formData,
        ocrData: {
          text: analysisResult.ocr.text,
          pages: analysisResult.ocr.pages,
          total_pages: analysisResult.ocr.total_pages,
          extractionConfidence: analysisResult.extractionConfidence,
        },
      });

      setSaving(false);
      resetWizard();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Save failed");
      setSaving(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !processing && !saving && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select PDF File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  disabled={processing}
                  className="mt-2"
                />
              </div>

              {selectedFile && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <strong>File:</strong> {selectedFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>

                {uploadedFile && (
                  <Button onClick={handleAnalyze} disabled={processing}>
                    <Check className="mr-2 h-4 w-4" />
                    Analyze
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Processing Document</h3>
              <p className="text-muted-foreground text-center">
                Extracting text and metadata... This may take a moment.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Edit */}
        {step === "review" && analysisResult && (
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Metadata Form */}
            <Card>
              <CardHeader>
                <CardTitle>Edit Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title ?? uploadedFile?.originalname ?? ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>FIR Number</Label>
                    <Input
                      value={formData.fir_number ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, fir_number: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>FIR Year</Label>
                    <Input
                      type="number"
                      value={formData.fir_year ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          fir_year: e.target.value ? parseInt(e.target.value) || null : null,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>District</Label>
                    <Input
                      value={formData.district ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, district: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Police Station</Label>
                    <Input
                      value={formData.police_station ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, police_station: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Acts</Label>
                    <Input
                      value={formData.acts?.join(", ") ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          acts: value
                            ? value
                                .split(",")
                                .map((act) => act.trim())
                                .filter(Boolean)
                            : [],
                        }));
                      }}
                      placeholder="e.g., IPC 307, Arms Act"
                    />
                  </div>
                  <div>
                    <Label>Sections</Label>
                    <Input
                      value={formData.sections?.join(", ") ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          sections: value
                            ? value
                                .split(",")
                                .map((section) => section.trim())
                                .filter(Boolean)
                            : [],
                        }));
                      }}
                      placeholder="e.g., 302, 307"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Information Mode</Label>
                    <Input
                      value={formData.information_mode ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, information_mode: e.target.value }))
                      }
                      placeholder="e.g., Written complaint"
                    />
                  </div>
                  <div>
                    <Label>GD Entry Number</Label>
                    <Input
                      value={formData.gd_entry_no ?? ""}
                      onChange={(e) =>
                        setFormData((prev: any) => ({ ...prev, gd_entry_no: e.target.value }))
                      }
                      placeholder="e.g., GD/1234"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Registration Timestamp</Label>
                    <Input
                      type="datetime-local"
                      value={formatDateForInput(formData.registration_ts)}
                      onChange={(e) => handleDateChange("registration_ts", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>GD Entry Timestamp</Label>
                    <Input
                      type="datetime-local"
                      value={formatDateForInput(formData.gd_entry_ts)}
                      onChange={(e) => handleDateChange("gd_entry_ts", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Occurrence From</Label>
                    <Input
                      type="datetime-local"
                      value={formatDateForInput(formData.occurrence_from_ts)}
                      onChange={(e) => handleDateChange("occurrence_from_ts", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Occurrence To</Label>
                    <Input
                      type="datetime-local"
                      value={formatDateForInput(formData.occurrence_to_ts)}
                      onChange={(e) => handleDateChange("occurrence_to_ts", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Place of Occurrence</Label>
                  <Textarea
                    value={formData.place_address ?? ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({ ...prev, place_address: e.target.value }))
                    }
                    rows={3}
                    placeholder="Enter location details"
                  />
                </div>

                <div>
                  <Label>Summary</Label>
                  <Textarea
                    value={formData.summary ?? ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({ ...prev, summary: e.target.value }))
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Informant</Label>
                  <Input
                    value={formData.informant?.name ?? ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        informant: {
                          ...(prev.informant || {}),
                          name: e.target.value,
                        },
                      }))
                    }
                    placeholder="Name"
                  />
                  <Input
                    value={formData.informant?.phone ?? ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        informant: {
                          ...(prev.informant || {}),
                          phone: e.target.value,
                        },
                      }))
                    }
                    placeholder="Phone"
                  />
                  <Textarea
                    value={formData.informant?.addr ?? ""}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        informant: {
                          ...(prev.informant || {}),
                          addr: e.target.value,
                        },
                      }))
                    }
                    rows={3}
                    placeholder="Address"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Document"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStep("upload")}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right: PDF Viewer & OCR Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pdf" className="h-[70vh]">
                  <TabsList>
                    <TabsTrigger value="pdf">PDF</TabsTrigger>
                    <TabsTrigger value="ocr">OCR Text</TabsTrigger>
                  </TabsList>

                  <TabsContent value="pdf" className="h-[calc(70vh-3rem)] overflow-auto">
                    {uploadedFile?.mimetype === "application/pdf" && selectedFile ? (
                      <PDFViewer file={selectedFile} />
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        PDF preview not available
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="ocr" className="h-[calc(70vh-3rem)] overflow-auto">
                    <div className="space-y-4">
                      {analysisResult.ocr.pages.map((page, index) => (
                        <div key={index} className="border rounded p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Page {page.page_num}</h4>
                            <span className="text-xs text-muted-foreground">
                              Confidence: {(page.ocr_confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{page.text}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
