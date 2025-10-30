"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalFolders: 0,
    processingDocuments: 0,
    readyDocuments: 0,
    errorDocuments: 0,
    totalCases: 0,
    avgProcessingTime: 0,
  });

  const [documentStatusData, setDocumentStatusData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [topStationsData, setTopStationsData] = useState<any[]>([]);
  const [topSectionsData, setTopSectionsData] = useState<any[]>([]);
  const [caseTypesData, setCaseTypesData] = useState<any[]>([]);
  const [topAccusedData, setTopAccusedData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Format date to "22 Oct '25" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      // First, try to fetch analytics data from the actual analytics endpoint
      const analyticsData = await apiClient.chat.getAnalytics();
      
      if (analyticsData && analyticsData.length > 0) {
        const payload = analyticsData[0].payload;
        
        // Set main stats from the analytics payload
        setStats({
          totalDocuments: payload.totalDocuments || 0,
          totalFolders: payload.totalFolders || 0,
          processingDocuments: payload.processingStatuses?.find((s: any) => s.status === 'processing')?.count || 0,
          readyDocuments: payload.processingStatuses?.find((s: any) => s.status === 'ready')?.count || 0,
          errorDocuments: payload.processingStatuses?.find((s: any) => s.status === 'error')?.count || 0,
          totalCases: payload.totalCases || payload.totalDocuments || 0,
          avgProcessingTime: payload.avgProcessingTime || 0,
        });
        
        // Set chart data directly from the analytics payload
        setDocumentStatusData(payload.documentStatusData || []);
        setMonthlyData(payload.monthlyData || []);
        setTopStationsData(payload.topStationsData || []);
        setTopSectionsData(payload.topSectionsData || []);
        setCaseTypesData(payload.caseTypesData || []);
        setTopAccusedData(payload.topAccusedData || []);
        setRecentActivity(payload.recentActivityData || []);
      } else {
        // If analytics endpoint doesn't provide data, fetch the data manually
        const [documents, folders] = await Promise.all([
          apiClient.documents.getAll(),
          apiClient.folders.getAll()
        ]);
        
        // Calculate stats from document data
        const processingDocuments = documents.filter((doc: any) => doc.processing_status === 'processing').length;
        const readyDocuments = documents.filter((doc: any) => doc.processing_status === 'ready').length;
        const errorDocuments = documents.filter((doc: any) => doc.processing_status === 'error').length;
        
        // Set main stats
        setStats({
          totalDocuments: documents.length,
          totalFolders: folders.length,
          processingDocuments,
          readyDocuments,
          errorDocuments,
          totalCases: documents.length, // Each document is a case
          avgProcessingTime: 0, // We don't have processing time data yet
        });
        
        // Prepare document status data for chart
        const statusCounts: { [key: string]: number } = {};
        documents.forEach((doc: any) => {
          statusCounts[doc.processing_status] = (statusCounts[doc.processing_status] || 0) + 1;
        });
        
        const statusArray = Object.entries(statusCounts).map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: count
        }));
        
        setDocumentStatusData(statusArray);
        
        // Prepare recent activity data using the latest documents
        const recentDocs = documents
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((doc: any) => ({
            action: "Document Added",
            document: doc.title,
            time: new Date(doc.created_at).toLocaleDateString()
          }));
        
        setRecentActivity(recentDocs);
        
        // Prepare monthly data (aggregating documents by month)
        const monthlyMap: { [key: string]: { documents: number, cases: number } } = {};
        
        documents.forEach((doc: any) => {
          const date = new Date(doc.created_at);
          const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          
          if (!monthlyMap[monthYear]) {
            monthlyMap[monthYear] = { documents: 0, cases: 0 };
          }
          
          monthlyMap[monthYear].documents += 1;
          monthlyMap[monthYear].cases += 1; // Each document is considered a case
        });
        
        // Get the last 6 months of data
        const months = Object.keys(monthlyMap).sort().slice(-6);
        const monthlyArray = months.map(month => ({
          month: new Date(month + '-01').toLocaleString('default', { month: 'short' }),
          documents: monthlyMap[month].documents,
          cases: monthlyMap[month].cases
        }));
        
        // If we don't have 6 months of data, add some default months
        if (monthlyArray.length === 0) {
          const current = new Date();
          for (let i = 5; i >= 0; i--) {
            const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
            monthlyArray.push({
              month: date.toLocaleString('default', { month: 'short' }),
              documents: 0,
              cases: 0
            });
          }
        }
        
        setMonthlyData(monthlyArray);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      
      // As a fallback, fetch documents and folders to calculate stats
      try {
        const [documents, folders] = await Promise.all([
          apiClient.documents.getAll(),
          apiClient.folders.getAll()
        ]);
        
        // Calculate stats from document data
        const processingDocuments = documents.filter((doc: any) => doc.processing_status === 'processing').length;
        const readyDocuments = documents.filter((doc: any) => doc.processing_status === 'ready').length;
        const errorDocuments = documents.filter((doc: any) => doc.processing_status === 'error').length;
        
        // Set main stats
        setStats({
          totalDocuments: documents.length,
          totalFolders: folders.length,
          processingDocuments,
          readyDocuments,
          errorDocuments,
          totalCases: documents.length, // Each document is a case
          avgProcessingTime: 0, // We don't have processing time data yet
        });
        
        // Prepare document status data for chart
        const statusCounts: { [key: string]: number } = {};
        documents.forEach((doc: any) => {
          statusCounts[doc.processing_status] = (statusCounts[doc.processing_status] || 0) + 1;
        });
        
        const statusArray = Object.entries(statusCounts).map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: count
        }));
        
        setDocumentStatusData(statusArray);
        
        // Prepare recent activity data using the latest documents
        const recentDocs = documents
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((doc: any) => ({
            action: "Document Added",
            document: doc.title,
            time: new Date(doc.created_at).toLocaleDateString()
          }));
        
        setRecentActivity(recentDocs);
        
        // Prepare monthly data (aggregating documents by month)
        const monthlyMap: { [key: string]: { documents: number, cases: number } } = {};
        
        documents.forEach((doc: any) => {
          const date = new Date(doc.created_at);
          const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          
          if (!monthlyMap[monthYear]) {
            monthlyMap[monthYear] = { documents: 0, cases: 0 };
          }
          
          monthlyMap[monthYear].documents += 1;
          monthlyMap[monthYear].cases += 1; // Each document is considered a case
        });
        
        // Get the last 6 months of data
        const months = Object.keys(monthlyMap).sort().slice(-6);
        const monthlyArray = months.map(month => ({
          month: new Date(month + '-01').toLocaleString('default', { month: 'short' }),
          documents: monthlyMap[month].documents,
          cases: monthlyMap[month].cases
        }));
        
        // If we don't have 6 months of data, add some default months
        if (monthlyArray.length === 0) {
          const current = new Date();
          for (let i = 5; i >= 0; i--) {
            const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
            monthlyArray.push({
              month: date.toLocaleString('default', { month: 'short' }),
              documents: 0,
              cases: 0
            });
          }
        }
        
        setMonthlyData(monthlyArray);
      } catch (fallbackError) {
        console.error("Error fetching analytics with fallback method:", fallbackError);
        
        // If everything fails, set empty data
        setStats({
          totalDocuments: 0,
          totalFolders: 0,
          processingDocuments: 0,
          readyDocuments: 0,
          errorDocuments: 0,
          totalCases: 0,
          avgProcessingTime: 0,
        });
        
        setDocumentStatusData([]);
        setMonthlyData([]);
        setTopStationsData([]);
        setTopSectionsData([]);
        setCaseTypesData([]);
        setTopAccusedData([]);
        setRecentActivity([]);
      }
    }
  };

  // Use actual data or fallback to empty arrays to prevent errors
  const documentStatusDisplayData = documentStatusData.length > 0 ? documentStatusData : [];
  const monthlyDisplayData = monthlyData.length > 0 ? monthlyData : [];
  const topStationsDisplayData = topStationsData.length > 0 ? topStationsData : [];
  const topSectionsDisplayData = topSectionsData.length > 0 ? topSectionsData : [];
  const caseTypesDisplayData = caseTypesData.length > 0 ? caseTypesData : [];
  const topAccusedDisplayData = topAccusedData.length > 0 ? topAccusedData : [];
  const recentActivityDisplay = recentActivity.length > 0 ? recentActivity : [];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-4 w-4 text-muted-foreground"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 3v4a1 1 0 0 0 1 1h4m-6 8H9m4 0v4m-4-4h4m2 4h2a2 2 0 0 0 2-2v-2M7 7h1m10 0v1m-7 3h1m-3 3h3m-7 0h1m4 0h1m-4 3h3m-7 0h1"
              ></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">+0 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-4 w-4 text-muted-foreground"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
              ></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCases}</div>
            <p className="text-xs text-muted-foreground">Active cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-4 w-4 text-muted-foreground"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 3v2m0 14v2M3 12h2m14 0h2m-10.6-3.4L6.7 6.8m10.6 10.6 1.7-1.7M6.8 17.3 8.5 15.6m10.7-10.6-1.7 1.7M3 21l18-18"
              ></path>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingDocuments}</div>
            <p className="text-xs text-muted-foreground">documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Processing Time</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12,6 12,12 16,14"></polyline>
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProcessingTime} min</div>
            <p className="text-xs text-muted-foreground">per document</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Documents & Cases Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyDisplayData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorDocuments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="documents" stroke="#8884d8" fillOpacity={1} fill="url(#colorDocuments)" name="Documents" />
                <Area type="monotone" dataKey="cases" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCases)" name="Cases" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Case Types Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={caseTypesDisplayData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={(d: any) => {
                    const name = d?.name ?? "";
                    const percent = typeof d?.percent === "number" ? d.percent : 0;
                    return `${name} ${(percent * 100).toFixed(0)}%`;
                  }}
                >
                  {caseTypesDisplayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Documents by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={documentStatusDisplayData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Police Stations</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topStationsDisplayData}
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="documents" fill="#8884d8" name="Documents" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common IPC Sections</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topSectionsDisplayData}
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" name="Occurrences" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Document Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Ready</span>
                <span className="font-medium">{stats.readyDocuments} documents</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(stats.readyDocuments / Math.max(stats.totalDocuments, 1)) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between">
                <span>Processing</span>
                <span className="font-medium">{stats.processingDocuments} documents</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${(stats.processingDocuments / Math.max(stats.totalDocuments, 1)) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between">
                <span>Error</span>
                <span className="font-medium">{stats.errorDocuments} documents</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${(stats.errorDocuments / Math.max(stats.totalDocuments, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Accused by Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAccusedDisplayData.length > 0 ? 
                topAccusedDisplayData.map((person: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span className="truncate">{person.name}</span>
                    <span className="font-medium">{person.count} cases</span>
                  </div>
                ))
              : 
                <p className="text-muted-foreground text-center py-4">No data available</p>
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivityDisplay.length > 0 ? 
                recentActivityDisplay.map((activity: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.document}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(activity.time)}</span>
                  </div>
                ))
              : 
                <p className="text-muted-foreground text-center">No recent activity</p>
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}