
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { 
  ArrowLeft, 
  ArrowRight, 
  Pencil, 
  Text, 
  Square, 
  Highlighter, 
  ZoomIn, 
  ZoomOut,
  BookOpen,
  MessageSquare,
  Mic
} from 'lucide-react';
import PDFPage from './PDFPage';
import AIAssistant from './AIAssistant';
import { useToast } from '@/components/ui/use-toast';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  onPageRender?: (pageNumber: number, textContent: string) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ onPageRender }) => {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [activeTab, setActiveTab] = useState<string>('view');
  const [activeTool, setActiveTool] = useState<string>('');
  const [highlightColor, setHighlightColor] = useState<string>('#FEF7CD');
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const loadPDF = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      toast({
        title: "PDF Loaded",
        description: `Successfully loaded "${file.name}" (${pdf.numPages} pages)`,
      });
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF file. Please try another file.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadPDF(file);
    }
  };

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  const handlePreviousPage = () => goToPage(currentPage - 1);
  const handleNextPage = () => goToPage(currentPage + 1);
  
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  const handlePageRendered = (pageNumber: number, textContent: string) => {
    setPageTexts(prev => ({ ...prev, [pageNumber]: textContent }));
    if (onPageRender) {
      onPageRender(pageNumber, textContent);
    }
  };

  const getCurrentPageText = () => {
    return pageTexts[currentPage] || '';
  };

  const handleToggleAI = () => {
    setIsAIOpen(!isAIOpen);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-pdf-primary" />
          <h1 className="text-xl font-bold text-pdf-dark">PDF Reader</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Open PDF
          </Button>
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange} 
            className="hidden"
          />

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleToggleAI}
            className={isAIOpen ? "bg-pdf-primary text-white" : ""}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex flex-col flex-1 ${isAIOpen ? 'w-2/3' : 'w-full'}`}>
          <div className="bg-white p-2 border-b flex items-center justify-between">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="view">View</TabsTrigger>
                <TabsTrigger value="annotate">Annotate</TabsTrigger>
                <TabsTrigger value="edit">Edit</TabsTrigger>
              </TabsList>

              <TabsContent value="view" className="flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage <= 1}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    <Input 
                      type="number" 
                      value={currentPage}
                      onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                      className="w-16 text-center"
                      min={1}
                      max={totalPages}
                    />
                    <span className="text-sm text-muted-foreground">/ {totalPages || 0}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <div className="w-32">
                    <Slider 
                      value={[scale * 100]} 
                      min={50} 
                      max={300} 
                      step={10} 
                      onValueChange={([value]) => setScale(value / 100)}
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <span className="text-sm w-14 text-right">{Math.round(scale * 100)}%</span>
                </div>
              </TabsContent>

              <TabsContent value="annotate" className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={activeTool === 'highlight' ? 'bg-pdf-primary text-white' : ''}
                    onClick={() => setActiveTool(activeTool === 'highlight' ? '' : 'highlight')}
                  >
                    <Highlighter className="h-4 w-4 mr-2" />
                    Highlight
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={activeTool === 'pen' ? 'bg-pdf-primary text-white' : ''}
                    onClick={() => setActiveTool(activeTool === 'pen' ? '' : 'pen')}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Draw
                  </Button>
                </div>
                
                <Separator orientation="vertical" className="h-6" />
                
                <div className="flex items-center gap-1">
                  <div 
                    className={`w-5 h-5 rounded-full cursor-pointer ${highlightColor === '#FEF7CD' ? 'ring-2 ring-pdf-primary' : ''}`}
                    style={{ backgroundColor: '#FEF7CD' }}
                    onClick={() => setHighlightColor('#FEF7CD')}
                  />
                  <div 
                    className={`w-5 h-5 rounded-full cursor-pointer ${highlightColor === '#F2FCE2' ? 'ring-2 ring-pdf-primary' : ''}`}
                    style={{ backgroundColor: '#F2FCE2' }}
                    onClick={() => setHighlightColor('#F2FCE2')}
                  />
                  <div 
                    className={`w-5 h-5 rounded-full cursor-pointer ${highlightColor === '#FEC6A1' ? 'ring-2 ring-pdf-primary' : ''}`}
                    style={{ backgroundColor: '#FEC6A1' }}
                    onClick={() => setHighlightColor('#FEC6A1')}
                  />
                  <div 
                    className={`w-5 h-5 rounded-full cursor-pointer ${highlightColor === '#E5DEFF' ? 'ring-2 ring-pdf-primary' : ''}`}
                    style={{ backgroundColor: '#E5DEFF' }}
                    onClick={() => setHighlightColor('#E5DEFF')}
                  />
                  <div 
                    className={`w-5 h-5 rounded-full cursor-pointer ${highlightColor === '#FFDEE2' ? 'ring-2 ring-pdf-primary' : ''}`}
                    style={{ backgroundColor: '#FFDEE2' }}
                    onClick={() => setHighlightColor('#FFDEE2')}
                  />
                </div>
              </TabsContent>

              <TabsContent value="edit" className="flex items-center gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className={activeTool === 'text' ? 'bg-pdf-primary text-white' : ''}
                  onClick={() => setActiveTool(activeTool === 'text' ? '' : 'text')}
                >
                  <Text className="h-4 w-4 mr-2" />
                  Add Text
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={activeTool === 'shape' ? 'bg-pdf-primary text-white' : ''}
                  onClick={() => setActiveTool(activeTool === 'shape' ? '' : 'shape')}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Add Shape
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={activeTool === 'tts' ? 'bg-pdf-primary text-white' : ''}
                  onClick={() => setActiveTool(activeTool === 'tts' ? '' : 'tts')}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Text-to-Speech
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          <div className="pdf-container">
            {pdfDocument ? (
              <PDFPage
                pdfDocument={pdfDocument}
                pageNumber={currentPage}
                scale={scale}
                activeTool={activeTool}
                highlightColor={highlightColor}
                onPageRendered={handlePageRendered}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-white p-12 rounded-lg shadow-md text-center">
                  <BookOpen className="h-16 w-16 mx-auto text-pdf-primary mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No PDF Open</h2>
                  <p className="text-gray-500 mb-6">Upload a PDF file to get started</p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {isAIOpen && (
          <div className="w-1/3 border-l">
            <AIAssistant 
              pageText={getCurrentPageText()} 
              currentPage={currentPage} 
              totalPages={totalPages}
              onClose={() => setIsAIOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
