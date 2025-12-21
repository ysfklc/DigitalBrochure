import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  ZoomIn, 
  ZoomOut,
  Trash2,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  ChevronLeft,
  MousePointer,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  PanelTop,
  PanelBottom,
  Pencil,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Template } from "@shared/schema";

type CanvasSizeKey = 'square' | 'portrait' | 'landscape' | 'a4portrait' | 'a4landscape';
type ToolType = 'select' | 'text' | 'shape' | 'draw' | 'image';
type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line';

const CANVAS_SIZES: Record<CanvasSizeKey, { width: number; height: number; label: string; ratio: string }> = {
  square: { width: 1080, height: 1080, label: 'Square', ratio: '1:1' },
  portrait: { width: 1080, height: 1350, label: 'Portrait', ratio: '4:5' },
  landscape: { width: 1080, height: 566, label: 'Landscape', ratio: '1.91:1' },
  a4portrait: { width: 794, height: 1123, label: 'A4 Portrait', ratio: 'A4' },
  a4landscape: { width: 1123, height: 794, label: 'A4 Landscape', ratio: 'A4' },
};

const FONT_FAMILIES = [
  "Algerian", "Arial", "Arial Black", "Arial Unicode MS", "Baskerville Old Face",
  "Bauhaus 93", "Batang", "Bell MT", "Berlin Sans FB", "Bernard MT Condensed",
  "Bodoni MT", "Book Antiqua", "Bookman Old Style", "Bradley Hand ITC", "Broadway",
  "Brush Script MT", "Calibri", "Californian FB", "Cambria", "Candara", "Castellar",
  "Century", "Century Gothic", "Century Schoolbook", "Chiller", "Colonna MT",
  "Comic Sans MS", "Consolas", "Constantia", "Cooper Black", "Corbel", "Courier New",
  "Crimson Text", "Curlz MT", "Dancing Script", "Edwardian Script ITC", "Elephant",
  "Engravers MT", "Eras Bold ITC", "Eras Demi ITC", "Eras Light ITC", "Eras Medium ITC",
  "Felix Titling", "Fira Code", "Footlight MT Light", "Forte", "Franklin Gothic Medium",
  "Freestyle Script", "French Script MT", "Garamond", "Georgia", "Gill Sans MT",
  "Goudy Old Style", "Great Vibes", "Gulim", "Haettenschweiler", "Harlow Solid Italic",
  "Harrington", "High Tower Text", "Impact", "Imprint MT Shadow", "Inconsolata",
  "Informal Roman", "Inter", "JetBrains Mono", "Jokerman", "Juice ITC", "Kristen ITC",
  "Lato", "Libre Baskerville", "Lobster", "Lucida Bright", "Lucida Calligraphy",
  "Lucida Console", "Lucida Fax", "Lucida Handwriting", "Lucida Sans",
  "Lucida Sans Typewriter", "Lucida Sans Unicode", "Magneto", "Maiandra GD", "Marlett",
  "Matura MT Script Capitals", "Merriweather", "Microsoft Sans Serif", "Mistral",
  "Modern No. 20", "Montserrat", "Monotype Corsiva", "MS Gothic", "MS Mincho",
  "MS Sans Serif", "MS Serif", "Niagara Engraved", "Niagara Solid", "Nunito",
  "Old English Text MT", "Onyx", "Open Sans", "Pacifico", "Palace Script MT",
  "Palatino Linotype", "Papyrus", "Perpetua", "Playbill", "Playfair Display",
  "PMingLiU", "Poppins", "Pristina", "Rage Italic", "Ravie", "Roboto", "Rockwell",
  "Segoe Print", "Segoe Script", "Segoe UI", "Showcard Gothic", "SimSun", "Snap ITC",
  "Source Code Pro", "Stencil", "Sylfaen", "Tahoma", "Tempus Sans ITC",
  "Times New Roman", "Trebuchet MS", "Tw Cen MT", "Verdana", "Viner Hand ITC",
  "Vivaldi", "Vladimir Script", "Webdings", "Wingdings", "Wingdings 2", "Wingdings 3",
].map(font => ({ value: font, label: font }));

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96];

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000', '#800000',
  '#000080', '#808080', '#C0C0C0', '#FFD700', '#FF69B4', '#4B0082',
];

interface CanvasElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'header' | 'footer';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  data: any;
  page: number;
}

interface TextElementData {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
}

interface ShapeElementData {
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

interface DrawingPoint {
  x: number;
  y: number;
}

export default function TemplateEditorPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [canvasSize, setCanvasSize] = useState<CanvasSizeKey>('a4portrait');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [isMovingElement, setIsMovingElement] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, elementX: 0, elementY: 0 });
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<"single_page" | "multi_page">("single_page");
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tempTemplateName, setTempTemplateName] = useState("");
  
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeShapeType, setActiveShapeType] = useState<ShapeType>('rectangle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<DrawingPoint[]>([]);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(2);
  const [textColor, setTextColor] = useState('#000000');
  const [shapeFillColor, setShapeFillColor] = useState('#3B82F6');
  const [shapeStrokeColor, setShapeStrokeColor] = useState('#1E40AF');
  const [showHeaderZone, setShowHeaderZone] = useState(true);
  const [showFooterZone, setShowFooterZone] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(80);
  const [footerHeight, setFooterHeight] = useState(60);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [copiedElement, setCopiedElement] = useState<CanvasElement | null>(null);

  const { data: template, isLoading: loadingTemplate } = useQuery<Template>({
    queryKey: [`/api/templates/${id}`],
    enabled: !!id && id !== "new",
  });

  useEffect(() => {
    if (template) {
      setTemplateName(template.title);
      setTemplateType(template.type as "single_page" | "multi_page");
      setBackgroundColor(template.backgroundColor || '#ffffff');
      
      // Apply background image from template based on type
      if (template.type === 'single_page' && template.backgroundImageUrl) {
        setBackgroundImageUrl(template.backgroundImageUrl);
      } else if (template.type === 'multi_page') {
        // For multi-page, set total pages to 3 (cover, middle, final)
        setTotalPages(3);
      }
      
      const canvasData = template.coverPageConfig as any;
      if (canvasData) {
        if (canvasData.elements) setCanvasElements(canvasData.elements);
        if (canvasData.canvasSize) setCanvasSize(canvasData.canvasSize);
        if (canvasData.totalPages) setTotalPages(canvasData.totalPages);
        if (canvasData.headerHeight !== undefined) setHeaderHeight(canvasData.headerHeight);
        if (canvasData.footerHeight !== undefined) setFooterHeight(canvasData.footerHeight);
        if (canvasData.showHeaderZone !== undefined) setShowHeaderZone(canvasData.showHeaderZone);
        if (canvasData.showFooterZone !== undefined) setShowFooterZone(canvasData.showFooterZone);
      }
    }
  }, [template]);

  // Update background image when page changes for multi-page templates
  useEffect(() => {
    if (template && template.type === 'multi_page') {
      if (currentPage === 1 && template.coverPageImageUrl) {
        setBackgroundImageUrl(template.coverPageImageUrl);
      } else if (currentPage === 2 && template.middlePageImageUrl) {
        setBackgroundImageUrl(template.middlePageImageUrl);
      } else if (currentPage === 3 && template.finalPageImageUrl) {
        setBackgroundImageUrl(template.finalPageImageUrl);
      } else {
        setBackgroundImageUrl(null);
      }
    }
  }, [template, currentPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isInputField) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedElement) {
          const elementToCopy = canvasElements.find(el => el.id === selectedElement);
          if (elementToCopy) {
            setCopiedElement({ ...elementToCopy });
            toast({
              title: t("common.success"),
              description: t("editor.elementCopied"),
            });
          }
        }
        e.preventDefault();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (copiedElement) {
          const newElement: CanvasElement = {
            ...copiedElement,
            id: `${copiedElement.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            x: copiedElement.x + 20,
            y: copiedElement.y + 20,
            data: { ...copiedElement.data },
            page: currentPage,
          };
          setCanvasElements(prev => [...prev, newElement]);
          setSelectedElement(newElement.id);
          toast({
            title: t("common.success"),
            description: t("editor.elementPasted"),
          });
        }
        e.preventDefault();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement) {
          setCanvasElements(prev => prev.filter(el => el.id !== selectedElement));
          setSelectedElement(null);
        }
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, canvasElements, copiedElement, currentPage, t, toast]);

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/templates", data) as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: t("common.success"),
        description: t("templates.savedSuccessfully"),
      });
      setLocation(`/templates/${data.id}/edit`);
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("templates.saveFailed"),
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: any }) => {
      return await apiRequest("PATCH", `/api/templates/${templateId}`, data) as any;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({ queryKey: [`/api/templates/${variables.templateId}`] });
      toast({
        title: t("common.success"),
        description: t("templates.savedSuccessfully"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("templates.saveFailed"),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!templateName.trim()) {
      setTempTemplateName("");
      setShowSaveDialog(true);
      return;
    }
    performSave(templateName);
  };

  const performSave = (name: string) => {
    const canvasData = {
      elements: canvasElements.map(el => ({
        id: el.id,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        opacity: el.opacity,
        data: el.data,
        page: el.page,
      })),
      canvasSize,
      totalPages,
      headerHeight,
      footerHeight,
      showHeaderZone,
      showFooterZone,
    };

    const templateData = {
      title: name,
      type: templateType,
      coverPageConfig: canvasData,
      backgroundColor,
    };

    if (id && id !== "new") {
      updateTemplateMutation.mutate({
        templateId: id,
        data: templateData,
      });
    } else {
      createTemplateMutation.mutate(templateData);
    }
  };

  const handleSaveDialogConfirm = () => {
    if (!tempTemplateName.trim()) {
      toast({
        title: t("common.error"),
        description: t("templates.nameRequired"),
        variant: "destructive",
      });
      return;
    }
    setTemplateName(tempTemplateName.trim());
    setShowSaveDialog(false);
    performSave(tempTemplateName.trim());
  };

  const handlePreview = () => setShowPreview(true);
  const handleUndo = () => console.log("Undo");
  const handleRedo = () => console.log("Redo");
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 25));

  const addTextElement = (clickX: number, clickY: number) => {
    if (!canvasRef.current) return;
    
    const elementWidth = 200;
    const elementHeight = 40;
    const x = Math.max(0, clickX - elementWidth / 2);
    const y = Math.max(0, clickY - elementHeight / 2);
    
    const newElement: CanvasElement = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      x,
      y,
      width: elementWidth,
      height: elementHeight,
      rotation: 0,
      opacity: 100,
      data: {
        text: t("editor.sampleText"),
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        color: textColor,
        backgroundColor: 'transparent',
      } as TextElementData,
      page: currentPage,
    };
    
    setCanvasElements((prev) => [...prev, newElement]);
    setSelectedElement(newElement.id);
    setActiveTool('select');
  };

  const addShapeElement = (shapeType: ShapeType, clickX: number, clickY: number) => {
    if (!canvasRef.current) return;
    
    const elementWidth = shapeType === 'line' ? 200 : 100;
    const elementHeight = shapeType === 'line' ? 4 : 100;
    const x = Math.max(0, clickX - elementWidth / 2);
    const y = Math.max(0, clickY - elementHeight / 2);
    
    const newElement: CanvasElement = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'shape',
      x,
      y,
      width: elementWidth,
      height: elementHeight,
      rotation: 0,
      opacity: 100,
      data: {
        shapeType,
        fill: shapeFillColor,
        stroke: shapeStrokeColor,
        strokeWidth: 2,
      } as ShapeElementData,
      page: currentPage,
    };
    
    setCanvasElements((prev) => [...prev, newElement]);
    setSelectedElement(newElement.id);
    setActiveTool('select');
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / (zoom / 100) / 0.5;
    const clickY = (e.clientY - rect.top) / (zoom / 100) / 0.5;
    
    if (activeTool === 'text') {
      addTextElement(clickX, clickY);
      return;
    }
    
    if (activeTool === 'shape') {
      addShapeElement(activeShapeType, clickX, clickY);
      return;
    }
    
    if (!isMovingElement && !isDrawing) {
      setSelectedElement(null);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'draw' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (zoom / 100) / 0.5;
      const y = (e.clientY - rect.top) / (zoom / 100) / 0.5;
      setIsDrawing(true);
      setDrawingPoints([{ x, y }]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'draw' && isDrawing && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (zoom / 100) / 0.5;
      const y = (e.clientY - rect.top) / (zoom / 100) / 0.5;
      setDrawingPoints((prev) => [...prev, { x, y }]);
      return;
    }

    if (isResizing) {
      handleResizeMouseMove(e);
      return;
    }
    
    if (!isMovingElement || !selectedElement || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / (zoom / 100) / 0.5;
    const mouseY = (e.clientY - rect.top) / (zoom / 100) / 0.5;
    
    const newX = Math.max(0, mouseX - dragOffset.x);
    const newY = Math.max(0, mouseY - dragOffset.y);
    
    setCanvasElements((prev) =>
      prev.map((el) =>
        el.id === selectedElement ? { ...el, x: newX, y: newY } : el
      )
    );
  };

  const handleCanvasMouseUp = () => {
    if (activeTool === 'draw' && isDrawing && drawingPoints.length > 1) {
      const minX = Math.min(...drawingPoints.map(p => p.x));
      const minY = Math.min(...drawingPoints.map(p => p.y));
      const maxX = Math.max(...drawingPoints.map(p => p.x));
      const maxY = Math.max(...drawingPoints.map(p => p.y));
      
      const normalizedPoints = drawingPoints.map(p => ({
        x: p.x - minX,
        y: p.y - minY,
      }));
      
      const newElement: CanvasElement = {
        id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'shape',
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 10),
        height: Math.max(maxY - minY, 10),
        rotation: 0,
        opacity: 100,
        data: {
          shapeType: 'freehand' as any,
          points: normalizedPoints,
          strokeColor: drawColor,
          strokeWidth: drawStrokeWidth,
          fill: 'transparent',
          stroke: drawColor,
        },
        page: currentPage,
      };
      
      setCanvasElements((prev) => [...prev, newElement]);
      setSelectedElement(newElement.id);
    }
    
    setIsDrawing(false);
    setDrawingPoints([]);
    setIsMovingElement(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleCanvasMouseLeave = () => {
    if (isDrawing) {
      handleCanvasMouseUp();
    }
    setIsMovingElement(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleElementMouseDown = (elementId: string, e: React.MouseEvent) => {
    if (activeTool !== 'select') return;
    
    e.stopPropagation();
    e.preventDefault();
    setSelectedElement(elementId);
    setIsMovingElement(true);
    
    const element = canvasElements.find((el) => el.id === elementId);
    if (element && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / (zoom / 100) / 0.5;
      const mouseY = (e.clientY - rect.top) / (zoom / 100) / 0.5;
      setDragOffset({
        x: mouseX - element.x,
        y: mouseY - element.y,
      });
    }
  };

  const handleResizeMouseDown = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedElement || !canvasRef.current) return;
    
    const element = canvasElements.find((el) => el.id === selectedElement);
    if (!element) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / (zoom / 100) / 0.5;
    const mouseY = (e.clientY - rect.top) / (zoom / 100) / 0.5;
    
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: mouseX,
      y: mouseY,
      width: element.width,
      height: element.height,
      elementX: element.x,
      elementY: element.y,
    });
  };

  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (!isResizing || !selectedElement || !canvasRef.current || !resizeHandle) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / (zoom / 100) / 0.5;
    const mouseY = (e.clientY - rect.top) / (zoom / 100) / 0.5;
    
    const deltaX = mouseX - resizeStart.x;
    const deltaY = mouseY - resizeStart.y;
    
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newX = resizeStart.elementX;
    let newY = resizeStart.elementY;
    
    const minSize = 20;
    
    if (resizeHandle.includes('e')) {
      newWidth = Math.max(minSize, resizeStart.width + deltaX);
    }
    if (resizeHandle.includes('w')) {
      const widthDelta = Math.min(deltaX, resizeStart.width - minSize);
      newWidth = resizeStart.width - widthDelta;
      newX = resizeStart.elementX + widthDelta;
    }
    if (resizeHandle.includes('s')) {
      newHeight = Math.max(minSize, resizeStart.height + deltaY);
    }
    if (resizeHandle.includes('n')) {
      const heightDelta = Math.min(deltaY, resizeStart.height - minSize);
      newHeight = resizeStart.height - heightDelta;
      newY = resizeStart.elementY + heightDelta;
    }
    
    setCanvasElements((prev) =>
      prev.map((el) =>
        el.id === selectedElement
          ? { ...el, width: newWidth, height: newHeight, x: newX, y: newY }
          : el
      )
    );
  };

  const handleDeleteElement = () => {
    if (selectedElement) {
      setCanvasElements((prev) => prev.filter((el) => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  const updateElementProperty = (property: keyof CanvasElement, value: any) => {
    if (selectedElement) {
      setCanvasElements((prev) =>
        prev.map((el) =>
          el.id === selectedElement ? { ...el, [property]: value } : el
        )
      );
    }
  };

  const updateElementData = (dataProperty: string, value: any) => {
    if (selectedElement) {
      setCanvasElements((prev) =>
        prev.map((el) =>
          el.id === selectedElement
            ? { ...el, data: { ...el.data, [dataProperty]: value } }
            : el
        )
      );
    }
  };

  const currentPageElements = canvasElements.filter((el) => el.page === currentPage);
  const selectedElementData = canvasElements.find((el) => el.id === selectedElement);

  const renderElement = (element: CanvasElement, inPreview: boolean = false) => {
    const scale = inPreview ? 0.4 : zoom / 100 * 0.5;
    
    if (element.type === 'text') {
      const textData = element.data as TextElementData;
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontFamily: textData.fontFamily,
            fontSize: `${textData.fontSize * scale}px`,
            fontWeight: textData.fontWeight,
            fontStyle: textData.fontStyle,
            textDecoration: textData.textDecoration,
            textAlign: textData.textAlign,
            color: textData.color,
            backgroundColor: textData.backgroundColor === 'transparent' ? 'transparent' : textData.backgroundColor,
          }}
        >
          <span className="w-full px-1">{textData.text}</span>
        </div>
      );
    }
    
    if (element.type === 'shape') {
      const shapeData = element.data as ShapeElementData;
      
      if (shapeData.shapeType === 'rectangle') {
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: shapeData.fill,
              border: `${shapeData.strokeWidth}px solid ${shapeData.stroke}`,
              borderRadius: '4px',
            }}
          />
        );
      }
      
      if (shapeData.shapeType === 'circle') {
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: shapeData.fill,
              border: `${shapeData.strokeWidth}px solid ${shapeData.stroke}`,
            }}
          />
        );
      }
      
      if (shapeData.shapeType === 'triangle') {
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon
              points="50,5 95,95 5,95"
              fill={shapeData.fill}
              stroke={shapeData.stroke}
              strokeWidth={shapeData.strokeWidth}
            />
          </svg>
        );
      }
      
      if (shapeData.shapeType === 'line') {
        return (
          <div
            className="w-full"
            style={{
              height: `${shapeData.strokeWidth}px`,
              backgroundColor: shapeData.stroke,
              marginTop: `${(element.height - shapeData.strokeWidth) / 2}px`,
            }}
          />
        );
      }
      
      if ((shapeData as any).shapeType === 'freehand' && (element.data as any).points) {
        const points = (element.data as any).points as DrawingPoint[];
        const pathData = points.reduce((acc, point, i) => {
          if (i === 0) return `M ${point.x} ${point.y}`;
          return `${acc} L ${point.x} ${point.y}`;
        }, '');
        
        return (
          <svg viewBox={`0 0 ${element.width} ${element.height}`} className="w-full h-full">
            <path
              d={pathData}
              fill="none"
              stroke={(element.data as any).strokeColor || shapeData.stroke}
              strokeWidth={(element.data as any).strokeWidth || shapeData.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      }
    }
    
    return null;
  };

  if (loadingTemplate && id !== "new") {
    return (
      <div className="flex h-full">
        <Skeleton className="w-16 h-full" />
        <Skeleton className="flex-1 h-full" />
        <Skeleton className="w-80 h-full" />
      </div>
    );
  }

  const scaledCanvasWidth = (CANVAS_SIZES[canvasSize].width * zoom) / 100 * 0.5;
  const scaledCanvasHeight = (CANVAS_SIZES[canvasSize].height * zoom) / 100 * 0.5;
  const scaledHeaderHeight = (headerHeight * zoom) / 100 * 0.5;
  const scaledFooterHeight = (footerHeight * zoom) / 100 * 0.5;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background z-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/templates")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="font-medium truncate max-w-[200px]" data-testid="text-template-name">
            {templateName || t("templates.createTemplate")}
          </h1>
          <Badge variant="secondary">{templateType === "single_page" ? t("templates.singlePage") : t("templates.multiPage")}</Badge>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleUndo} data-testid="button-undo">
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("editor.undo")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleRedo} data-testid="button-redo">
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("editor.redo")}</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} data-testid="button-zoom-out">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("editor.zoomOut")}</TooltipContent>
          </Tooltip>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} data-testid="button-zoom-in">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("editor.zoomIn")}</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handlePreview} data-testid="button-preview">
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("editor.preview")}</TooltipContent>
          </Tooltip>
          <Button onClick={handleSave} data-testid="button-save">
            <Save className="mr-2 h-4 w-4" />
            {t("common.save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-16 border-r bg-muted/30 flex flex-col items-center py-4 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'select' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setActiveTool('select')}
                data-testid="tool-select"
              >
                <MousePointer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("editor.selectTool")}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'text' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setActiveTool('text')}
                data-testid="tool-text"
              >
                <Type className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("editor.textTool")}</TooltipContent>
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeTool === 'shape' ? 'default' : 'ghost'}
                size="icon"
                data-testid="tool-shape"
              >
                <Square className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-auto p-2">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => { setActiveTool('shape'); setActiveShapeType('rectangle'); }}
                >
                  <Square className="h-4 w-4 mr-2" /> {t("editor.rectangle")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => { setActiveTool('shape'); setActiveShapeType('circle'); }}
                >
                  <Circle className="h-4 w-4 mr-2" /> {t("editor.circle")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => { setActiveTool('shape'); setActiveShapeType('triangle'); }}
                >
                  <Triangle className="h-4 w-4 mr-2" /> {t("editor.triangle")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => { setActiveTool('shape'); setActiveShapeType('line'); }}
                >
                  <Minus className="h-4 w-4 mr-2" /> {t("editor.line")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'draw' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setActiveTool('draw')}
                data-testid="tool-draw"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("editor.drawTool")}</TooltipContent>
          </Tooltip>

          <Separator className="my-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showHeaderZone ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setShowHeaderZone(!showHeaderZone)}
                data-testid="toggle-header"
              >
                <PanelTop className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("editor.headerZone")}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showFooterZone ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setShowFooterZone(!showFooterZone)}
                data-testid="toggle-footer"
              >
                <PanelBottom className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("editor.footerZone")}</TooltipContent>
          </Tooltip>

          <Separator className="my-2" />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="color-palette">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-64">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">{t("editor.textColor")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("editor.shapeFill")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="color"
                      value={shapeFillColor}
                      onChange={(e) => setShapeFillColor(e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={shapeFillColor}
                      onChange={(e) => setShapeFillColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("editor.shapeStroke")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="color"
                      value={shapeStrokeColor}
                      onChange={(e) => setShapeStrokeColor(e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={shapeStrokeColor}
                      onChange={(e) => setShapeStrokeColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("editor.drawColor")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="color"
                      value={drawColor}
                      onChange={(e) => setDrawColor(e.target.value)}
                      className="w-10 h-8 p-1"
                    />
                    <Input
                      value={drawColor}
                      onChange={(e) => setDrawColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("editor.presetColors")}</Label>
                  <div className="grid grid-cols-6 gap-1 mt-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setTextColor(color);
                          setShapeFillColor(color);
                          setDrawColor(color);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 overflow-auto bg-muted/50 flex flex-col">
          {templateType === 'multi_page' && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-3 bg-background border-b">
              <span className="text-sm text-muted-foreground mr-2">Page:</span>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  data-testid={`button-page-${pageNum}`}
                >
                  {pageNum === 1 ? 'Cover' : pageNum === 2 ? 'Middle' : pageNum === 3 ? 'Final' : `Page ${pageNum}`}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                ({currentPage} of {totalPages})
              </span>
            </div>
          )}
          <div className="flex-1 p-8 flex items-start justify-center">
          <div
            ref={canvasRef}
            className={`relative shadow-xl transition-shadow ${
              activeTool === 'text' ? 'cursor-text' :
              activeTool === 'shape' ? 'cursor-crosshair' :
              activeTool === 'draw' ? 'cursor-crosshair' :
              'cursor-default'
            }`}
            style={{
              width: `${scaledCanvasWidth}px`,
              height: `${scaledCanvasHeight}px`,
              backgroundColor,
              backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
            data-testid="canvas-area"
          >
            {showHeaderZone && (
              <div
                className="absolute top-0 left-0 right-0 bg-blue-100/50 border-b-2 border-dashed border-blue-400 flex items-center justify-center"
                style={{ height: `${scaledHeaderHeight}px` }}
              >
                <span className="text-xs text-blue-600 font-medium">{t("editor.headerZone")}</span>
              </div>
            )}

            {showFooterZone && (
              <div
                className="absolute bottom-0 left-0 right-0 bg-green-100/50 border-t-2 border-dashed border-green-400 flex items-center justify-center"
                style={{ height: `${scaledFooterHeight}px` }}
              >
                <span className="text-xs text-green-600 font-medium">{t("editor.footerZone")}</span>
              </div>
            )}

            {currentPageElements.map((element) => (
              <div
                key={element.id}
                className={`absolute transition-shadow select-none ${
                  selectedElement === element.id
                    ? 'ring-2 ring-primary shadow-lg cursor-grab'
                    : activeTool === 'select' ? 'hover:ring-1 hover:ring-primary/50 cursor-pointer' : ''
                } ${isMovingElement && selectedElement === element.id ? 'cursor-grabbing' : ''}`}
                style={{
                  left: `${(element.x * zoom) / 100 * 0.5}px`,
                  top: `${(element.y * zoom) / 100 * 0.5}px`,
                  width: `${(element.width * zoom) / 100 * 0.5}px`,
                  height: `${(element.height * zoom) / 100 * 0.5}px`,
                  transform: `rotate(${element.rotation}deg)`,
                  opacity: element.opacity / 100,
                }}
                onMouseDown={(e) => handleElementMouseDown(element.id, e)}
                data-testid={`canvas-element-${element.id}`}
              >
                {renderElement(element)}
                
                {selectedElement === element.id && (
                  <>
                    <div
                      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm cursor-nw-resize"
                      style={{ top: -6, left: -6 }}
                      onMouseDown={(e) => handleResizeMouseDown('nw', e)}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm cursor-ne-resize"
                      style={{ top: -6, right: -6 }}
                      onMouseDown={(e) => handleResizeMouseDown('ne', e)}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm cursor-sw-resize"
                      style={{ bottom: -6, left: -6 }}
                      onMouseDown={(e) => handleResizeMouseDown('sw', e)}
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm cursor-se-resize"
                      style={{ bottom: -6, right: -6 }}
                      onMouseDown={(e) => handleResizeMouseDown('se', e)}
                    />
                  </>
                )}
              </div>
            ))}

            {isDrawing && drawingPoints.length > 1 && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              >
                <path
                  d={drawingPoints.reduce((acc, point, i) => {
                    const scaledX = (point.x * zoom) / 100 * 0.5;
                    const scaledY = (point.y * zoom) / 100 * 0.5;
                    if (i === 0) return `M ${scaledX} ${scaledY}`;
                    return `${acc} L ${scaledX} ${scaledY}`;
                  }, '')}
                  fill="none"
                  stroke={drawColor}
                  strokeWidth={drawStrokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          </div>
        </div>

        <div className="w-80 border-l bg-background overflow-auto">
          <div className="p-4 border-b flex items-center justify-between gap-2">
            <h3 className="font-medium">{t("editor.properties")}</h3>
            {selectedElement && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteElement}
                data-testid="button-delete-element"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          
          {selectedElementData ? (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="p-4 space-y-4">
                {selectedElementData.type === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">{t("editor.textContent")}</Label>
                      <Textarea
                        value={selectedElementData.data.text}
                        onChange={(e) => updateElementData('text', e.target.value)}
                        className="mt-1"
                        data-testid="input-text-content"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.fontFamily")}</Label>
                      <Select
                        value={selectedElementData.data.fontFamily}
                        onValueChange={(v) => updateElementData('fontFamily', v)}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-font-family">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              <span style={{ fontFamily: font.value }}>{font.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.fontSize")}</Label>
                      <Select
                        value={String(selectedElementData.data.fontSize)}
                        onValueChange={(v) => updateElementData('fontSize', Number(v))}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-font-size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_SIZES.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}px
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={selectedElementData.data.fontWeight === 'bold' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => updateElementData('fontWeight', selectedElementData.data.fontWeight === 'bold' ? 'normal' : 'bold')}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedElementData.data.fontStyle === 'italic' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => updateElementData('fontStyle', selectedElementData.data.fontStyle === 'italic' ? 'normal' : 'italic')}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedElementData.data.textDecoration === 'underline' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => updateElementData('textDecoration', selectedElementData.data.textDecoration === 'underline' ? 'none' : 'underline')}
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6 mx-1" />
                      <Button
                        variant={selectedElementData.data.textAlign === 'left' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => updateElementData('textAlign', 'left')}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedElementData.data.textAlign === 'center' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => updateElementData('textAlign', 'center')}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedElementData.data.textAlign === 'right' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => updateElementData('textAlign', 'right')}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.textColor")}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="color"
                          value={selectedElementData.data.color}
                          onChange={(e) => updateElementData('color', e.target.value)}
                          className="w-10 h-8 p-1"
                        />
                        <Input
                          value={selectedElementData.data.color}
                          onChange={(e) => updateElementData('color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.backgroundColor")}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="color"
                          value={selectedElementData.data.backgroundColor === 'transparent' ? '#ffffff' : selectedElementData.data.backgroundColor}
                          onChange={(e) => updateElementData('backgroundColor', e.target.value)}
                          className="w-10 h-8 p-1"
                        />
                        <Input
                          value={selectedElementData.data.backgroundColor}
                          onChange={(e) => updateElementData('backgroundColor', e.target.value)}
                          className="flex-1"
                          placeholder="transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedElementData.type === 'shape' && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">{t("editor.shapeFill")}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="color"
                          value={selectedElementData.data.fill === 'transparent' ? '#ffffff' : selectedElementData.data.fill}
                          onChange={(e) => updateElementData('fill', e.target.value)}
                          className="w-10 h-8 p-1"
                        />
                        <Input
                          value={selectedElementData.data.fill}
                          onChange={(e) => updateElementData('fill', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.shapeStroke")}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="color"
                          value={selectedElementData.data.stroke}
                          onChange={(e) => updateElementData('stroke', e.target.value)}
                          className="w-10 h-8 p-1"
                        />
                        <Input
                          value={selectedElementData.data.stroke}
                          onChange={(e) => updateElementData('stroke', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.strokeWidth")}</Label>
                      <Slider
                        value={[selectedElementData.data.strokeWidth]}
                        onValueChange={([v]) => updateElementData('strokeWidth', v)}
                        min={1}
                        max={20}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t("editor.positionX")}</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedElementData.x)}
                        onChange={(e) => updateElementProperty('x', Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.positionY")}</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedElementData.y)}
                        onChange={(e) => updateElementProperty('y', Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t("editor.width")}</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedElementData.width)}
                        onChange={(e) => updateElementProperty('width', Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.height")}</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedElementData.height)}
                        onChange={(e) => updateElementProperty('height', Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t("editor.rotation")}</Label>
                    <Slider
                      value={[selectedElementData.rotation]}
                      onValueChange={([v]) => updateElementProperty('rotation', v)}
                      min={0}
                      max={360}
                      step={1}
                      className="mt-2"
                    />
                    <span className="text-xs text-muted-foreground">{selectedElementData.rotation}</span>
                  </div>
                  <div>
                    <Label className="text-xs">{t("editor.opacity")}</Label>
                    <Slider
                      value={[selectedElementData.opacity]}
                      onValueChange={([v]) => updateElementProperty('opacity', v)}
                      min={0}
                      max={100}
                      step={1}
                      className="mt-2"
                    />
                    <span className="text-xs text-muted-foreground">{selectedElementData.opacity}%</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs">{t("templates.templateType")}</Label>
                <Select value={templateType} onValueChange={(v) => setTemplateType(v as "single_page" | "multi_page")}>
                  <SelectTrigger className="mt-1" data-testid="select-template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_page">
                      <div className="flex flex-col">
                        <span>{t("templates.singlePage")}</span>
                        <span className="text-xs text-muted-foreground">{t("templates.singlePageDesc")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="multi_page">
                      <div className="flex flex-col">
                        <span>{t("templates.multiPage")}</span>
                        <span className="text-xs text-muted-foreground">{t("templates.multiPageDesc")}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("editor.canvasSize")}</Label>
                <Select value={canvasSize} onValueChange={(v) => setCanvasSize(v as CanvasSizeKey)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CANVAS_SIZES).map(([key, { label, ratio }]) => (
                      <SelectItem key={key} value={key}>
                        {label} ({ratio})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("editor.backgroundColor")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-8 p-1"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              {showHeaderZone && (
                <div>
                  <Label className="text-xs">{t("editor.headerHeight")}</Label>
                  <Slider
                    value={[headerHeight]}
                    onValueChange={([v]) => setHeaderHeight(v)}
                    min={40}
                    max={200}
                    step={10}
                    className="mt-2"
                  />
                  <span className="text-xs text-muted-foreground">{headerHeight}px</span>
                </div>
              )}
              {showFooterZone && (
                <div>
                  <Label className="text-xs">{t("editor.footerHeight")}</Label>
                  <Slider
                    value={[footerHeight]}
                    onValueChange={([v]) => setFooterHeight(v)}
                    min={30}
                    max={150}
                    step={10}
                    className="mt-2"
                  />
                  <span className="text-xs text-muted-foreground">{footerHeight}px</span>
                </div>
              )}
              <Separator />
              <div className="text-sm text-muted-foreground">
                {t("editor.selectElementToEdit")}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("templates.saveTemplate")}</DialogTitle>
            <DialogDescription>{t("templates.enterTemplateName")}</DialogDescription>
          </DialogHeader>
          <Input
            value={tempTemplateName}
            onChange={(e) => setTempTemplateName(e.target.value)}
            placeholder={t("templates.templateName")}
            data-testid="input-save-template-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveDialogConfirm} data-testid="button-confirm-save">
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("editor.preview")}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4 bg-muted rounded-lg">
            <div
              className="bg-white shadow-lg"
              style={{
                width: `${CANVAS_SIZES[canvasSize].width * 0.4}px`,
                height: `${CANVAS_SIZES[canvasSize].height * 0.4}px`,
                backgroundColor,
                backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
              }}
            >
              {currentPageElements.map((element) => (
                <div
                  key={element.id}
                  className="absolute"
                  style={{
                    left: `${element.x * 0.4}px`,
                    top: `${element.y * 0.4}px`,
                    width: `${element.width * 0.4}px`,
                    height: `${element.height * 0.4}px`,
                    transform: `rotate(${element.rotation}deg)`,
                    opacity: element.opacity / 100,
                  }}
                >
                  {renderElement(element, true)}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
