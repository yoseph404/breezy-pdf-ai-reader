
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, MessageSquare, Search, Translate, Mic, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIAssistantProps {
  pageText: string;
  currentPage: number;
  totalPages: number;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ pageText, currentPage, totalPages, onClose }) => {
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('summary');

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() && activeTab !== 'summary') return;
    
    setIsLoading(true);
    
    try {
      let prompt = '';
      
      switch (activeTab) {
        case 'summary':
          prompt = `Summarize the following text in a concise way:\n${pageText}`;
          break;
        case 'ask':
          prompt = `Answer this question based on the text: ${query}\n\nText: ${pageText}`;
          break;
        case 'translate':
          prompt = `Translate the following text to ${query || 'French'}:\n${pageText}`;
          break;
        default:
          prompt = query;
      }
      
      // Mock AI response functionality
      // In a real implementation, this would call an API like OpenAI
      await mockAIResponse(prompt, activeTab);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setResponse('Sorry, I encountered an error processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mock function to simulate AI responses
  const mockAIResponse = async (prompt: string, tab: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let mockResponse = '';
    
    switch (tab) {
      case 'summary':
        mockResponse = `## Summary of page ${currentPage}:\n\nThis is a simulated AI summary of the text. In a real implementation, this would use the OpenAI API or another AI service to generate an actual summary of the document content.\n\nThe summary would highlight key points from the page content, main topics, and important details.`;
        break;
      case 'ask':
        mockResponse = `Based on the document content, here's the answer to your question:\n\n${query ? `"${query}"\n\n` : ''}This is a simulated AI response. In a real implementation, this would provide an answer based on the actual content of the PDF using an AI service like OpenAI's GPT.`;
        break;
      case 'translate':
        mockResponse = `Translated text (${query || 'French'}):\n\nThis is a simulated translation. In a real implementation, this would provide an actual translation of the selected text using an AI service.`;
        break;
      default:
        mockResponse = 'I don\'t understand that request. Please try again.';
    }
    
    setResponse(mockResponse);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-pdf-primary" />
          <h2 className="font-medium">AI Assistant</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="flex flex-col flex-1"
      >
        <div className="px-4 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              <BookOpen className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="ask" className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Ask
            </TabsTrigger>
            <TabsTrigger value="translate" className="flex-1">
              <Translate className="h-4 w-4 mr-2" />
              Translate
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="summary" className="flex-1 flex flex-col p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Get an AI-generated summary of the current page content.
          </p>
          
          <form onSubmit={handleQuerySubmit} className="mt-auto">
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading || !pageText}
            >
              {isLoading ? 'Generating Summary...' : 'Generate Summary'}
            </Button>
          </form>
        </TabsContent>
        
        <TabsContent value="ask" className="flex-1 flex flex-col p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Ask questions about the content of the current page.
          </p>
          
          <form onSubmit={handleQuerySubmit} className="flex flex-col gap-4 mt-auto">
            <Textarea
              placeholder="Ask a question about this page..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="resize-none"
              rows={3}
            />
            
            <Button 
              type="submit" 
              disabled={isLoading || !query.trim() || !pageText}
            >
              {isLoading ? 'Processing...' : 'Ask AI'}
            </Button>
          </form>
        </TabsContent>
        
        <TabsContent value="translate" className="flex-1 flex flex-col p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Translate the content of the current page.
          </p>
          
          <form onSubmit={handleQuerySubmit} className="flex flex-col gap-4 mt-auto">
            <input
              type="text"
              placeholder="Target language (e.g., Spanish, French)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-2 border rounded"
            />
            
            <Button 
              type="submit" 
              disabled={isLoading || !pageText}
            >
              {isLoading ? 'Translating...' : 'Translate'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
      
      {response && (
        <div className="p-4 border-t">
          <p className="font-medium text-sm mb-2">Result:</p>
          <ScrollArea className="h-64">
            <div className="p-2 rounded bg-slate-50 whitespace-pre-wrap text-sm">
              {response}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
