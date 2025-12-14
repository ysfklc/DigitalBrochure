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
  Image as ImageIcon,
  Package,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Move
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
import { useToast } from "@/hooks/use-toast";
import type { Campaign, Product, Template } from "@shared/schema";

interface CanvasElement {
  id: string;
  type: 'product' | 'text' | 'shape' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  data: any;
  page: number;
}

export default function CampaignEditorPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [leftPanelTab, setLeftPanelTab] = useState("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMovingElement, setIsMovingElement] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, elementX: 0, elementY: 0 });

  const { data: campaign, isLoading: loadingCampaign } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", id],
    enabled: !!id && id !== "new",
  });

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: externalProducts, isLoading: loadingExternalProducts, refetch: refetchExternal } = useQuery<any[]>({
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

  const handleSave = () => {
    toast({
      title: t("common.success"),
      description: "Campaign saved successfully.",
    });
  };

  const handleUndo = () => {
    console.log("Undo");
  };

  const handleRedo = () => {
    console.log("Redo");
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 25));
  };

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
      
      toast({
        title: t("common.success"),
        description: `${product.name} added to canvas`,
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

  const handleElementMouseDown = (elementId: string, e: React.MouseEvent) => {
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

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
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
    setIsMovingElement(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const handleCanvasMouseLeave = () => {
    setIsMovingElement(false);
    setIsResizing(false);
    setResizeHandle(null);
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
    
    const minSize = 40;
    
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

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isMovingElement) {
      setSelectedElement(null);
    }
  };

  const handleDeleteElement = () => {
    if (selectedElement) {
      setCanvasElements((prev) => prev.filter((el) => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  const updateElementProperty = (property: keyof CanvasElement, value: number) => {
    if (selectedElement) {
      setCanvasElements((prev) =>
        prev.map((el) =>
          el.id === selectedElement ? { ...el, [property]: value } : el
        )
      );
    }
  };

  const currentPageElements = canvasElements.filter((el) => el.page === currentPage);
  const selectedElementData = canvasElements.find((el) => el.id === selectedElement);

  if (loadingCampaign && id !== "new") {
    return (
      <div className="flex h-full">
        <Skeleton className="w-72 h-full" />
        <Skeleton className="flex-1 h-full" />
        <Skeleton className="w-80 h-full" />
      </div>
    );
  }

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
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} data-testid="button-zoom-in">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant="outline" data-testid="button-preview">
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
        <div className="w-72 border-r flex flex-col bg-background">
          <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="flex flex-col h-full">
            <TabsList className="m-2 grid grid-cols-3">
              <TabsTrigger value="products" data-testid="tab-products">
                <Package className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="elements" data-testid="tab-elements">
                <Layers className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="pages" data-testid="tab-pages">
                <Settings className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

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
                      <Skeleton key={i} className="h-20 w-full" />
                    ))
                  ) : allProducts?.length ? (
                    allProducts.map((product: any) => (
                      <div
                        key={product.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, product)}
                        className="flex items-center gap-3 p-2 rounded-md border bg-card cursor-grab hover-elevate active-elevate-2"
                        data-testid={`product-drag-${product.id}`}
                      >
                        <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-md flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            {product.isExternal && (
                              <Badge variant="outline" className="text-xs px-1 py-0">{t("products.external")}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">${product.price}</p>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
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

            <TabsContent value="elements" className="flex-1 m-0">
              <div className="p-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase px-2">
                  Add Elements
                </p>
                <Button variant="outline" className="w-full justify-start" data-testid="button-add-text">
                  <Type className="h-4 w-4 mr-2" />
                  {t("editor.addText")}
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-add-shape">
                  <Square className="h-4 w-4 mr-2" />
                  {t("editor.addShape")}
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-add-image">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {t("editor.addImage")}
                </Button>
              </div>
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
                        <span className="text-sm">Page {i + 1}</span>
                        {totalPages > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
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
            className={`bg-white shadow-lg rounded-lg relative ${isDragging ? 'ring-2 ring-primary ring-offset-2' : ''} ${isMovingElement ? 'cursor-grabbing' : ''}`}
            style={{
              width: `${(595 * zoom) / 100}px`,
              height: `${(842 * zoom) / 100}px`,
              transform: `scale(1)`,
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
            data-testid="canvas"
          >
            {currentPageElements.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                <div className="text-center">
                  <Move className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg">Drag products here to add them</p>
                  <p className="text-sm mt-2">Page {currentPage} of {totalPages}</p>
                </div>
              </div>
            ) : null}
            
            {currentPageElements.map((element) => (
              <div
                key={element.id}
                className={`absolute transition-shadow select-none ${
                  selectedElement === element.id
                    ? 'ring-2 ring-primary shadow-lg cursor-grab'
                    : 'hover:ring-1 hover:ring-primary/50 cursor-pointer'
                } ${isMovingElement && selectedElement === element.id ? 'cursor-grabbing' : ''}`}
                style={{
                  left: `${(element.x * zoom) / 100}px`,
                  top: `${(element.y * zoom) / 100}px`,
                  width: `${(element.width * zoom) / 100}px`,
                  height: `${(element.height * zoom) / 100}px`,
                  transform: `rotate(${element.rotation}deg)`,
                  opacity: element.opacity / 100,
                }}
                onMouseDown={(e) => handleElementMouseDown(element.id, e)}
                data-testid={`canvas-element-${element.id}`}
              >
                {element.type === 'product' && (
                  <div className="w-full h-full bg-card border rounded-md overflow-hidden flex flex-col">
                    <div className="flex-1 bg-muted flex items-center justify-center overflow-hidden">
                      {element.data.imageUrl ? (
                        <img
                          src={element.data.imageUrl}
                          alt={element.data.name}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-1 text-center bg-background">
                      <p className="text-xs font-medium truncate">{element.data.name}</p>
                      <p className="text-xs text-primary font-bold">
                        ${element.data.discountPrice || element.data.price}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedElement === element.id && (
                  <>
                    <div
                      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm cursor-nw-resize"
                      style={{ top: -6, left: -6 }}
                      onMouseDown={(e) => handleResizeMouseDown('nw', e)}
                      data-testid="resize-nw"
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm cursor-ne-resize"
                      style={{ top: -6, right: -6 }}
                      onMouseDown={(e) => handleResizeMouseDown('ne', e)}
                      data-testid="resize-ne"
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm cursor-sw-resize"
                      style={{ bottom: -6, left: -6 }}
                      onMouseDown={(e) => handleResizeMouseDown('sw', e)}
                      data-testid="resize-sw"
                    />
                    <div
                      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm cursor-se-resize"
                      style={{ bottom: -6, right: -6 }}
                      onMouseDown={(e) => handleResizeMouseDown('se', e)}
                      data-testid="resize-se"
                    />
                  </>
                )}
              </div>
            ))}
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
            <div className="p-4 space-y-4">
              {selectedElementData.type === 'product' && (
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-sm font-medium">{selectedElementData.data.name}</p>
                  <p className="text-xs text-muted-foreground">${selectedElementData.data.price}</p>
                </div>
              )}
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
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElementData.width)}
                      onChange={(e) => updateElementProperty('width', Number(e.target.value))}
                      data-testid="input-size-width"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
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
                  <span className="text-sm w-12">{selectedElementData.rotation}°</span>
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
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Select an element to edit its properties</p>
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
                    onClick={() => setSelectedElement(element.id)}
                    data-testid={`layer-${element.id}`}
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">
                      {element.type === 'product' ? element.data.name : `Element ${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <Layers className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">No layers yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
