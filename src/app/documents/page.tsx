"use client";

import { useState, useEffect, Suspense } from "react";
export const dynamic = "force-dynamic";
import { 
  FileText, 
  Folder, 
  Upload, 
  MoreHorizontal, 
  Search, 
  Eye, 
  Download, 
  AlertCircle, 
  Plus, 
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

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

export default function DocumentsPage() {
  const router = useRouter();
  const [initialFolderId, setInitialFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredItems, setFilteredItems] = useState<(Folder | Document)[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string | null>>(new Set([null])); // Root level is always expanded
  const [currentPath, setCurrentPath] = useState<{id: string | null, name: string}[]>([{id: null, name: "Home"}]);
  const [foldersMap, setFoldersMap] = useState<{[key: string]: Folder}>({});

  // Format date to "22 Oct '25" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  useEffect(() => {
    fetchData();
    try {
      const params = new URLSearchParams(window.location.search);
      setInitialFolderId(params.get('folder'));
    } catch {}
  }, []);

  useEffect(() => {
    // If there's an initial folder ID in the URL, navigate to that folder
    if (initialFolderId) {
      const folder = folders.find(f => f.id === initialFolderId);
      if (folder) {
        // Build the path to this folder by traversing up the parent hierarchy
        const path: {id: string | null, name: string}[] = [{id: null, name: "Home"}];
        let currentFolderId: string | null = initialFolderId;
        
        // First, add the current folder
        path.push({id: folder.id, name: folder.name});
        
        // Then traverse up the parent hierarchy
        while (currentFolderId) {
          const currentFolder = folders.find(f => f.id === currentFolderId);
          if (currentFolder && currentFolder.parent_id) {
            const parentFolder = folders.find(f => f.id === currentFolder.parent_id);
            if (parentFolder) {
              // Insert parent at the beginning of the path after "Home"
              path.splice(1, 0, {id: parentFolder.id, name: parentFolder.name});
              currentFolderId = parentFolder.id;
            } else {
              currentFolderId = null;
            }
          } else {
            currentFolderId = null;
          }
        }
        
        setCurrentPath(path);
      }
    }
  }, [folders, initialFolderId]);

  useEffect(() => {
    // Filter items based on search term
    if (searchTerm) {
      const filtered = [
        ...folders.filter(folder => 
          folder.name.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        ...documents.filter(doc => 
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (doc.folder?.name && doc.folder.name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      ];
      setFilteredItems(filtered);
    } else {
      // Show items based on current path (folder hierarchy)
      if (currentPath.length === 1) { // At root level
        // Show folders and documents without a parent folder
        const rootItems = [
          ...folders.filter(folder => folder.parent_id === null),
          ...documents.filter(doc => doc.folder_id === null)
        ];
        setFilteredItems(rootItems);
      } else {
        // At a specific folder level
        const currentFolderId = currentPath[currentPath.length - 1].id;
        const folderItems = [
          ...folders.filter(folder => folder.parent_id === currentFolderId),
          ...documents.filter(doc => doc.folder_id === currentFolderId)
        ];
        setFilteredItems(folderItems);
      }
    }
  }, [folders, documents, searchTerm, currentPath]);

  const fetchData = async () => {
    try {
      const [foldersData, documentsData] = await Promise.all([
        apiClient.folders.getAll(),
        apiClient.documents.getAll()
      ]);
      setFolders(foldersData);
      
      // Create a map of folder IDs to folder objects for quick lookups
      const foldersMapTemp: {[key: string]: Folder} = {};
      foldersData.forEach((folder: Folder) => {
        foldersMapTemp[folder.id] = folder;
      });
      setFoldersMap(foldersMapTemp);
      
      setDocuments(documentsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };


  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const currentFolderId = currentPath.length > 1 ? currentPath[currentPath.length - 1].id : null;
      
      const newFolder = await apiClient.folders.create({
        name: newFolderName,
        parent_id: currentFolderId || undefined
      });
      
      setFolders(prev => [...prev, newFolder]);
      setNewFolderName("");
      setIsCreateFolderDialogOpen(false);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await apiClient.documents.delete(docId);
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await apiClient.folders.delete(folderId);
      setFolders(folders.filter(folder => folder.id !== folderId));
      // Also remove any documents in this folder
      setDocuments(documents.filter(doc => doc.folder_id !== folderId));
    } catch (error) {
      console.error("Error deleting folder:", error);
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

  const navigateToFolder = (folder: Folder | null) => {
    if (folder === null) {
      // Go back to root
      setCurrentPath([{id: null, name: "Home"}]);
    } else {
      // Navigate into this folder
      setCurrentPath(prev => [...prev, {id: folder.id, name: folder.name}]);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    // Navigate to the folder at the specified index in the breadcrumb
    if (index === 0) {
      // Go to root (Home)
      setCurrentPath([{id: null, name: "Home"}]);
    } else {
      // Navigate to the folder at the specified index
      setCurrentPath(currentPath.slice(0, index + 1));
    }
  };

  const navigateUp = () => {
    if (currentPath.length > 1) {
      setCurrentPath(prev => prev.slice(0, -1));
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  return (
    <Suspense fallback={null}>
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentPath.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={navigateUp}
                className="h-8 w-8 p-0"
              >
                ..
              </Button>
            )}
            <h1 className="text-3xl font-bold tracking-tight">
              {currentPath[currentPath.length - 1].name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Folder className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateFolderDialogOpen(false);
                        setNewFolderName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFolder}>
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              onClick={() => {
                const folderId = currentPath.length > 1 ? currentPath[currentPath.length - 1].id : null;
                router.push(`/documents/upload${folderId ? `?folderId=${folderId}` : ''}`);
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
        
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {currentPath.map((path, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2">/</span>
              )}
              <button
                onClick={() => navigateToBreadcrumb(index)}
                className={`hover:underline ${index === currentPath.length - 1 ? 'font-medium text-foreground' : 'cursor-pointer'}`}
              >
                {path.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search folders and documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filteredItems.length === 0 && !searchTerm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">This folder is empty</h3>
          <p className="text-muted-foreground mb-4">
            Add folders or documents to get started
          </p>
          <div className="flex gap-2">
            <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Folder className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>
      )}

      {filteredItems.length === 0 && searchTerm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground">
            No folders or documents match your search
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems
          .sort((a, b) => {
            // Sort folders first, then documents
            const isAFolder = 'parent_id' in a;
            const isBFolder = 'parent_id' in b;
            if (isAFolder && !isBFolder) return -1;
            if (!isAFolder && isBFolder) return 1;
            return 0;
          })
          .map((item) => {
            if ('parent_id' in item) { // It's a folder
              return (
                <Card 
                  key={item.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigateToFolder(item)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToFolder(item);
                        }}
                      >
                        <Folder className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold truncate">{item.name}</h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigateToFolder(item);
                          }}>
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(item.id);
                            }}
                            className="text-red-600"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-sm text-muted-foreground">
                      {folders.filter(f => f.parent_id === item.id).length} folders, 
                      {documents.filter(d => d.folder_id === item.id).length} documents
                    </div>
                  </CardContent>
                </Card>
              );
            } else { // It's a document
              return (
                <Card 
                  key={item.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/documents/${item.id}`)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold truncate max-w-[180px]">{item.title}</h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => router.push(`/documents/${item.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(item.id);
                            }}
                            className="text-red-600"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-sm text-muted-foreground">
                      {item.folder ? `In: ${item.folder.name}` : 'No folder'}
                    </div>
                    <div className="flex items-center mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.processing_status)}`}>
                        {item.processing_status}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          })}
      </div>

      {filteredItems.length > 0 && !searchTerm && (
        <div className="text-sm text-muted-foreground">
          {filteredItems.filter(item => 'parent_id' in item).length} folders, 
          {filteredItems.filter(item => !('parent_id' in item)).length} documents
        </div>
      )}
    </div>
    </Suspense>
  );
}