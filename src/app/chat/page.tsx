"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
// removed unused selects
import { apiClient } from "@/lib/api-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: any;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface Document {
  id: string;
  title: string;
  folder_id: string | null;
  folder?: {
    name: string;
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your FIR Intelligence assistant. You can ask me about your FIR documents, search for specific information, or get analytics about your cases. How can I help you today?',
      created_at: new Date().toISOString(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [scope, setScope] = useState({
    folderIds: [] as string[],
    documentIds: [] as string[],
    scopeType: 'global' as 'global' | 'folder' | 'document'
  });
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Format date to "22 Oct '25" format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize a new conversation if none exists
    if (!currentConversationId) {
      createNewConversation();
    }
  }, []);

  // removed folder/document fetching for hidden scope selector

  const createNewConversation = async () => {
    try {
      const conversation = await apiClient.chat.createConversation({
        scope: scope.scopeType === 'global' ? null : {
          folderIds: scope.scopeType === 'folder' ? scope.folderIds : [],
          documentIds: scope.scopeType === 'document' ? scope.documentIds : []
        }
      });
      setCurrentConversationId(conversation.id);
      // Reset messages and show welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your FIR Intelligence assistant. You can ask me about your FIR documents, search for specific information, or get analytics about your cases. How can I help you today?',
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentConversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString(),
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call backend API which will call Agno AI service
      const response = await apiClient.chat.sendMessage(currentConversationId, {
        content: inputMessage,
        context: {
          scope: scope.scopeType === 'global' ? null : {
            folderIds: scope.scopeType === 'folder' ? scope.folderIds : [],
            documentIds: scope.scopeType === 'document' ? scope.documentIds : []
          }
        }
      });

      // Add AI response to UI
      const aiMessage: Message = {
        id: response.aiMessage.id,
        role: 'assistant',
        content: response.aiMessage.content,
        created_at: response.aiMessage.created_at,
        metadata: response.aiMessage.metadata
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || "Sorry, I encountered an error processing your request. Please try again.",
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // removed scope selector handlers

  return (
    <div className="flex-1 flex flex-col p-4 pt-6 h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <MessageSquare className="h-8 w-8 mr-2 text-primary" />
          Chat Assistant
        </h1>
        {/* actions removed: global filter and new chat */}
      </div>

      {/* scope selector hidden */}

      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col mb-4">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg">FIR Intelligence Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-muted rounded-tl-none'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.role === 'assistant' ? (
                          <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        ) : (
                          <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 break-words">
                          {message.role === 'assistant' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-table:my-2">
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <div>{message.content}</div>
                          )}
                          {message.role === 'assistant' && message.metadata?.citations && message.metadata.citations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="text-xs text-muted-foreground mb-1">Sources:</div>
                              <div className="flex flex-wrap gap-1">
                                {message.metadata.citations.slice(0, 5).map((citation: any, idx: number) => (
                                  <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                    {citation.source_title || citation.document_title || `Doc ${idx + 1}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDate(message.created_at)} • {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-4 bg-muted rounded-tl-none">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-100"></div>
                          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your FIR documents..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}