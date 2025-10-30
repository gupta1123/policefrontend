// api/client.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BACKEND_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Folders API
  folders = {
    getAll: (parentId?: string) => 
      this.request(`/folders${parentId ? `?parentId=${parentId}` : ''}`),
    
    getById: (id: string) => 
      this.request(`/folders/${id}`),
    
    create: (data: { name: string; parent_id?: string }) => 
      this.request('/folders', { method: 'POST', body: JSON.stringify(data) }),
    
    update: (id: string, data: { name?: string; parent_id?: string }) => 
      this.request(`/folders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    
    delete: (id: string) => 
      this.request(`/folders/${id}`, { method: 'DELETE' }),
  };

  // Documents API
  documents = {
    getAll: (params?: { folderId?: string; status?: string; limit?: string; offset?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.folderId) queryParams.append('folderId', params.folderId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.limit) queryParams.append('limit', params.limit);
      if (params?.offset) queryParams.append('offset', params.offset);
      
      const queryString = queryParams.toString();
      return this.request(`/documents${queryString ? `?${queryString}` : ''}`);
    },
    
    getById: (id: string) => 
      this.request(`/documents/${id}`),
    
    upload: (file: File, folderId?: string, title?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);
      if (title) formData.append('title', title);

      return fetch(`${this.baseUrl}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      }).then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return response.json();
      });
    },

    uploadTemp: (file: File, folderId?: string, title?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);
      if (title) formData.append('title', title);

      return fetch(`${this.baseUrl}/api/documents/upload-temp`, {
        method: 'POST',
        body: formData,
      }).then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return response.json();
      });
    },

    analyze: (filePath: string) => {
      return this.request('/documents/analyze', {
        method: 'POST',
        body: JSON.stringify({ filePath }),
      });
    },

    analyzeAsync: (filePath: string) => {
      return this.request('/documents/analyze?async=true', {
        method: 'POST',
        body: JSON.stringify({ filePath }),
      });
    },

    getAnalyzeStatus: (jobId: string) => {
      return this.request(`/documents/analyze/${jobId}`);
    },

    save: (data: {
      filePath: string;
      title: string;
      folderId?: string;
      metadata: any;
      ocrData: any;
    }) => {
      return this.request('/documents/save', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    
    update: (id: string, data: { folder_id?: string; title?: string; processing_status?: string; error_text?: string }) => 
      this.request(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    
    delete: (id: string) => 
      this.request(`/documents/${id}`, { method: 'DELETE' }),
    
    getDetails: (id: string) => 
      this.request(`/documents/${id}/details`),
    
    updateDetails: (id: string, data: any) => 
      this.request(`/documents/${id}/details`, { method: 'PUT', body: JSON.stringify(data) }),
    
    getMetadata: (id: string) => 
      this.request(`/documents/${id}/metadata`),
    
    updateMetadata: (id: string, data: any) => 
      this.request(`/documents/${id}/metadata`, { method: 'PUT', body: JSON.stringify(data) }),
  };

  // Search API
  search = {
    get: (params?: { q?: string; folderId?: string; status?: string; startDate?: string; endDate?: string; firNumber?: string; policeStation?: string; district?: string; acts?: string; sections?: string; limit?: string; offset?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.q) queryParams.append('q', params.q);
      if (params?.folderId) queryParams.append('folderId', params.folderId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.firNumber) queryParams.append('firNumber', params.firNumber);
      if (params?.policeStation) queryParams.append('policeStation', params.policeStation);
      if (params?.district) queryParams.append('district', params.district);
      if (params?.acts) queryParams.append('acts', params.acts);
      if (params?.sections) queryParams.append('sections', params.sections);
      if (params?.limit) queryParams.append('limit', params.limit);
      if (params?.offset) queryParams.append('offset', params.offset);
      
      const queryString = queryParams.toString();
      return this.request(`/search${queryString ? `?${queryString}` : ''}`);
    },
    
    vectorSearch: (data: { query: string; folderIds?: string[]; documentIds?: string[]; limit?: number; threshold?: number }) => 
      this.request('/search/vector', { method: 'POST', body: JSON.stringify(data) }),
    
    getChunks: (documentId: string, params?: { limit?: string; offset?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit);
      if (params?.offset) queryParams.append('offset', params.offset);
      
      const queryString = queryParams.toString();
      return this.request(`/search/chunks/${documentId}${queryString ? `?${queryString}` : ''}`);
    },
    
    getPages: (documentId: string, page?: string) => 
      this.request(`/search/pages/${documentId}${page ? `?page=${page}` : ''}`),
  };

  // Chat API
  chat = {
    createConversation: (data: { userId?: string; scope?: any }) => 
      this.request('/chat/conversations', { method: 'POST', body: JSON.stringify(data) }),
    
    getConversation: (id: string) => 
      this.request(`/chat/conversations/${id}`),
    
    getConversations: (userId?: string) => 
      this.request(`/chat/conversations${userId ? `?userId=${userId}` : ''}`),
    
    sendMessage: (conversationId: string, data: { content: string; context?: any }) => 
      this.request(`/chat/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    
    getAnalytics: () => 
      this.request('/chat/analytics'),
    
    refreshAnalytics: () => 
      this.request('/chat/analytics/refresh', { method: 'POST' }),
  };
}

export const apiClient = new ApiClient();