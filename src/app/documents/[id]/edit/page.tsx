"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Eye, 
  Save, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Users,
  FileBadge,
  FileSignature,
  Clock,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { usePathname, useRouter } from "next/navigation";

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

export default function MetadataEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const [document, setDocument] = useState<Document | null>(null);
  const [details, setDetails] = useState<DocumentDetail>({
    fir_number: "",
    fir_year: new Date().getFullYear(),
    district: "",
    police_station: "",
    acts: [],
    sections: [],
    registration_ts: "",
    occurrence_from_ts: "",
    occurrence_to_ts: "",
    place_address: "",
    gd_entry_no: "",
    gd_entry_ts: "",
    information_mode: "",
    accused_count: 0,
    victim_count: 0,
    summary: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchDocumentData();
    } else {
      setError("Document ID is missing");
      setLoading(false);
    }
  }, [params.id]);

  const fetchDocumentData = async () => {
    if (!params.id) {
      setError("Document ID is missing");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch document info
      const docData = await apiClient.documents.getById(params.id);
      setDocument(docData);
      
      // Fetch document details
      const detailsData = await apiClient.documents.getDetails(params.id);
      setDetails({
        ...details,
        ...detailsData
      });
      
      setError(null);
    } catch (err) {
      console.error("Error fetching document:", err);
      setError("Failed to load document data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!params.id) {
      setError("Cannot save: Document ID is missing");
      setSaving(false);
      return;
    }
    
    setSaving(true);
    try {
      await apiClient.documents.updateDetails(params.id, details);
      router.push(`/documents/${params.id}`);
    } catch (err) {
      console.error("Error saving document details:", err);
      setError("Failed to save document details");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof DocumentDetail, value: any) => {
    setDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Edit Metadata</h1>
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

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Document Metadata</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input 
                id="title" 
                value={document?.title || ""} 
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input 
                id="status" 
                value={document?.processing_status || ""} 
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fir_number">FIR Number</Label>
              <Input 
                id="fir_number" 
                value={details.fir_number || ""} 
                onChange={(e) => handleInputChange('fir_number', e.target.value)}
                placeholder="e.g., FIR-2023-123"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fir_year">FIR Year</Label>
              <Input 
                id="fir_year" 
                type="number"
                value={details.fir_year || ""} 
                onChange={(e) => handleInputChange('fir_year', parseInt(e.target.value) || undefined)}
                placeholder="e.g., 2023"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Location Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input 
                id="district" 
                value={details.district || ""} 
                onChange={(e) => handleInputChange('district', e.target.value)}
                placeholder="e.g., Mumbai"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="police_station">Police Station</Label>
              <Input 
                id="police_station" 
                value={details.police_station || ""} 
                onChange={(e) => handleInputChange('police_station', e.target.value)}
                placeholder="e.g., Andheri Police Station"
              />
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="place_address">Place of Occurrence</Label>
              <Textarea 
                id="place_address" 
                value={details.place_address || ""} 
                onChange={(e) => handleInputChange('place_address', e.target.value)}
                placeholder="Full address where the incident occurred"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration_ts">Registration Date</Label>
              <Input 
                id="registration_ts" 
                type="datetime-local"
                value={details.registration_ts || ""} 
                onChange={(e) => handleInputChange('registration_ts', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="occurrence_from_ts">Occurrence From</Label>
              <Input 
                id="occurrence_from_ts" 
                type="datetime-local"
                value={details.occurrence_from_ts || ""} 
                onChange={(e) => handleInputChange('occurrence_from_ts', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="occurrence_to_ts">Occurrence To</Label>
              <Input 
                id="occurrence_to_ts" 
                type="datetime-local"
                value={details.occurrence_to_ts || ""} 
                onChange={(e) => handleInputChange('occurrence_to_ts', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBadge className="h-5 w-5" />
              Legal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acts">Acts</Label>
              <Input 
                id="acts" 
                value={details.acts?.join(', ') || ""} 
                onChange={(e) => handleInputChange('acts', e.target.value.split(',').map(item => item.trim()))}
                placeholder="e.g., Indian Penal Code, CrPC"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sections">Sections</Label>
              <Input 
                id="sections" 
                value={details.sections?.join(', ') || ""} 
                onChange={(e) => handleInputChange('sections', e.target.value.split(',').map(item => item.trim()))}
                placeholder="e.g., 302, 376, 420"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="information_mode">Information Mode</Label>
              <Select 
                value={details.information_mode || ""} 
                onValueChange={(value) => handleInputChange('information_mode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="suo_moto">Suo Moto</SelectItem>
                  <SelectItem value="referred">Referred</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gd_entry_no">GD Entry Number</Label>
              <Input 
                id="gd_entry_no" 
                value={details.gd_entry_no || ""} 
                onChange={(e) => handleInputChange('gd_entry_no', e.target.value)}
                placeholder="e.g., GD-2023-456"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Counts and Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accused_count">Accused Count</Label>
              <Input 
                id="accused_count" 
                type="number"
                value={details.accused_count || 0} 
                onChange={(e) => handleInputChange('accused_count', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="victim_count">Victim Count</Label>
              <Input 
                id="victim_count" 
                type="number"
                value={details.victim_count || 0} 
                onChange={(e) => handleInputChange('victim_count', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gd_entry_ts">GD Entry Time</Label>
              <Input 
                id="gd_entry_ts" 
                type="datetime-local"
                value={details.gd_entry_ts || ""} 
                onChange={(e) => handleInputChange('gd_entry_ts', e.target.value)}
              />
            </div>
            
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea 
                id="summary" 
                value={details.summary || ""} 
                onChange={(e) => handleInputChange('summary', e.target.value)}
                placeholder="Brief summary of the FIR contents"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}