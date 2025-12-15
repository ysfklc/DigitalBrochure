import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  Upload,
  ZoomIn, 
  ZoomOut,
  Plus,
  Trash2,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  Image as ImageIcon,
  Package,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Move,
  Pencil,
  MousePointer,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  PanelTop,
  PanelBottom
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Campaign, Product, Template } from "@shared/schema";

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
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96];

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000', '#800000',
  '#000080', '#808080', '#C0C0C0', '#FFD700', '#FF69B4', '#4B0082',
];

interface CanvasElement {
  id: string;
  type: 'product' | 'text' | 'shape' | 'image' | 'header' | 'footer';
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

interface DrawElementData {
  points: DrawingPoint[];
  strokeColor: string;
  strokeWidth: number;
}

export default function CampaignEditorPage() {
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
  const [leftPanelTab, setLeftPanelTab] = useState("tools");
  const [searchQuery, setSearchQuery] = useState("");
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMovingElement, setIsMovingElement] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, elementX: 0, elementY: 0 });
  const [campaignName, setCampaignName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tempCampaignName, setTempCampaignName] = useState("");
  
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

  const { data: campaign, isLoading: loadingCampaign } = useQuery<Campaign>({
    queryKey: [`/api/campaigns/${id}`],
    enabled: !!id && id !== "new",
  });

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: externalProducts, isLoading: loadingExternalProducts } = useQuery<any[]>({
    queryKey: ["/api/products/search", searchQuery],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search products");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  // Fetch campaign products to place them on the canvas
  const { data: campaignProducts } = useQuery<any[]>({
    queryKey: ["/api/campaigns", id, "products"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/campaigns/${id}/products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch campaign products");
      return res.json();
    },
    enabled: !!id && id !== "new",
  });

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allProducts = [
    ...(filteredProducts || []),
    ...(externalProducts || []).map((p: any) => ({
      ...p,
      isExternal: true,
    })),
  ];

  const initialDataLoadedRef = useRef(false);
  
  useEffect(() => {
    // Only load initial data once when both campaign and campaignProducts are ready
    if (campaign && !initialDataLoadedRef.current) {
      setCampaignName(campaign.name);
      setSavedCampaignId(campaign.id);
      
      // Wait for campaignProducts to be loaded if id is not "new"
      if (id !== "new" && campaignProducts === undefined) {
        return; // Wait for products to load
      }
      
      initialDataLoadedRef.current = true;
      
      if (campaign.canvasData) {
        const data = campaign.canvasData as any;
        let elements = data.elements || [];
        
        // Merge campaign products as canvas elements if they're not already in the canvas
        if (campaignProducts && campaignProducts.length > 0) {
          const existingProductIds = new Set(
            elements.filter((el: any) => el.type === 'product').map((el: any) => el.data?.productId)
          );
          
          const productElements = campaignProducts
            .filter((cp: any) => !existingProductIds.has(cp.productId))
            .map((cp: any, index: number) => ({
              id: `campaign-product-${cp.id}`, // Use stable ID based on campaign product ID
              type: 'product' as const,
              x: cp.positionX || (50 + (index % 3) * 150),
              y: cp.positionY || (50 + Math.floor(index / 3) * 180),
              width: cp.width || 120,
              height: cp.height || 140,
              rotation: 0,
              opacity: 100,
              page: cp.pageNumber || 1,
              data: {
                productId: cp.productId,
                product: cp.product,
                campaignPrice: cp.campaignPrice,
                campaignDiscountPrice: cp.campaignDiscountPrice,
              },
            }));
          
          elements = [...elements, ...productElements];
        }
        
        setCanvasElements(elements);
        if (data.canvasSize) setCanvasSize(data.canvasSize);
        if (data.totalPages) setTotalPages(data.totalPages);
        if (data.headerHeight !== undefined) setHeaderHeight(data.headerHeight);
        if (data.footerHeight !== undefined) setFooterHeight(data.footerHeight);
        if (data.showHeaderZone !== undefined) setShowHeaderZone(data.showHeaderZone);
        if (data.showFooterZone !== undefined) setShowFooterZone(data.showFooterZone);
      } else if (campaignProducts && campaignProducts.length > 0) {
        // No canvas data but we have products - create product elements
        const productElements = campaignProducts.map((cp: any, index: number) => ({
          id: `campaign-product-${cp.id}`, // Use stable ID based on campaign product ID
          type: 'product' as const,
          x: cp.positionX || (50 + (index % 3) * 150),
          y: cp.positionY || (50 + Math.floor(index / 3) * 180),
          width: cp.width || 120,
          height: cp.height || 140,
          rotation: 0,
          opacity: 100,
          page: cp.pageNumber || 1,
          data: {
            productId: cp.productId,
            product: cp.product,
            campaignPrice: cp.campaignPrice,
            campaignDiscountPrice: cp.campaignDiscountPrice,
          },
        }));
        setCanvasElements(productElements);
      }
    }
  }, [campaign, campaignProducts, id]);

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/campaigns", data) as any;
    },
    onSuccess: (data) => {
      setSavedCampaignId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: t("common.success"),
        description: t("campaigns.savedSuccessfully"),
      });
      if (id === "new") {
        setLocation(`/campaigns/${data.id}/edit`);
      }
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("campaigns.saveFailed"),
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: string; data: any }) => {
      return await apiRequest("PATCH", `/api/campaigns/${campaignId}`, data) as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: t("common.success"),
        description: t("campaigns.savedSuccessfully"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("campaigns.saveFailed"),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!campaignName.trim()) {
      setTempCampaignName("");
      setShowSaveDialog(true);
      return;
    }
    performSave(campaignName);
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

    const campaignData = {
      name: name,
      canvasData,
      status: "draft" as const,
    };

    if (savedCampaignId || (id && id !== "new")) {
      updateCampaignMutation.mutate({
        campaignId: savedCampaignId || id!,
        data: campaignData,
      });
    } else {
      createCampaignMutation.mutate(campaignData);
    }
  };

  const handleSaveDialogConfirm = () => {
    if (!tempCampaignName.trim()) {
      toast({
        title: t("common.error"),
        description: t("campaigns.nameRequired"),
        variant: "destructive",
      });
      return;
    }
    setCampaignName(tempCampaignName.trim());
    setShowSaveDialog(false);
    performSave(tempCampaignName.trim());
  };

  const handlePreview = () => setShowPreview(true);
  const handleUndo = () => console.log("Undo");
  const handleRedo = () => console.log("Redo");
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 25));

  const handleAddPage = () => {
    setTotalPages((prev) => prev + 1);
    setCurrentPage(totalPages + 1);
  };

  const handleDeletePage = () => {
    if (totalPages > 1) {
      setTotalPages((prev) => prev - 1);
      if (currentPage > totalPages - 1) {
        setCurrentPage(totalPages - 1);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    e.dataTransfer.setData("product", JSON.stringify(product));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const productData = e.dataTransfer.getData("product");
    if (productData && canvasRef.current) {
      const product = JSON.parse(productData);
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (zoom / 100);
      const y = (e.clientY - rect.top) / (zoom / 100);
      
      const newElement: CanvasElement = {
        id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'product',
        x: Math.max(0, x - 60),
        y: Math.max(0, y - 60),
        width: 120,
        height: 140,
        rotation: 0,
        opacity: 100,
        data: product,
        page: currentPage,
      };
      
      setCanvasElements((prev) => [...prev, newElement]);
      setSelectedElement(newElement.id);
      setActiveTool('select');
      
      toast({
        title: t("common.success"),
        description: `${product.name} ${t("editor.addedToCanvas")}`,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

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
    const clickX = (e.clientX - rect.left) / (zoom / 100);
    const clickY = (e.clientY - rect.top) / (zoom / 100);
    
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
      const x = (e.clientX - rect.left) / (zoom / 100);
      const y = (e.clientY - rect.top) / (zoom / 100);
      setIsDrawing(true);
      setDrawingPoints([{ x, y }]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'draw' && isDrawing && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (zoom / 100);
      const y = (e.clientY - rect.top) / (zoom / 100);
      setDrawingPoints((prev) => [...prev, { x, y }]);
      return;
    }

    if (isResizing) {
      handleResizeMouseMove(e);
      return;
    }
    
    if (!isMovingElement || !selectedElement || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / (zoom / 100);
    const mouseY = (e.clientY - rect.top) / (zoom / 100);
    
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
      const mouseX = (e.clientX - rect.left) / (zoom / 100);
      const mouseY = (e.clientY - rect.top) / (zoom / 100);
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
    const mouseX = (e.clientX - rect.left) / (zoom / 100);
    const mouseY = (e.clientY - rect.top) / (zoom / 100);
    
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
    const mouseX = (e.clientX - rect.left) / (zoom / 100);
    const mouseY = (e.clientY - rect.top) / (zoom / 100);
    
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
    const scale = inPreview ? 0.4 : zoom / 100;
    
    if (element.type === 'product') {
      // Handle both structures: direct product data and nested product data
      const productData = element.data.product || element.data;
      const imageUrl = productData.imageUrl;
      const name = productData.name;
      const price = element.data.campaignPrice || productData.price;
      const discountPrice = element.data.campaignDiscountPrice || productData.discountPrice;
      
      return (
        <div className="w-full h-full bg-card border rounded-md overflow-hidden flex flex-col">
          <div className="flex-1 bg-muted flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <Package className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="p-1 text-center bg-background">
            <p className="text-xs font-medium truncate">{name}</p>
            <p className="text-xs text-primary font-bold">
              ${discountPrice || price}
            </p>
          </div>
        </div>
      );
    }
    
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

  if (loadingCampaign && id !== "new") {
    return (
      <div className="flex h-full">
        <Skeleton className="w-72 h-full" />
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
            onClick={() => setLocation("/campaigns")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="font-medium truncate max-w-[200px]" data-testid="text-campaign-name">
            {campaign?.name || t("campaigns.createCampaign")}
          </h1>
          <Badge variant="secondary">{campaign?.status || "draft"}</Badge>
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
          <Select value={canvasSize} onValueChange={(value: CanvasSizeKey) => setCanvasSize(value)}>
            <SelectTrigger className="w-[160px]" data-testid="select-canvas-size">
              <SelectValue placeholder={t("editor.canvasSize")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CANVAS_SIZES).map(([key, size]) => (
                <SelectItem key={key} value={key} data-testid={`option-${key}`}>
                  {size.label} ({size.ratio})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant="outline" onClick={handlePreview} data-testid="button-preview">
            <Eye className="h-4 w-4 mr-2" />
            {t("editor.preview")}
          </Button>
          <Button onClick={handleSave} data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            {t("editor.save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-14 border-r bg-muted/30 flex flex-col items-center py-2 gap-1">
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
                  variant={activeShapeType === 'rectangle' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start"
                  onClick={() => { setActiveShapeType('rectangle'); setActiveTool('shape'); }}
                  data-testid="shape-rectangle"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {t("editor.rectangle")}
                </Button>
                <Button
                  variant={activeShapeType === 'circle' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start"
                  onClick={() => { setActiveShapeType('circle'); setActiveTool('shape'); }}
                  data-testid="shape-circle"
                >
                  <Circle className="h-4 w-4 mr-2" />
                  {t("editor.circle")}
                </Button>
                <Button
                  variant={activeShapeType === 'triangle' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start"
                  onClick={() => { setActiveShapeType('triangle'); setActiveTool('shape'); }}
                  data-testid="shape-triangle"
                >
                  <Triangle className="h-4 w-4 mr-2" />
                  {t("editor.triangle")}
                </Button>
                <Button
                  variant={activeShapeType === 'line' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start"
                  onClick={() => { setActiveShapeType('line'); setActiveTool('shape'); }}
                  data-testid="shape-line"
                >
                  <Minus className="h-4 w-4 mr-2" />
                  {t("editor.line")}
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
                variant={showHeaderZone ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setShowHeaderZone(!showHeaderZone)}
                data-testid="toggle-header"
              >
                <PanelTop className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("editor.toggleHeader")}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showFooterZone ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setShowFooterZone(!showFooterZone)}
                data-testid="toggle-footer"
              >
                <PanelBottom className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("editor.toggleFooter")}</TooltipContent>
          </Tooltip>
        </div>

        <div className="w-64 border-r flex flex-col bg-background">
          <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="flex flex-col h-full">
            <TabsList className="m-2 grid grid-cols-3">
              <TabsTrigger value="tools" data-testid="tab-tools">
                <Palette className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">
                <Package className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="pages" data-testid="tab-pages">
                <Layers className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tools" className="flex-1 m-0 overflow-auto">
              <ScrollArea className="h-[calc(100vh-160px)]">
                <div className="p-3 space-y-4">
                  {activeTool === 'text' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase">{t("editor.textOptions")}</p>
                      <div>
                        <Label className="text-xs">{t("editor.textColor")}</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded border-2 ${textColor === color ? 'border-primary' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setTextColor(color)}
                              data-testid={`text-color-${color}`}
                            />
                          ))}
                        </div>
                        <Input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="mt-2 h-8 w-full"
                          data-testid="input-text-color"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{t("editor.clickCanvasToAddText")}</p>
                    </div>
                  )}

                  {activeTool === 'shape' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase">{t("editor.shapeOptions")}</p>
                      <div>
                        <Label className="text-xs">{t("editor.fillColor")}</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded border-2 ${shapeFillColor === color ? 'border-primary' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setShapeFillColor(color)}
                              data-testid={`fill-color-${color}`}
                            />
                          ))}
                        </div>
                        <Input
                          type="color"
                          value={shapeFillColor}
                          onChange={(e) => setShapeFillColor(e.target.value)}
                          className="mt-2 h-8 w-full"
                          data-testid="input-fill-color"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t("editor.strokeColor")}</Label>
                        <Input
                          type="color"
                          value={shapeStrokeColor}
                          onChange={(e) => setShapeStrokeColor(e.target.value)}
                          className="h-8 w-full"
                          data-testid="input-stroke-color"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{t("editor.clickCanvasToAddShape")}</p>
                    </div>
                  )}

                  {activeTool === 'draw' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase">{t("editor.drawOptions")}</p>
                      <div>
                        <Label className="text-xs">{t("editor.brushColor")}</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded border-2 ${drawColor === color ? 'border-primary' : 'border-transparent'}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setDrawColor(color)}
                              data-testid={`draw-color-${color}`}
                            />
                          ))}
                        </div>
                        <Input
                          type="color"
                          value={drawColor}
                          onChange={(e) => setDrawColor(e.target.value)}
                          className="mt-2 h-8 w-full"
                          data-testid="input-draw-color"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t("editor.brushSize")}: {drawStrokeWidth}px</Label>
                        <Slider
                          value={[drawStrokeWidth]}
                          onValueChange={(v) => setDrawStrokeWidth(v[0])}
                          min={1}
                          max={20}
                          step={1}
                          className="mt-1"
                          data-testid="slider-brush-size"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">{t("editor.dragToDraw")}</p>
                    </div>
                  )}

                  {activeTool === 'select' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase">{t("editor.selectMode")}</p>
                      <p className="text-sm text-muted-foreground">{t("editor.selectModeHelp")}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{t("editor.headerFooter")}</p>
                    {showHeaderZone && (
                      <div>
                        <Label className="text-xs">{t("editor.headerHeight")}: {headerHeight}px</Label>
                        <Slider
                          value={[headerHeight]}
                          onValueChange={(v) => setHeaderHeight(v[0])}
                          min={40}
                          max={200}
                          step={10}
                          className="mt-1"
                          data-testid="slider-header-height"
                        />
                      </div>
                    )}
                    {showFooterZone && (
                      <div>
                        <Label className="text-xs">{t("editor.footerHeight")}: {footerHeight}px</Label>
                        <Slider
                          value={[footerHeight]}
                          onValueChange={(v) => setFooterHeight(v[0])}
                          min={30}
                          max={150}
                          step={10}
                          className="mt-1"
                          data-testid="slider-footer-height"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="products" className="flex-1 m-0 overflow-hidden">
              <div className="p-2">
                <Input
                  placeholder={t("products.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-products"
                />
              </div>
              <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
                <div className="p-2 space-y-2">
                  {loadingProducts || loadingExternalProducts ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))
                  ) : allProducts?.length ? (
                    allProducts.map((product: any) => (
                      <div
                        key={product.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, product)}
                        className="flex items-center gap-2 p-2 rounded-md border bg-card cursor-grab hover-elevate active-elevate-2"
                        data-testid={`product-drag-${product.id}`}
                      >
                        <div className="flex items-center justify-center w-10 h-10 bg-muted rounded flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">${product.price}</p>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Package className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">{t("products.noProducts")}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pages" className="flex-1 m-0">
              <div className="p-2 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t("editor.pages")}</p>
                  <Button size="sm" variant="outline" onClick={handleAddPage} data-testid="button-add-page">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("editor.addPage")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-md border cursor-pointer hover-elevate ${
                        currentPage === i + 1 ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setCurrentPage(i + 1)}
                      data-testid={`page-${i + 1}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("editor.page")} {i + 1}</span>
                        {totalPages > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage();
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 bg-muted/50 overflow-auto flex items-center justify-center p-8">
          <div
            ref={canvasRef}
            className={`bg-white shadow-lg rounded-lg relative ${isDragging ? 'ring-2 ring-primary ring-offset-2' : ''} ${isMovingElement ? 'cursor-grabbing' : ''} ${activeTool === 'draw' ? 'cursor-crosshair' : ''} ${activeTool === 'text' ? 'cursor-text' : ''}`}
            style={{
              width: `${scaledCanvasWidth}px`,
              height: `${scaledCanvasHeight}px`,
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
            data-testid="canvas"
          >
            {showHeaderZone && (
              <div
                className="absolute left-0 right-0 top-0 bg-blue-50/50 border-b-2 border-dashed border-blue-300 flex items-center justify-center"
                style={{ height: `${scaledHeaderHeight}px` }}
                data-testid="header-zone"
              >
                <span className="text-xs text-blue-400 font-medium">{t("editor.headerZone")}</span>
              </div>
            )}
            
            {showFooterZone && (
              <div
                className="absolute left-0 right-0 bottom-0 bg-green-50/50 border-t-2 border-dashed border-green-300 flex items-center justify-center"
                style={{ height: `${scaledFooterHeight}px` }}
                data-testid="footer-zone"
              >
                <span className="text-xs text-green-400 font-medium">{t("editor.footerZone")}</span>
              </div>
            )}

            {currentPageElements.length === 0 && !isDrawing ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                <div className="text-center">
                  <Move className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg">{t("editor.canvasEmpty")}</p>
                  <p className="text-sm mt-2">{t("editor.page")} {currentPage} / {totalPages}</p>
                </div>
              </div>
            ) : null}
            
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
                    const x = (point.x * zoom) / 100 * 0.5;
                    const y = (point.y * zoom) / 100 * 0.5;
                    if (i === 0) return `M ${x} ${y}`;
                    return `${acc} L ${x} ${y}`;
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

        <div className="w-80 border-l bg-background overflow-auto">
          <div className="p-4 border-b flex items-center justify-between gap-2">
            <h2 className="font-medium">{t("editor.properties")}</h2>
            {selectedElementData && (
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
                {selectedElementData.type === 'product' && (
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-sm font-medium">{selectedElementData.data.name}</p>
                    <p className="text-xs text-muted-foreground">${selectedElementData.data.price}</p>
                  </div>
                )}

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
                        variant={selectedElementData.data.fontWeight === 'bold' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => updateElementData('fontWeight', selectedElementData.data.fontWeight === 'bold' ? 'normal' : 'bold')}
                        data-testid="button-bold"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedElementData.data.fontStyle === 'italic' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => updateElementData('fontStyle', selectedElementData.data.fontStyle === 'italic' ? 'normal' : 'italic')}
                        data-testid="button-italic"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedElementData.data.textDecoration === 'underline' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => updateElementData('textDecoration', selectedElementData.data.textDecoration === 'underline' ? 'none' : 'underline')}
                        data-testid="button-underline"
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6 mx-1" />
                      <Button
                        variant={selectedElementData.data.textAlign === 'left' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => updateElementData('textAlign', 'left')}
                        data-testid="button-align-left"
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedElementData.data.textAlign === 'center' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => updateElementData('textAlign', 'center')}
                        data-testid="button-align-center"
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={selectedElementData.data.textAlign === 'right' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => updateElementData('textAlign', 'right')}
                        data-testid="button-align-right"
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
                          className="h-8 w-12"
                          data-testid="input-element-text-color"
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
                          className="h-8 w-12"
                          data-testid="input-element-bg-color"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateElementData('backgroundColor', 'transparent')}
                        >
                          {t("editor.transparent")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedElementData.type === 'shape' && (
                  <div className="space-y-3">
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-sm font-medium capitalize">{selectedElementData.data.shapeType}</p>
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.fillColor")}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="color"
                          value={selectedElementData.data.fill === 'transparent' ? '#ffffff' : selectedElementData.data.fill}
                          onChange={(e) => updateElementData('fill', e.target.value)}
                          className="h-8 w-12"
                          data-testid="input-shape-fill"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateElementData('fill', 'transparent')}
                        >
                          {t("editor.transparent")}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.strokeColor")}</Label>
                      <Input
                        type="color"
                        value={selectedElementData.data.stroke}
                        onChange={(e) => updateElementData('stroke', e.target.value)}
                        className="h-8 w-full mt-1"
                        data-testid="input-shape-stroke"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.strokeWidth")}: {selectedElementData.data.strokeWidth}px</Label>
                      <Slider
                        value={[selectedElementData.data.strokeWidth]}
                        onValueChange={(v) => updateElementData('strokeWidth', v[0])}
                        min={0}
                        max={10}
                        step={1}
                        className="mt-1"
                        data-testid="slider-stroke-width"
                      />
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">{t("editor.position")}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <Label className="text-xs">X</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedElementData.x)}
                        onChange={(e) => updateElementProperty('x', Number(e.target.value))}
                        data-testid="input-position-x"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Y</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedElementData.y)}
                        onChange={(e) => updateElementProperty('y', Number(e.target.value))}
                        data-testid="input-position-y"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("editor.size")}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <Label className="text-xs">{t("editor.width")}</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedElementData.width)}
                        onChange={(e) => updateElementProperty('width', Number(e.target.value))}
                        data-testid="input-size-width"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t("editor.height")}</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedElementData.height)}
                        onChange={(e) => updateElementProperty('height', Number(e.target.value))}
                        data-testid="input-size-height"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("editor.rotation")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[selectedElementData.rotation]}
                      onValueChange={(v) => updateElementProperty('rotation', v[0])}
                      max={360}
                      step={1}
                      data-testid="slider-rotation"
                    />
                    <span className="text-sm w-12">{selectedElementData.rotation}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("editor.opacity")}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[selectedElementData.opacity]}
                      onValueChange={(v) => updateElementProperty('opacity', v[0])}
                      max={100}
                      step={1}
                      data-testid="slider-opacity"
                    />
                    <span className="text-sm w-12">{selectedElementData.opacity}%</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{t("editor.selectElementHelp")}</p>
            </div>
          )}

          <Separator />

          <div className="p-4">
            <h3 className="font-medium mb-3">{t("editor.layers")}</h3>
            {currentPageElements.length > 0 ? (
              <div className="space-y-1">
                {currentPageElements.map((element, index) => (
                  <div
                    key={element.id}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate ${
                      selectedElement === element.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => { setSelectedElement(element.id); setActiveTool('select'); }}
                    data-testid={`layer-${element.id}`}
                  >
                    {element.type === 'product' && <Package className="h-4 w-4 text-muted-foreground" />}
                    {element.type === 'text' && <Type className="h-4 w-4 text-muted-foreground" />}
                    {element.type === 'shape' && <Square className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm flex-1 truncate">
                      {element.type === 'product' ? element.data.name : 
                       element.type === 'text' ? element.data.text.substring(0, 20) :
                       element.data.shapeType}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <Layers className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">{t("editor.noLayers")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("editor.preview")}: {campaignName || t("campaigns.untitled")}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div
              className="bg-white shadow-lg rounded-lg relative"
              style={{
                width: `${CANVAS_SIZES[canvasSize].width * 0.4}px`,
                height: `${CANVAS_SIZES[canvasSize].height * 0.4}px`,
              }}
            >
              {showHeaderZone && (
                <div
                  className="absolute left-0 right-0 top-0 bg-blue-50/30"
                  style={{ height: `${headerHeight * 0.4}px` }}
                />
              )}
              {showFooterZone && (
                <div
                  className="absolute left-0 right-0 bottom-0 bg-green-50/30"
                  style={{ height: `${footerHeight * 0.4}px` }}
                />
              )}
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
              {currentPageElements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">{t("editor.emptyCanvas")}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <Button
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("campaigns.saveCampaign")}</DialogTitle>
            <DialogDescription>
              {t("campaigns.enterCampaignName")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="campaign-name">{t("campaigns.campaignName")}</Label>
            <Input
              id="campaign-name"
              value={tempCampaignName}
              onChange={(e) => setTempCampaignName(e.target.value)}
              placeholder={t("campaigns.enterName")}
              className="mt-2"
              data-testid="input-campaign-name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveDialogConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} data-testid="button-cancel-save">
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveDialogConfirm} data-testid="button-confirm-save">
              <Save className="h-4 w-4 mr-2" />
              {t("editor.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
