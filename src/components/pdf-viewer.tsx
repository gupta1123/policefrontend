"use client";

import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { apiClient } from "@/lib/api-client";

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  documentId: string;
  title: string;
}

export interface DocPage {
  id: string;
  document_id: string;
  page_num: number;
  text: string;
  ocr_confidence: number;
  created_at: string;
}

export function PDFViewer({ documentId, title }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docPages, setDocPages] = useState<DocPage[]>([]);

  // Fetch document pages for potential text layer
  useEffect(() => {
    const fetchDocumentPages = async () => {
      try {
        const pagesData = await apiClient.search.getPages(documentId);
        setDocPages(pagesData);
      } catch (err) {
        console.error("Error fetching document pages:", err);
        // Continue without document pages
      }
    };

    fetchDocumentPages();
  }, [documentId]);

  // Handle PDF load success
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  // Handle PDF load error
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("Error loading PDF:", error);
    setError("Failed to load PDF document");
    setLoading(false);
  }, []);

  // Handle page change
  const goToPage = (page: number) => {
    if (page >= 1 && numPages && page <= numPages) {
      setPageNumber(page);
    }
  };

  // Handle zoom in
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  // Handle rotation
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Get the document URL from the backend API
  const documentUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${documentId}/download`;

  // Only render on client-side to avoid SSR issues with PDF.js
  if (typeof window === 'undefined') {
    return <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <span className="text-sm mx-2">
            Zoom: {Math.round(scale * 100)}%
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            Prev
          </Button>
          <div className="flex items-center space-x-1">
            <Input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-16 text-center"
            />
            <span className="text-sm">/ {numPages || "?"}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={numPages ? pageNumber >= numPages : true}
          >
            Next
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        {error ? (
          <div className="text-center text-red-500">
            <p>Error: {error}</p>
            <p className="text-sm mt-2">This document may not be a PDF or may be corrupted.</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading PDF document...</p>
          </div>
        ) : (
          <div className="relative">
            <Document
              file={documentUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading="Loading PDF..."
              error="Failed to load PDF"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}