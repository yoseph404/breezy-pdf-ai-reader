
import React, { useEffect, useState, useRef } from 'react';
import { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjs from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

interface PDFPageProps {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  activeTool: string;
  highlightColor: string;
  onPageRendered?: (pageNumber: number, textContent: string) => void;
}

const PDFPage: React.FC<PDFPageProps> = ({
  pdfDocument,
  pageNumber,
  scale,
  activeTool,
  highlightColor,
  onPageRendered,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState<string>('');
  const [paths, setPaths] = useState<Array<{path: string, color: string, type: string}>>([]);
  const [highlights, setHighlights] = useState<Array<{
    rects: Array<{x: number, y: number, width: number, height: number}>,
    color: string
  }>>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [textAnnotations, setTextAnnotations] = useState<Array<{
    x: number,
    y: number,
    text: string
  }>>([]);
  const [shapes, setShapes] = useState<Array<{
    type: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  }>>([]);

  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  
  useEffect(() => {
    // Initialize the speech synthesis
    if (typeof window !== "undefined") {
      speechSynthesisRef.current = window.speechSynthesis;
    }
    
    return () => {
      // Clean up speech synthesis on component unmount
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  // Cleanup speaking when component unmounts or tool changes
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, [activeTool]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current || !textLayerRef.current) {
        return;
      }

      try {
        // Clear previous content
        const textLayer = textLayerRef.current;
        textLayer.innerHTML = '';
        
        // Reset annotations
        setHighlights([]);
        setPaths([]);
        setTextAnnotations([]);
        setShapes([]);

        // Get the page
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        
        // Set up canvas
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setPageSize({ width: viewport.width, height: viewport.height });
        
        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport,
        };
        
        await page.render(renderContext).promise;
        
        // Extract text content
        const textContent = await page.getTextContent();
        const textItems = textContent.items as TextItem[];
        
        // Collect and display text layer
        let pageText = '';
        textItems.forEach((item) => {
          if ('str' in item) {
            pageText += item.str + ' ';
            
            const tx = pdfjs.Util.transform(
              viewport.transform,
              item.transform
            );
            
            const style = {
              left: `${tx[4]}px`,
              top: `${tx[5]}px`,
              fontSize: `${Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]))}px`,
              transform: `scaleX(${tx[0] / tx[2]})`,
              width: `${item.width * viewport.scale}px`,
              height: `${item.height * viewport.scale}px`,
            };
            
            const textSpan = document.createElement('span');
            textSpan.textContent = item.str;
            Object.assign(textSpan.style, style);
            textSpan.className = 'text-item';
            textSpan.dataset.text = item.str;
            
            textLayer.appendChild(textSpan);
          }
        });
        
        if (onPageRendered) {
          onPageRendered(pageNumber, pageText);
        }
        
      } catch (error) {
        console.error('Error rendering page:', error);
      }
    };

    renderPage();
  }, [pdfDocument, pageNumber, scale, onPageRendered]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'pen') {
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentPath(`M ${x} ${y}`);
    } else if (activeTool === 'highlight') {
      // Check if there's a text selection
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        handleTextSelection(selection);
      }
    } else if (activeTool === 'text') {
      // Add text annotation
      const text = prompt('Enter text:');
      if (text) {
        setTextAnnotations([...textAnnotations, { x, y, text }]);
      }
    } else if (activeTool === 'shape') {
      setIsDrawing(true);
      setStartPoint({ x, y });
    } else if (activeTool === 'tts') {
      // Check if there's a text selection for text-to-speech
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && speechSynthesisRef.current) {
        const text = selection.toString();
        if (text) {
          // Cancel any ongoing speech
          speechSynthesisRef.current.cancel();
          
          // Create a new utterance with the selected text
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          
          // Speak the text
          speechSynthesisRef.current.speak(utterance);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !activeTool) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'pen') {
      setCurrentPath(prev => `${prev} L ${x} ${y}`);
    } else if (activeTool === 'shape') {
      // This is just for preview, we'll create the actual shape on mouse up
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool || !isDrawing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'pen') {
      setPaths([...paths, { path: currentPath, color: highlightColor, type: 'pen' }]);
      setCurrentPath('');
    } else if (activeTool === 'shape') {
      // Create a shape based on start and end points
      const width = Math.abs(x - startPoint.x);
      const height = Math.abs(y - startPoint.y);
      const left = Math.min(x, startPoint.x);
      const top = Math.min(y, startPoint.y);
      
      setShapes([...shapes, {
        type: 'rectangle',
        x: left,
        y: top,
        width,
        height,
        color: highlightColor
      }]);
    }
    
    setIsDrawing(false);
  };

  const handleTextSelection = (selection: Selection) => {
    const range = selection.getRangeAt(0);
    const rects: Array<{x: number, y: number, width: number, height: number}> = [];
    
    // Get client rects of the selection
    const clientRects = range.getClientRects();
    const container = textLayerRef.current!.getBoundingClientRect();
    
    for (let i = 0; i < clientRects.length; i++) {
      const rect = clientRects[i];
      rects.push({
        x: rect.left - container.left,
        y: rect.top - container.top,
        width: rect.width,
        height: rect.height
      });
    }
    
    // Add the highlight
    if (rects.length > 0) {
      setHighlights([...highlights, { rects, color: highlightColor }]);
      setSelectedText(selection.toString());
    }
    
    // Clear the selection
    selection.removeAllRanges();
  };

  return (
    <div 
      className="pdf-page relative"
      style={{ width: pageSize.width, height: pageSize.height }} 
    >
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
      
      <div 
        ref={textLayerRef} 
        className="absolute top-0 left-0 w-full h-full overflow-hidden"
        style={{ userSelect: activeTool === 'highlight' || activeTool === 'tts' ? 'text' : 'none' }}
      />
      
      <div 
        ref={annotationLayerRef}
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
      >
        {/* Highlights */}
        {highlights.map((highlight, i) => (
          <div key={`highlight-${i}`}>
            {highlight.rects.map((rect, j) => (
              <div 
                key={`highlight-${i}-${j}`}
                className="highlight"
                style={{
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  backgroundColor: highlight.color,
                  opacity: 0.5,
                  position: 'absolute',
                }}
              />
            ))}
          </div>
        ))}
        
        {/* Drawings */}
        <svg className="absolute top-0 left-0 w-full h-full">
          {/* Completed paths */}
          {paths.map((pathData, i) => (
            <path
              key={`path-${i}`}
              d={pathData.path}
              stroke={pathData.color}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          
          {/* Current path */}
          {isDrawing && currentPath && (
            <path
              d={currentPath}
              stroke={highlightColor}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        
        {/* Text annotations */}
        {textAnnotations.map((anno, i) => (
          <div
            key={`text-${i}`}
            className="absolute bg-white p-2 rounded shadow-md border border-gray-300"
            style={{
              left: `${anno.x}px`,
              top: `${anno.y}px`,
              pointerEvents: 'auto'
            }}
          >
            {anno.text}
          </div>
        ))}
        
        {/* Shapes */}
        {shapes.map((shape, i) => (
          shape.type === 'rectangle' ? (
            <div
              key={`shape-${i}`}
              className="absolute border-2"
              style={{
                left: `${shape.x}px`,
                top: `${shape.y}px`,
                width: `${shape.width}px`,
                height: `${shape.height}px`,
                borderColor: shape.color
              }}
            />
          ) : null
        ))}
      </div>
      
      <div 
        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
        style={{ pointerEvents: activeTool ? 'auto' : 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};

export default PDFPage;
