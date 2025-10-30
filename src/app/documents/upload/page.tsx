"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { Loader2, Upload, Check, AlertCircle, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import PDF viewer only on client side
const PDFViewer = dynamic(
  () => import("@/components/pdf-viewer-temp").then((mod) => mod.PDFViewer),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>
  }
);

type WizardStep = "upload" | "processing" | "review";

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

export default function DocumentUploadPage() {
  const router = useRouter();
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("folderId") || undefined;
      setFolderId(id || undefined);
    } catch {}
  }, []);

  const [step, setStep] = useState<WizardStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

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

      // Use async analyze with polling to avoid 30s platform timeouts
      const startRes = await apiClient.documents.analyzeAsync(uploadedFile.path);
      const jobId = startRes.jobId as string;

      const pollStart = Date.now();
      const pollTimeoutMs = 2 * 60 * 1000; // 2 minutes client-side timeout
      const pollIntervalMs = 2000;

      const poll = async (): Promise<AnalysisResult> => {
        while (true) {
          if (Date.now() - pollStart > pollTimeoutMs) {
            throw new Error('Analysis timed out. Please try again.');
          }
          const statusRes = await apiClient.documents.getAnalyzeStatus(jobId);
          if (statusRes.status === 'done' && statusRes.result) {
            return statusRes.result as AnalysisResult;
          }
          if (statusRes.status === 'error') {
            throw new Error(statusRes.error?.message || 'Analysis failed');
          }
          await new Promise(r => setTimeout(r, pollIntervalMs));
        }
      };

      const result: AnalysisResult = await poll();

      setAnalysisResult(result);
      setFormData(result.metadata || {});
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
      // Navigate back to documents page
      router.push("/documents");
    } catch (err: any) {
      setError(err.message || "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/documents")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Upload Document</h1>
      </div>

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
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Metadata Form */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
         
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title || uploadedFile?.originalname || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>FIR Number</Label>
                <Input
                  value={formData.fir_number || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fir_number: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>FIR Year</Label>
                <Input
                  type="number"
                  value={formData.fir_year || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fir_year: parseInt(e.target.value) || null })
                  }
                />
              </div>

              <div>
                <Label>District</Label>
                <Input
                  value={formData.district || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, district: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Police Station</Label>
                <Input
                  value={formData.police_station || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, police_station: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Acts</Label>
                <Input
                  value={formData.acts?.join(", ") || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      acts: e.target.value
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter((s: string) => s.length > 0),
                    })
                  }
                  placeholder="e.g., IPC, CrPC"
                />
              </div>

              <div>
                <Label>Sections</Label>
                <Input
                  value={formData.sections?.join(", ") || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sections: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                  placeholder="e.g., 302, 307"
                />
              </div>

              <div>
                <Label>Registration Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.registration_ts ? (() => { const d = new Date(formData.registration_ts); const pad = (n:number)=> String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })() : ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_ts: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Occurrence From</Label>
                  <Input
                    type="datetime-local"
                    value={formData.occurrence_from_ts ? (() => { const d = new Date(formData.occurrence_from_ts); const pad = (n:number)=> String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })() : ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        occurrence_from_ts: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Occurrence To</Label>
                  <Input
                    type="datetime-local"
                    value={formData.occurrence_to_ts ? (() => { const d = new Date(formData.occurrence_to_ts); const pad = (n:number)=> String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })() : ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        occurrence_to_ts: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Place of Occurrence</Label>
                <Textarea
                  value={formData.place_address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, place_address: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>GD Entry Number</Label>
                  <Input
                    value={formData.gd_entry_no || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, gd_entry_no: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>GD Entry Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.gd_entry_ts ? (() => { const d = new Date(formData.gd_entry_ts); const pad = (n:number)=> String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })() : ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gd_entry_ts: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Information Mode</Label>
                <Input
                  value={formData.information_mode || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, information_mode: e.target.value })
                  }
                  placeholder="e.g., Written, Oral"
                />
              </div>

              <div>
                <Label>Summary</Label>
                <Textarea
                  value={formData.summary || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, summary: e.target.value })
                  }
                  rows={4}
                />
              </div>

              {formData.informant && (
                <div className="space-y-2">
                  <Label>Informant</Label>
                  <Input
                    value={formData.informant.name || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        informant: { ...formData.informant, name: e.target.value },
                      })
                    }
                    placeholder="Name"
                  />
                  <Input
                    value={formData.informant.phone || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        informant: { ...formData.informant, phone: e.target.value },
                      })
                    }
                    placeholder="Phone"
                  />
                  <Textarea
                    value={formData.informant.addr || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        informant: { ...formData.informant, addr: e.target.value },
                      })
                    }
                    placeholder="Address"
                    rows={2}
                  />
                </div>
              )}

              <div>
                <Label>Accused Names (comma-separated)</Label>
                <Input
                  value={(formData.accused_list?.map((a: any) => a?.name).filter(Boolean).join(", ") || "")}
                  onChange={(e) => {
                    const names = e.target.value
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter((s: string) => s.length > 0);
                    setFormData({
                      ...formData,
                      accused_list: names.map((n: string) => ({ name: n })),
                    });
                  }}
                  placeholder="e.g., John Doe, Jane Doe"
                />
              </div>

              <div>
                <Label>Victim Names (comma-separated)</Label>
                <Input
                  value={(formData.victim_list?.map((v: any) => v?.name).filter(Boolean).join(", ") || "")}
                  onChange={(e) => {
                    const names = e.target.value
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter((s: string) => s.length > 0);
                    setFormData({
                      ...formData,
                      victim_list: names.map((n: string) => ({ name: n })),
                    });
                  }}
                  placeholder="e.g., Rahul, Sita"
                />
              </div>

              {/* Property */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Property Lost</Label>
                  <Textarea
                    value={formData.property?.lost || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property: { ...(formData.property || {}), lost: e.target.value },
                      })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Property Recovered</Label>
                  <Textarea
                    value={formData.property?.recovered || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property: { ...(formData.property || {}), recovered: e.target.value },
                      })
                    }
                    rows={2}
                  />
                </div>
              </div>

              {/* Vehicles as lines: reg_no | type */}
              <div>
                <Label>Vehicles (one per line: reg_no | type)</Label>
                <Textarea
                  value={(formData.vehicle?.map((v: any) => `${v.reg_no || ""}${v.type ? ` | ${v.type}` : ""}`).join("\n") || "")}
                  onChange={(e) => {
                    const vehicles = e.target.value
                      .split("\n")
                      .map((line: string) => line.trim())
                      .filter((line: string) => line.length > 0)
                      .map((line: string) => {
                        const [reg, type] = line.split("|").map((s) => s.trim());
                        return { reg_no: reg || "", type: type || null };
                      });
                    setFormData({ ...formData, vehicle: vehicles });
                  }}
                  placeholder="MH12AB1234 | Scooter"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4 sticky bottom-0 bg-background border-t pt-4 mt-4">
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
                  Back
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
              <Tabs defaultValue="pdf" className="h-[calc(100vh-12rem)]">
                <TabsList>
                  <TabsTrigger value="pdf">PDF</TabsTrigger>
                  <TabsTrigger value="ocr">OCR Text</TabsTrigger>
                </TabsList>

                <TabsContent value="pdf" className="h-[calc(100vh-15rem)] overflow-auto">
                  {uploadedFile?.mimetype === "application/pdf" && selectedFile ? (
                    <PDFViewer file={selectedFile} />
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      PDF preview not available
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ocr" className="h-[calc(100vh-15rem)] overflow-auto">
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

              {/* Additional Extracted Details (read-only preview) */}
              <div className="mt-6 space-y-4">
                <h4 className="font-medium">Extracted Details (Preview)</h4>
                {/* Accused detailed list */}
                {Array.isArray(formData.accused_list) && formData.accused_list.length > 0 && (
                  <div className="text-sm border rounded p-3 space-y-2">
                    <p className="text-muted-foreground">Accused</p>
                    {formData.accused_list.map((a: any, i: number) => (
                      <div key={i} className="grid grid-cols-2 gap-2 border-b pb-2 last:border-0">
                        <div><span className="text-muted-foreground">Name:</span> {a?.name || '-'}</div>
                        <div><span className="text-muted-foreground">Age:</span> {a?.age ?? '-'}</div>
                        <div><span className="text-muted-foreground">Gender:</span> {a?.gender || '-'}</div>
                        <div><span className="text-muted-foreground">Father:</span> {a?.father_name || '-'}</div>
                        <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {a?.addr || '-'}</div>
                        <div className="col-span-2"><span className="text-muted-foreground">Aadhaar:</span> {a?.ids?.aadhaar || '-'}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Victim detailed list */}
                {Array.isArray(formData.victim_list) && formData.victim_list.length > 0 && (
                  <div className="text-sm border rounded p-3 space-y-2">
                    <p className="text-muted-foreground">Victims</p>
                    {formData.victim_list.map((v: any, i: number) => (
                      <div key={i} className="grid grid-cols-2 gap-2 border-b pb-2 last:border-0">
                        <div><span className="text-muted-foreground">Name:</span> {v?.name || '-'}</div>
                        <div><span className="text-muted-foreground">Age:</span> {v?.age ?? '-'}</div>
                        <div><span className="text-muted-foreground">Gender:</span> {v?.gender || '-'}</div>
                        <div className="col-span-2"><span className="text-muted-foreground">Injury:</span> {v?.injury || '-'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

