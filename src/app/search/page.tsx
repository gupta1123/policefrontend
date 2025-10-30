"use client";

import { useState, useEffect } from "react";
import { Search as SearchIcon, FileText, Filter, X, Users, Calendar, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

interface Document {
  id: string;
  title: string;
  file_path: string;
  processing_status: string;
  created_at: string;
  folder_id: string | null;
  folder?: {
    name: string;
  };
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

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    folderId: "",
    status: "",
    startDate: "",
    endDate: "",
    firNumber: "",
    policeStation: "",
    district: "",
    accusedName: "",
    victimName: "",
    ipcSections: ""
  });

  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);

  // Format date to "22 Oct '25" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const data = await apiClient.folders.getAll();
      setFolders(data);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && !hasActiveFilters()) return;

    setLoading(true);
    try {
      const params: any = {
        q: searchQuery || undefined,
        folderId: filters.folderId || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        firNumber: filters.firNumber || undefined,
        policeStation: filters.policeStation || undefined,
        district: filters.district || undefined,
        accusedName: filters.accusedName || undefined,
        victimName: filters.victimName || undefined,
        sections: filters.ipcSections || undefined
      };

      const data = await apiClient.search.get(params);
      setResults(data);
    } catch (error) {
      console.error("Error searching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== "");
  };

  const clearFilters = () => {
    setFilters({
      folderId: "",
      status: "",
      startDate: "",
      endDate: "",
      firNumber: "",
      policeStation: "",
      district: "",
      accusedName: "",
      victimName: "",
      ipcSections: ""
    });
    setSearchQuery("");
    setResults([]);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search documents, accused names, victim names, sections, etc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
              
              {(searchQuery || hasActiveFilters()) && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>

            {filtersOpen && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Folder</label>
                    <select
                      value={filters.folderId}
                      onChange={(e) => handleFilterChange('folderId', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All Folders</option>
                      {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="uploaded">Uploaded</option>
                      <option value="processing">Processing</option>
                      <option value="ready">Ready</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">FIR Number</label>
                    <Input
                      value={filters.firNumber}
                      onChange={(e) => handleFilterChange('firNumber', e.target.value)}
                      placeholder="e.g., FIR-2023-123"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Police Station
                    </label>
                    <Input
                      value={filters.policeStation}
                      onChange={(e) => handleFilterChange('policeStation', e.target.value)}
                      placeholder="Station name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      District
                    </label>
                    <Input
                      value={filters.district}
                      onChange={(e) => handleFilterChange('district', e.target.value)}
                      placeholder="District name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Accused Name
                    </label>
                    <Input
                      value={filters.accusedName}
                      onChange={(e) => handleFilterChange('accusedName', e.target.value)}
                      placeholder="Search by accused name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Victim Name
                    </label>
                    <Input
                      value={filters.victimName}
                      onChange={(e) => handleFilterChange('victimName', e.target.value)}
                      placeholder="Search by victim name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">IPC Sections</label>
                    <Input
                      value={filters.ipcSections}
                      onChange={(e) => handleFilterChange('ipcSections', e.target.value)}
                      placeholder="e.g., 302, 376, 420"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Search Results ({results.length})</h2>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {results.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {doc.folder ? `Folder: ${doc.folder.name}` : 'No folder'}
                      </p>
                      <div className="flex items-center mt-1 gap-2">
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {doc.processing_status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && (searchQuery || hasActiveFilters()) && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search query or filters
          </p>
        </div>
      )}
    </div>
  );
}