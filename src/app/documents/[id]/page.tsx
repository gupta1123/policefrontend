"use client";

import { useState, useEffect, use } from "react";
import { FileText, FileSearch, EyeIcon, AlertTriangle, CheckCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("@/components/pdf-viewer").then(mod => ({ default: mod.PDFViewer })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>
});

interface Document {
  id: string;
  title: string;
  file_path: string;
  processing_status: string;
  created_at: string;
  folder_id: string | null;
}

interface DocumentDetail {
  fir_number?: string;
  fir_year?: number;
  district?: string;
  police_station?: string;
  acts?: string[];
  sections?: string[];
  registration_ts?: string;
  occurrence_from_ts?: string;
  occurrence_to_ts?: string;
  place_address?: string;
  gd_entry_no?: string;
  gd_entry_ts?: string;
  information_mode?: string;
  accused_count?: number;
  victim_count?: number;
  summary?: string;
}

interface DocumentMetadata {
  data?: {
    domain?: any;
    system?: any;
    extraction?: any;
  };
  schema_version?: string;
  extraction_model?: string;
  extraction_confidence?: number;
  extracted_at?: string;
}

interface DocPage {
  id: string;
  document_id: string;
  page_num: number;
  text: string;
  ocr_confidence: number;
  created_at: string;
}

export default function DocumentViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [details, setDetails] = useState<DocumentDetail | null>(null);
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [docPages, setDocPages] = useState<DocPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string | null, name: string}[]>([]);

  // Format date to "22 Oct '25" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  useEffect(() => {
    fetchDocumentData();
  }, [id]);

  const fetchDocumentData = async () => {
    try {
      setLoading(true);

      // Fetch document info
      const docData = await apiClient.documents.getById(id);
      setDocument(docData);

      // Fetch document details
      const detailsData = await apiClient.documents.getDetails(id);
      setDetails(detailsData);

      // Fetch document metadata
      const metadataData = await apiClient.documents.getMetadata(id);
      setMetadata(metadataData);

      // Fetch document pages (OCR text)
      try {
        const pagesData = await apiClient.search.getPages(id);
        setDocPages(pagesData);
      } catch (pagesError) {
        console.error("Error fetching document pages:", pagesError);
        // Proceed without pages data
      }
      
      // Build folder path if the document is in a folder
      if (docData.folder_id) {
        await buildFolderPath(docData.folder_id);
      } else {
        setFolderPath([{id: null, name: "Home"}]);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching document:", err);
      setError("Failed to load document data");
    } finally {
      setLoading(false);
    }
  };

  const buildFolderPath = async (folderId: string) => {
    try {
      // Fetch all folders to build the path
      const allFolders = await apiClient.folders.getAll();
      const folderMap: { [key: string]: any } = {};
      
      // Create a map for quick lookups
      allFolders.forEach((folder: any) => {
        folderMap[folder.id] = folder;
      });
      
      // Build the path by traversing up the parent hierarchy
      const path: {id: string | null, name: string}[] = [];
      let currentFolderId: string | null = folderId;
      
      // Add the document's folder first
      if (currentFolderId && folderMap[currentFolderId]) {
        path.unshift({id: currentFolderId, name: folderMap[currentFolderId].name});
        currentFolderId = folderMap[currentFolderId].parent_id;
      }
      
      // Traverse up the parent hierarchy
      while (currentFolderId && folderMap[currentFolderId]) {
        path.unshift({id: currentFolderId, name: folderMap[currentFolderId].name});
        currentFolderId = folderMap[currentFolderId].parent_id;
      }
      
      // Add root folder at the beginning
      path.unshift({id: null, name: "Home"});
      
      setFolderPath(path);
    } catch (err) {
      console.error("Error building folder path:", err);
      // Set a minimal path as fallback
      setFolderPath([{id: null, name: "Home"}]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Document Viewer</h1>
        </div>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Document Viewer</h1>
        </div>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => router.back()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Document Viewer</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => id && router.push(`/documents/${id}/edit`)}
              disabled={!id}
            >
              <Edit className="h-4 w-4 mr-2" />
              {id ? 'Edit Metadata' : 'Loading...'}
            </Button>
          </div>
        </div>
        
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {folderPath.map((path, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2">/</span>
              )}
              <button
                onClick={() => {
                  if (path.id === null) {
                    router.push('/documents');
                  } else {
                    // Navigate to the documents page with the folder parameter
                    router.push(`/documents?folder=${path.id}`);
                  }
                }}
                className={`hover:underline ${index === folderPath.length - 1 ? 'font-medium text-foreground' : 'cursor-pointer'}`}
              >
                {path.name}
              </button>
            </div>
          ))}
          <span className="mx-2">/</span>
          <span className="truncate max-w-xs">{document?.title || 'Loading...'}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Document Title</p>
                  <p className="font-medium">{document?.title}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(document?.processing_status || '')}`}>
                        {document?.processing_status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{document ? formatDate(document.created_at) : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Case Identification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {details?.fir_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">FIR Number</p>
                    <p className="font-medium">{details.fir_number}</p>
                  </div>
                )}
                
                {details?.fir_year && (
                  <div>
                    <p className="text-sm text-muted-foreground">FIR Year</p>
                    <p className="font-medium">{details.fir_year}</p>
                  </div>
                )}
                
                {details?.police_station && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Police Station</p>
                    <p className="font-medium">{details.police_station}</p>
                  </div>
                )}
                
                {details?.district && (
                  <div>
                    <p className="text-sm text-muted-foreground">District</p>
                    <p className="font-medium">{details.district}</p>
                  </div>
                )}
                
                {details?.information_mode && (
                  <div>
                    <p className="text-sm text-muted-foreground">Information Mode</p>
                    <p className="font-medium">{details.information_mode}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {details?.place_address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Place of Occurrence</p>
                    <p className="font-medium">{details.place_address}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-4">
                  {details?.registration_ts && (
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Date</p>
                      <p className="font-medium">{formatDate(details.registration_ts)}</p>
                    </div>
                  )}
                  
                  {details?.occurrence_from_ts && (
                    <div>
                      <p className="text-sm text-muted-foreground">Occurrence From</p>
                      <p className="font-medium">{formatDate(details.occurrence_from_ts)}</p>
                    </div>
                  )}
                  
                  {details?.occurrence_to_ts && (
                    <div>
                      <p className="text-sm text-muted-foreground">Occurrence To</p>
                      <p className="font-medium">{formatDate(details.occurrence_to_ts)}</p>
                    </div>
                  )}
                </div>
                
                {details?.gd_entry_no && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">GD Entry Number</p>
                      <p className="font-medium">{details.gd_entry_no}</p>
                    </div>
                    
                    {details?.gd_entry_ts && (
                      <div>
                        <p className="text-sm text-muted-foreground">GD Entry Date</p>
                        <p className="font-medium">{formatDate(details.gd_entry_ts)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legal Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {details?.acts && details.acts.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Acts</p>
                    <p className="font-medium">{details.acts.join(', ')}</p>
                  </div>
                )}
                
                {details?.sections && details.sections.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sections</p>
                    <p className="font-medium">{details.sections.join(', ')}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {details?.accused_count !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Accused Count</p>
                      <p className="font-medium">{details.accused_count}</p>
                    </div>
                  )}
                  
                  {details?.victim_count !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Victim Count</p>
                      <p className="font-medium">{details.victim_count}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {details?.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Case Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{details.summary}</p>
              </CardContent>
            </Card>
          )}

          {document?.processing_status === 'error' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Processing Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  This document encountered an error during processing. Please check the file and try again.
                </p>
              </CardContent>
            </Card>
          )}



          
          {/* Processing Information Section */}
          {metadata && metadata.data?.domain && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Domain Metadata */}
                  <div>
                    <h4 className="font-medium mb-2">Domain Metadata</h4>
                    <div className="text-sm space-y-2">
                      {metadata.data.domain.informant && (
                        <div>
                          <p className="text-muted-foreground">Informant</p>
                          <p className="font-medium">
                            {metadata.data.domain.informant.name || ''} 
                            {metadata.data.domain.informant.phone ? ` (${metadata.data.domain.informant.phone})` : ''}
                          </p>
                        </div>
                      )}
                      {metadata.data.domain.accused_list && metadata.data.domain.accused_list.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">Accused List</p>
                          <div className="space-y-1">
                            {metadata.data.domain.accused_list.map((accused: any, index: number) => (
                              <p key={index} className="font-medium">- {accused.name}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {metadata.data.domain.victim_list && metadata.data.domain.victim_list.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">Victim List</p>
                          <div className="space-y-1">
                            {metadata.data.domain.victim_list.map((victim: any, index: number) => (
                              <p key={index} className="font-medium">- {victim.name}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pdf" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pdf" className="flex items-center gap-2">
                  <EyeIcon className="h-4 w-4" />
                  PDF View
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  OCR Text
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pdf" className="mt-4 flex-1">
                <div className="border rounded-lg h-[500px] overflow-auto">
                  <PDFViewer documentId={id} title={document?.title || ""} fileUrl={document?.file_path} />
                </div>
              </TabsContent>
              <TabsContent value="text" className="mt-4 flex-1">
                <div className="border rounded-lg p-4 h-[500px] overflow-auto">
                  <div className="space-y-4">
                    {docPages.length > 0 ? (
                      docPages.map((page) => (
                        <div key={page.id} className="border-b pb-4 last:border-0">
                          <h4 className="font-medium mb-2">Page {page.page_num}</h4>
                          <p className="text-sm whitespace-pre-line">{page.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            OCR Confidence: {page.ocr_confidence.toFixed(2)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-center">
                          OCR text not available for this document.
                          <br />
                          {document?.processing_status !== 'ready' 
                            ? "Document processing must be complete to show OCR text." 
                            : "OCR data may not have been extracted for this document."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}