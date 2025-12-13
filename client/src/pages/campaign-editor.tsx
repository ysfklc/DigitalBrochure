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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const productData = e.dataTransfer.getData("product");
    if (productData) {
      const product = JSON.parse(productData);
      toast({
        title: "Product Added",
        description: `${product.name} added to canvas`,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
            className="bg-white shadow-lg rounded-lg relative"
            style={{
              width: `${(595 * zoom) / 100}px`,
              height: `${(842 * zoom) / 100}px`,
              transform: `scale(1)`,
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            data-testid="canvas"
          >
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Move className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg">Drag products here to add them</p>
                <p className="text-sm mt-2">Page {currentPage} of {totalPages}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-80 border-l bg-background overflow-auto">
          <div className="p-4 border-b">
            <h2 className="font-medium">{t("editor.properties")}</h2>
          </div>
          
          {selectedElement ? (
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">{t("editor.position")}</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <Label className="text-xs">X</Label>
                    <Input type="number" defaultValue={0} data-testid="input-position-x" />
                  </div>
                  <div>
                    <Label className="text-xs">Y</Label>
                    <Input type="number" defaultValue={0} data-testid="input-position-y" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("editor.size")}</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input type="number" defaultValue={100} data-testid="input-size-width" />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input type="number" defaultValue={100} data-testid="input-size-height" />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("editor.rotation")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider defaultValue={[0]} max={360} step={1} data-testid="slider-rotation" />
                  <span className="text-sm w-12">0deg</span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("editor.opacity")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider defaultValue={[100]} max={100} step={1} data-testid="slider-opacity" />
                  <span className="text-sm w-12">100%</span>
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
            <div className="text-center text-muted-foreground py-4">
              <Layers className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm">No layers yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
