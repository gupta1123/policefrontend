"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Folder, FileText, Users, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  title: string;
  processing_status: string;
  created_at: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalFolders: 0,
    processingDocuments: 0,
    readyDocuments: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [documents, folders] = await Promise.all([
        apiClient.documents.getAll(),
        apiClient.folders.getAll()
      ]);
      
      const processingDocs = documents.filter((doc: any) => doc.processing_status === 'processing').length;
      const readyDocs = documents.filter((doc: any) => doc.processing_status === 'ready').length;
      
      setStats({
        totalDocuments: documents.length,
        totalFolders: folders.length,
        processingDocuments: processingDocs,
        readyDocuments: readyDocs,
      });
      
      // Create recent activity from the latest documents and folders
      const allItems: any[] = [];
      
      // Add documents to activity with their type
      documents.forEach((doc: any) => {
        allItems.push({
          ...doc,
          type: 'document',
          action: doc.processing_status === 'ready' ? 'Document processed' : 'New document added',
          time: new Date(doc.created_at).toISOString()
        });
      });
      
      // Add folders to activity with their type
      folders.forEach((folder: any) => {
        allItems.push({
          ...folder,
          type: 'folder',
          action: 'New folder created',
          time: new Date(folder.created_at).toISOString()
        });
      });
      
      // Sort by creation time (most recent first) and take top 3
      const sortedActivity = allItems
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 3);
      
      setRecentActivity(sortedActivity);
    } catch (error) {
      console.error("Error fetching stats:", error);
      
      // Set fallback stats
      setStats({
        totalDocuments: 0,
        totalFolders: 0,
        processingDocuments: 0,
        readyDocuments: 0,
      });
      
      setRecentActivity([]);
    }
  };

  // Format date to "22 Oct '25" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">+0 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Folders</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFolders}</div>
            <p className="text-xs text-muted-foreground">+0 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingDocuments}</div>
            <p className="text-xs text-muted-foreground">documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyDocuments}</div>
            <p className="text-xs text-muted-foreground">documents</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="flex flex-col items-center h-32"
                onClick={() => router.push('/documents')}
              >
                <FileText className="h-8 w-8 mb-2" />
                <span className="font-medium">All Documents</span>
                <span className="text-sm text-muted-foreground">{stats.totalDocuments} items</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center h-32"
                onClick={() => router.push('/search')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-8 w-8 mb-2"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 15l6 6m-11-3a7 7 0 110-14 7 7 0 010 14z"
                  ></path>
                </svg>
                <span className="font-medium">Search</span>
                <span className="text-sm text-muted-foreground">Find anything</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.title || activity.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(activity.time)}</p>
                    </div>
                    {activity.type === 'document' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push(`/documents/${activity.id}`)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}