"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";

// Set up PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PDFViewerProps {
  file: File;
}

export function PDFViewer({ file }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("Error loading PDF:", error);
    setError("Failed to load PDF document");
    setLoading(false);
  }, []);

  const goToPage = (page: number) => {
    if (page >= 1 && numPages && page <= numPages) {
      setPageNumber(page);
    }
  };

  const fileUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : null;

  if (!fileUrl) {
    return <div className="text-center text-muted-foreground py-8">PDF preview not available</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {error ? (
        <div className="text-center text-red-500 py-8">
          <p>Error: {error}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-full">
          <p>Loading PDF document...</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {pageNumber} / {numPages || "?"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={numPages ? pageNumber >= numPages : true}
            >
              Next
            </Button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading="Loading PDF..."
              error="Failed to load PDF"
            >
              <Page
                pageNumber={pageNumber}
                scale={1.0}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        </>
      )}
    </div>
  );
}

