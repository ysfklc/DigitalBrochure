import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Files,
  Calendar,
  Package,
  Check,
  Search,
  Tag,
  Globe,
  Database,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Template, Product, PriceTagTemplate } from "@shared/schema";

interface ConnectorProduct {
  id: string;
  name: string;
  price?: string | number;
  discountPrice?: string | number;
  imageUrl?: string;
  sku?: string;
  description?: string;
  connectorId?: string;
  connectorName?: string;
}

interface SelectedProduct {
  productId: string;
  product: Product;
  campaignPrice: string;
  campaignDiscountPrice: string;
  priceTagTemplateId: string | null;
  isExternal?: boolean;
  editableName: string;
  currency: string;
  unit: string;
}

const STEPS = [
  { id: 1, key: "type", icon: FileText },
  { id: 2, key: "template", icon: Files },
  { id: 3, key: "dates", icon: Calendar },
  { id: 4, key: "products", icon: Package },
  { id: 5, key: "confirm", icon: Check },
];

export default function CampaignWizardPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState<"single_page" | "multi_page" | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectorSearchQuery, setConnectorSearchQuery] = useState("");
  const [debouncedConnectorSearch, setDebouncedConnectorSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSourceTab, setProductSourceTab] = useState<"existing" | "connector">("existing");
  const [productsPerPage, setProductsPerPage] = useState<number | null>(null);
  const [loadingStage, setLoadingStage] = useState<"idle" | "creating" | "products" | "images" | "finalizing">("idle");

  // Canvas dimensions and layout configuration
  const CANVAS_WIDTH = 595; // A4 width
  const CANVAS_HEIGHT = 842; // A4 height
  const DEFAULT_HEADER_HEIGHT = 80;
  const DEFAULT_FOOTER_HEIGHT = 60;

  const removeSelectedProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((sp) => sp.productId !== productId));
  };

  // Get grid configuration for 1-8 products (columns x rows)
  const getGridConfig = (count: number): { cols: number; rows: number } => {
    switch (count) {
      case 1: return { cols: 1, rows: 1 };
      case 2: return { cols: 2, rows: 1 };
      case 3: return { cols: 3, rows: 1 };
      case 4: return { cols: 2, rows: 2 };
      case 5: return { cols: 3, rows: 2 }; // 3 top, 2 bottom
      case 6: return { cols: 3, rows: 2 };
      case 7: return { cols: 4, rows: 2 }; // 4 top, 3 bottom
      case 8: return { cols: 4, rows: 2 };
      default: return { cols: 2, rows: 2 };
    }
  };

  // Get special layout for odd product counts (5, 7)
  const getSpecialLayout = (count: number): { row: number; colsInRow: number }[] | null => {
    if (count === 5) {
      // 3 on top row, 2 on bottom row (centered)
      return [
        { row: 0, colsInRow: 3 },
        { row: 0, colsInRow: 3 },
        { row: 0, colsInRow: 3 },
        { row: 1, colsInRow: 2 },
        { row: 1, colsInRow: 2 },
      ];
    }
    if (count === 7) {
      // 4 on top row, 3 on bottom row (centered)
      return [
        { row: 0, colsInRow: 4 },
        { row: 0, colsInRow: 4 },
        { row: 0, colsInRow: 4 },
        { row: 0, colsInRow: 4 },
        { row: 1, colsInRow: 3 },
        { row: 1, colsInRow: 3 },
        { row: 1, colsInRow: 3 },
      ];
    }
    return null;
  };

  // Canvas size configurations matching campaign-editor
  const CANVAS_SIZES: Record<string, { width: number; height: number }> = {
    a4portrait: { width: 794, height: 1123 },
    a4landscape: { width: 1123, height: 794 },
    a5portrait: { width: 559, height: 794 },
    a5landscape: { width: 794, height: 559 },
    letterportrait: { width: 816, height: 1056 },
    letterlandscape: { width: 1056, height: 816 },
    instagrampost: { width: 1080, height: 1080 },
    instagramstory: { width: 1080, height: 1920 },
    facebookpost: { width: 1200, height: 630 },
  };

  // Get selected template's header/footer heights and canvas dimensions
  const getTemplateConfig = () => {
    const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
    const config = selectedTemplate?.coverPageConfig as any;
    const canvasSizeKey = config?.canvasSize || 'a4portrait';
    const canvasDimensions = CANVAS_SIZES[canvasSizeKey] || { width: 794, height: 1123 };
    
    return {
      headerHeight: config?.headerHeight ?? DEFAULT_HEADER_HEIGHT,
      footerHeight: config?.footerHeight ?? DEFAULT_FOOTER_HEIGHT,
      canvasWidth: canvasDimensions.width,
      canvasHeight: canvasDimensions.height,
      canvasSize: canvasSizeKey,
    };
  };

  // Calculate optimal product size based on grid and available area
  const calculateOptimalProductSize = (
    productsPerPage: number,
    contentWidth: number,
    contentHeight: number
  ): { width: number; height: number } => {
    const margin = 30; // Margin from edges
    const gap = 20; // Gap between products
    const grid = getGridConfig(productsPerPage);
    
    const availableWidth = contentWidth - margin * 2;
    const availableHeight = contentHeight - margin * 2;
    
    // Calculate max size that fits in grid cells
    const maxCellWidth = (availableWidth - gap * (grid.cols - 1)) / grid.cols;
    const maxCellHeight = (availableHeight - gap * (grid.rows - 1)) / grid.rows;
    
    // Use 4:5 aspect ratio (width:height)
    const aspectRatio = 4 / 5;
    
    // Calculate size that fits within cell while maintaining aspect ratio
    let productWidth: number;
    let productHeight: number;
    
    if (maxCellWidth / maxCellHeight < aspectRatio) {
      // Width constrained
      productWidth = maxCellWidth * 0.9; // Use 90% of cell for visual breathing room
      productHeight = productWidth / aspectRatio;
    } else {
      // Height constrained
      productHeight = maxCellHeight * 0.9;
      productWidth = productHeight * aspectRatio;
    }
    
    // Ensure minimum readable size
    const minWidth = 120;
    const minHeight = 150;
    productWidth = Math.max(minWidth, productWidth);
    productHeight = Math.max(minHeight, productHeight);
    
    return { width: Math.round(productWidth), height: Math.round(productHeight) };
  };

  // Calculate all product positions for all pages with proper centering
  const calculateAllProductPositions = (
    totalProducts: number,
    perPage: number
  ): { x: number; y: number; width: number; height: number; page: number }[] => {
    const templateConfig = getTemplateConfig();
    const contentTop = templateConfig.headerHeight;
    const contentBottom = templateConfig.canvasHeight - templateConfig.footerHeight;
    const contentHeight = contentBottom - contentTop;
    const contentWidth = templateConfig.canvasWidth;
    const margin = 30;
    const gap = 20;
    
    const positions: { x: number; y: number; width: number; height: number; page: number }[] = [];
    const totalPages = Math.ceil(totalProducts / perPage);
    
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const startIdx = pageIdx * perPage;
      const endIdx = Math.min(startIdx + perPage, totalProducts);
      const productsOnThisPage = endIdx - startIdx;
      
      if (productsOnThisPage === 0) continue;
      
      const productSize = calculateOptimalProductSize(productsOnThisPage, contentWidth, contentHeight);
      const grid = getGridConfig(productsOnThisPage);
      const specialLayout = getSpecialLayout(productsOnThisPage);
      
      // Available content area
      const availableWidth = contentWidth - margin * 2;
      const availableHeight = contentHeight - margin * 2;
      
      // Calculate row height for vertical centering
      const totalRowHeight = grid.rows * productSize.height + (grid.rows - 1) * gap;
      const startY = contentTop + margin + (availableHeight - totalRowHeight) / 2;
      
      let productIndex = 0;
      for (let row = 0; row < grid.rows && productIndex < productsOnThisPage; row++) {
        // Determine how many products in this row
        let colsInThisRow: number;
        if (specialLayout) {
          // Count products in this row from special layout
          colsInThisRow = specialLayout.filter((item, idx) => idx < productsOnThisPage && item.row === row).length;
        } else {
          // Standard grid
          colsInThisRow = Math.min(grid.cols, productsOnThisPage - productIndex);
        }
        
        // Calculate total width of products in this row for centering
        const rowWidth = colsInThisRow * productSize.width + (colsInThisRow - 1) * gap;
        const startX = margin + (availableWidth - rowWidth) / 2;
        
        for (let col = 0; col < colsInThisRow && productIndex < productsOnThisPage; col++) {
          const x = startX + col * (productSize.width + gap);
          const y = startY + row * (productSize.height + gap);
          
          positions.push({
            x: Math.round(x),
            y: Math.round(y),
            width: productSize.width,
            height: productSize.height,
            page: pageIdx + 1,
          });
          productIndex++;
        }
      }
    }
    
    return positions;
  };

  // Debounce connector search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConnectorSearch(connectorSearchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [connectorSearchQuery]);

  const { data: templates, isLoading: loadingTemplates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: priceTagTemplates, isLoading: loadingPriceTags } = useQuery<PriceTagTemplate[]>({
    queryKey: ["/api/price-tag-templates"],
  });

  // Connector products search
  const { data: connectorProducts, isLoading: loadingConnectorProducts, isFetching: fetchingConnectorProducts } = useQuery<ConnectorProduct[]>({
    queryKey: ["/api/products/search", debouncedConnectorSearch],
    queryFn: async () => {
      if (!debouncedConnectorSearch.trim()) return [];
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(debouncedConnectorSearch)}`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search products");
      return res.json();
    },
    enabled: debouncedConnectorSearch.length >= 2,
  });

  const filteredTemplates = templates?.filter(
    (template) => campaignType && template.type === campaignType
  );

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      setLoadingStage("creating");
      return await apiRequest("POST", "/api/campaigns", data) as any;
    },
    onSuccess: async (campaign) => {
      if (selectedProducts.length > 0 && productsPerPage) {
        setLoadingStage("products");
        // Calculate positions for all products across all pages
        const allPositions = calculateAllProductPositions(selectedProducts.length, productsPerPage);
        
        await apiRequest("PUT", `/api/campaigns/${campaign.id}/products`, {
          products: selectedProducts.map((sp, index) => {
            const pos = allPositions[index] || {
              x: 50 + (index % 3) * 150,
              y: 100 + Math.floor(index / 3) * 180,
              width: 120,
              height: 160,
              page: Math.floor(index / (productsPerPage || 4)) + 1,
            };
            return {
              productId: sp.productId,
              campaignPrice: sp.campaignPrice || null,
              campaignDiscountPrice: sp.campaignDiscountPrice || null,
              priceTagTemplateId: sp.priceTagTemplateId || null,
              pageNumber: pos.page,
              positionX: Math.round(pos.x),
              positionY: Math.round(pos.y),
              width: pos.width,
              height: pos.height,
              isExternal: sp.isExternal || false,
              externalProductData: sp.isExternal ? {
                name: sp.product.name,
                description: sp.product.description,
                barcode: (sp.product as any).barcode || null,
                sku: sp.product.sku,
                category: sp.product.category,
                price: sp.product.price,
                discountPrice: sp.product.discountPrice,
                currency: (sp.product as any).currency || "TRY",
                imageUrl: sp.product.imageUrl,
                unit: (sp.product as any).unit || null,
              } : undefined,
            };
          }),
        });
        
        // Remove backgrounds from product images and create canvas elements
        setLoadingStage("images");
        const token = localStorage.getItem("authToken");
        const canvasElements = [];
        
        for (let index = 0; index < selectedProducts.length; index++) {
          const sp = selectedProducts[index];
          const pos = allPositions[index] || {
            x: 50 + (index % 3) * 150,
            y: 100 + Math.floor(index / 3) * 180,
            width: 200,
            height: 240,
            page: Math.floor(index / (productsPerPage || 4)) + 1,
          };
          
          let finalImageUrl = sp.product.imageUrl;
          
          // Try to remove background from the product image
          if (sp.product.imageUrl) {
            try {
              const bgRes = await fetch("/api/image-processing/remove-background", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ imageUrl: sp.product.imageUrl }),
              });
              
              if (bgRes.ok) {
                const bgData = await bgRes.json();
                if (bgData.url) {
                  finalImageUrl = bgData.url;
                }
              }
            } catch (err) {
              console.error("Background removal failed for product:", sp.product.name, err);
            }
          }
          
          // Create canvas element for this product
          canvasElements.push({
            id: `campaign-product-${sp.productId}-${Date.now()}-${index}`,
            type: "product",
            x: pos.x,
            y: pos.y,
            width: pos.width,
            height: pos.height,
            rotation: 0,
            opacity: 100,
            page: pos.page,
            data: {
              productId: sp.productId,
              product: {
                ...sp.product,
                imageUrl: finalImageUrl,
              },
              campaignPrice: sp.campaignPrice || sp.product.price?.toString() || "",
              campaignDiscountPrice: sp.campaignDiscountPrice || null,
            },
          });
        }
        
        // Update campaign with canvas elements
        setLoadingStage("finalizing");
        if (canvasElements.length > 0) {
          const existingCampaign = await apiRequest("GET", `/api/campaigns/${campaign.id}`) as any;
          const existingCanvasData = existingCampaign?.canvasData || {};
          
          // Preserve existing date and template elements, add product elements
          const existingDateElements = (existingCanvasData.elements || []).filter((el: any) => el.type === 'date');
          const mergedElements = [...existingDateElements, ...canvasElements];
          
          await apiRequest("PATCH", `/api/campaigns/${campaign.id}`, {
            canvasData: {
              ...existingCanvasData,
              elements: mergedElements,
              totalPages: Math.ceil(selectedProducts.length / (productsPerPage || 4)),
            },
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: t("common.success"),
        description: t("campaigns.savedSuccessfully"),
      });
      setLoadingStage("idle");
      setLocation(`/campaigns/${campaign.id}/edit`);
    },
    onError: () => {
      setLoadingStage("idle");
      toast({
        title: t("common.error"),
        description: t("campaigns.saveFailed"),
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep === 1 && !campaignType) {
      toast({
        title: t("common.error"),
        description: t("wizard.selectTemplateType"),
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 2 && !selectedTemplateId) {
      toast({
        title: t("common.error"),
        description: t("wizard.selectTemplate"),
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 3 && (!campaignName.trim() || !startDate || !endDate)) {
      toast({
        title: t("common.error"),
        description: t("wizard.fillDates"),
        variant: "destructive",
      });
      return;
    }
    if (currentStep === 4 && !productsPerPage) {
      toast({
        title: t("common.error"),
        description: t("wizard.selectProductsPerPage"),
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateCampaign = () => {
    createCampaignMutation.mutate({
      name: campaignName,
      templateId: selectedTemplateId,
      type: campaignType,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      status: "draft",
    });
  };

  const toggleProductSelection = (product: Product) => {
    const existing = selectedProducts.find((sp) => sp.productId === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.filter((sp) => sp.productId !== product.id));
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          productId: product.id,
          product,
          campaignPrice: product.price?.toString() || "",
          campaignDiscountPrice: product.discountPrice?.toString() || "",
          priceTagTemplateId: null,
          editableName: product.name,
          currency: "₺",
          unit: (product as any).unit || "Piece",
        },
      ]);
    }
  };

  const toggleConnectorProductSelection = (connectorProduct: ConnectorProduct) => {
    // Create a pseudo product ID for connector products (prefixed to differentiate)
    const productId = `connector_${connectorProduct.connectorId}_${connectorProduct.id}`;
    const existing = selectedProducts.find((sp) => sp.productId === productId);
    
    if (existing) {
      setSelectedProducts(selectedProducts.filter((sp) => sp.productId !== productId));
    } else {
      // Convert connector product to Product-like structure
      const productData: Product = {
        id: productId,
        name: connectorProduct.name,
        price: connectorProduct.price?.toString() || "0",
        discountPrice: connectorProduct.discountPrice?.toString() || null,
        imageUrl: connectorProduct.imageUrl || null,
        sku: connectorProduct.sku || null,
        description: connectorProduct.description || null,
        category: null,
        discountPercentage: null,
        tenantId: null,
        isGlobal: false,
        createdAt: new Date(),
        ...(((connectorProduct as any).unit) && { unit: (connectorProduct as any).unit }),
      };
      
      setSelectedProducts([
        ...selectedProducts,
        {
          productId,
          product: productData,
          campaignPrice: connectorProduct.price?.toString() || "",
          campaignDiscountPrice: connectorProduct.discountPrice?.toString() || "",
          priceTagTemplateId: null,
          isExternal: true,
          editableName: connectorProduct.name,
          currency: "₺",
          unit: (connectorProduct as any).unit || "Piece",
        },
      ]);
    }
  };

  const isConnectorProductSelected = (connectorProduct: ConnectorProduct) => {
    const productId = `connector_${connectorProduct.connectorId}_${connectorProduct.id}`;
    return selectedProducts.some((sp) => sp.productId === productId);
  };

  const updateProductPrice = (productId: string, field: "campaignPrice" | "campaignDiscountPrice", value: string) => {
    setSelectedProducts(
      selectedProducts.map((sp) =>
        sp.productId === productId ? { ...sp, [field]: value } : sp
      )
    );
  };

  const updateProductPriceTag = (productId: string, priceTagTemplateId: string | null) => {
    setSelectedProducts(
      selectedProducts.map((sp) =>
        sp.productId === productId ? { ...sp, priceTagTemplateId } : sp
      )
    );
  };

  const updateProductProperty = (productId: string, field: "editableName" | "currency" | "unit", value: string) => {
    setSelectedProducts(
      selectedProducts.map((sp) =>
        sp.productId === productId ? { ...sp, [field]: value } : sp
      )
    );
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isCompleted
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1 ${
                  isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold" data-testid="text-step-title">
          {t("wizard.selectTemplateType")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("wizard.templateTypeDescription")}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <Card
          className={`cursor-pointer transition-all hover-elevate ${
            campaignType === "single_page" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setCampaignType("single_page")}
          data-testid="card-single-page"
        >
          <CardHeader className="text-center">
            <FileText className="w-12 h-12 mx-auto text-primary mb-2" />
            <CardTitle>{t("templates.singlePage")}</CardTitle>
            <CardDescription>{t("templates.singlePageDesc")}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card
          className={`cursor-pointer transition-all hover-elevate ${
            campaignType === "multi_page" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => setCampaignType("multi_page")}
          data-testid="card-multi-page"
        >
          <CardHeader className="text-center">
            <Files className="w-12 h-12 mx-auto text-primary mb-2" />
            <CardTitle>{t("templates.multiPage")}</CardTitle>
            <CardDescription>{t("templates.multiPageDesc")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold" data-testid="text-step-title">
          {t("wizard.selectTemplate")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("wizard.templateDescription")}
        </p>
      </div>
      
      {loadingTemplates ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Files className="w-12 h-12 mx-auto mb-4" />
          <p>{t("templates.noTemplates")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredTemplates?.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover-elevate overflow-hidden ${
                selectedTemplateId === template.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
              data-testid={`card-template-${template.id}`}
            >
              <div 
                className="aspect-[3/4] bg-muted flex items-center justify-center"
                style={{
                  backgroundColor: template.backgroundColor || "#f3f4f6",
                  backgroundImage: template.backgroundImageUrl 
                    ? `url(${template.backgroundImageUrl})` 
                    : template.coverPageImageUrl 
                      ? `url(${template.coverPageImageUrl})` 
                      : 'none',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {!template.backgroundImageUrl && !template.coverPageImageUrl && (
                  <Files className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <CardContent className="p-2">
                <h3 className="text-sm font-medium truncate">{template.title}</h3>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {template.type === "single_page" ? t("templates.singlePage") : t("templates.multiPage")}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold" data-testid="text-step-title">
          {t("wizard.setCampaignDates")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("wizard.datesDescription")}
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaignName">{t("campaigns.campaignName")}</Label>
          <Input
            id="campaignName"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder={t("campaigns.enterName")}
            data-testid="input-campaign-name"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("campaigns.startDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-start-date"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : t("common.select")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label>{t("campaigns.endDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-end-date"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : t("common.select")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold" data-testid="text-step-title">
          {t("wizard.selectProducts")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("wizard.productsDescription")}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Tabs value={productSourceTab} onValueChange={(v) => setProductSourceTab(v as "existing" | "connector")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing" className="flex items-center gap-2" data-testid="tab-existing-products">
                <Database className="w-4 h-4" />
                {t("wizard.existingProducts")}
              </TabsTrigger>
              <TabsTrigger value="connector" className="flex items-center gap-2" data-testid="tab-connector-products">
                <Globe className="w-4 h-4" />
                {t("wizard.connectorProducts")}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="existing" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("products.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-products"
                />
              </div>
              
              <ScrollArea className="h-[350px] border rounded-lg p-4">
                {loadingProducts ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredProducts?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2" />
                    <p>{t("products.noProducts")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts?.map((product) => {
                      const isSelected = selectedProducts.some((sp) => sp.productId === product.id);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted"
                          }`}
                          onClick={() => toggleProductSelection(product)}
                          data-testid={`product-item-${product.id}`}
                        >
                          <Checkbox checked={isSelected} />
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.price ? `$${product.price}` : "-"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="connector" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("wizard.searchConnectorProducts")}
                  value={connectorSearchQuery}
                  onChange={(e) => setConnectorSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-connector-products"
                />
                {fetchingConnectorProducts && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              
              <ScrollArea className="h-[350px] border rounded-lg p-4">
                {!debouncedConnectorSearch ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-8 h-8 mx-auto mb-2" />
                    <p>{t("wizard.enterSearchQuery")}</p>
                    <p className="text-xs mt-1">{t("wizard.minCharacters")}</p>
                  </div>
                ) : loadingConnectorProducts ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : connectorProducts?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2" />
                    <p>{t("wizard.noConnectorProducts")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectorProducts?.map((product) => {
                      const isSelected = isConnectorProductSelected(product);
                      return (
                        <div
                          key={`${product.connectorId}_${product.id}`}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted"
                          }`}
                          onClick={() => toggleConnectorProductSelection(product)}
                          data-testid={`connector-product-item-${product.id}`}
                        >
                          <Checkbox checked={isSelected} />
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{product.name}</p>
                              {product.connectorName && (
                                <Badge variant="secondary" className="text-xs">
                                  {product.connectorName}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {product.price ? `$${product.price}` : "-"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4" />
            {t("wizard.selectedProducts")} ({selectedProducts.length})
          </h3>
          
          <ScrollArea className="h-[350px] border rounded-lg p-4">
            {selectedProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2" />
                <p>{t("wizard.noProductsSelected")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProducts.map((sp) => (
                  <Card key={sp.productId} className="p-4">
                    <div className="flex items-start gap-3">
                      {sp.product.imageUrl && (
                        <img
                          src={sp.product.imageUrl}
                          alt={sp.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="space-y-1">
                              <Label className="text-xs">Name</Label>
                              <Input
                                value={sp.editableName}
                                onChange={(e) => updateProductProperty(sp.productId, "editableName", e.target.value)}
                                placeholder="Product name"
                                className="h-8"
                                data-testid={`input-name-${sp.productId}`}
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSelectedProduct(sp.productId)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title={t("common.remove")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t("wizard.campaignPrice")}</Label>
                            <Input
                              type="number"
                              value={sp.campaignPrice}
                              onChange={(e) => updateProductPrice(sp.productId, "campaignPrice", e.target.value)}
                              placeholder="0.00"
                              className="h-8"
                              data-testid={`input-price-${sp.productId}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Currency</Label>
                            <Select
                              value={sp.currency}
                              onValueChange={(value) => updateProductProperty(sp.productId, "currency", value)}
                            >
                              <SelectTrigger className="h-8" data-testid={`select-currency-${sp.productId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="₺">₺</SelectItem>
                                <SelectItem value="$">$</SelectItem>
                                <SelectItem value="€">€</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t("wizard.discountPrice")}</Label>
                            <Input
                              type="number"
                              value={sp.campaignDiscountPrice}
                              onChange={(e) => updateProductPrice(sp.productId, "campaignDiscountPrice", e.target.value)}
                              placeholder="0.00"
                              className="h-8"
                              data-testid={`input-discount-${sp.productId}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit</Label>
                            <Select
                              value={sp.unit}
                              onValueChange={(value) => updateProductProperty(sp.productId, "unit", value)}
                            >
                              <SelectTrigger className="h-8" data-testid={`select-unit-${sp.productId}`}>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="l">l</SelectItem>
                                <SelectItem value="Piece">Piece</SelectItem>
                                <SelectItem value="Bunch">Bunch</SelectItem>
                                <SelectItem value="Pack">Pack</SelectItem>
                                <SelectItem value="Case">Case</SelectItem>
                                <SelectItem value="Carton">Carton</SelectItem>
                                <SelectItem value="Roll">Roll</SelectItem>
                                <SelectItem value="Bag">Bag</SelectItem>
                                <SelectItem value="Plate">Plate</SelectItem>
                                <SelectItem value="Glass">Glass</SelectItem>
                                <SelectItem value="Sack">Sack</SelectItem>
                                <SelectItem value="Can">Can</SelectItem>
                                <SelectItem value="Bottle">Bottle</SelectItem>
                                <SelectItem value="Drum">Drum</SelectItem>
                                <SelectItem value="Pair">Pair</SelectItem>
                                <SelectItem value="Slice">Slice</SelectItem>
                                <SelectItem value="Portion">Portion</SelectItem>
                                <SelectItem value="Bucket">Bucket</SelectItem>
                                <SelectItem value="Net bag">Net bag</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {/* Products per page selector */}
          <div className="mt-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-sm font-medium">{t("wizard.productsPerPage")}</Label>
            <p className="text-xs text-muted-foreground mb-3">{t("wizard.productsPerPageDescription")}</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <Button
                  key={num}
                  variant={productsPerPage === num ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProductsPerPage(num)}
                  className="w-full"
                  data-testid={`button-products-per-page-${num}`}
                >
                  {num}
                </Button>
              ))}
            </div>
            {selectedProducts.length > 0 && productsPerPage && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("wizard.pagesRequired")}: {Math.ceil(selectedProducts.length / productsPerPage)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => {
    const selectedTemplate = templates?.find((temp) => temp.id === selectedTemplateId);
    
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold" data-testid="text-step-title">
            {t("wizard.confirmCampaign")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("wizard.confirmDescription")}
          </p>
        </div>
        
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">{t("campaigns.campaignName")}</span>
              <span className="font-medium">{campaignName}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">{t("templates.templateType")}</span>
              <Badge>
                {campaignType === "single_page" ? t("templates.singlePage") : t("templates.multiPage")}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">{t("campaigns.template")}</span>
              <span className="font-medium">{selectedTemplate?.title || "-"}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">{t("campaigns.startDate")}</span>
              <span className="font-medium">{startDate ? format(startDate, "PPP") : "-"}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">{t("campaigns.endDate")}</span>
              <span className="font-medium">{endDate ? format(endDate, "PPP") : "-"}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">{t("wizard.productsCount")}</span>
              <Badge variant="secondary">{selectedProducts.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  const getLoadingMessage = () => {
    switch (loadingStage) {
      case "creating":
        return t("wizard.loadingCreating") || "Creating campaign...";
      case "products":
        return t("wizard.loadingProducts") || "Adding products...";
      case "images":
        return t("wizard.loadingImages") || "Processing product images...";
      case "finalizing":
        return t("wizard.loadingFinalizing") || "Finalizing and opening editor...";
      default:
        return "";
    }
  };

  const getLoadingProgress = () => {
    switch (loadingStage) {
      case "creating":
        return 25;
      case "products":
        return 50;
      case "images":
        return 75;
      case "finalizing":
        return 95;
      default:
        return 0;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-6 border-b">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {t("wizard.createCampaign")}
        </h1>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        {renderStepIndicator()}
        {renderCurrentStep()}
      </div>
      
      <div className="flex items-center justify-between gap-4 p-6 border-t bg-background">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || createCampaignMutation.isPending}
          data-testid="button-previous"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t("common.back")}
        </Button>
        
        {currentStep === STEPS.length ? (
          <Button
            onClick={handleCreateCampaign}
            disabled={createCampaignMutation.isPending}
            data-testid="button-create"
          >
            {createCampaignMutation.isPending ? t("common.saving") : t("wizard.createAndEdit")}
          </Button>
        ) : (
          <Button onClick={handleNext} data-testid="button-next">
            {t("common.next")}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Loading Dialog */}
      <Dialog open={loadingStage !== "idle"} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle>{t("common.creating")}</DialogTitle>
          <DialogDescription className="sr-only">Campaign creation in progress</DialogDescription>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-center text-sm font-medium">
                {getLoadingMessage()}
              </p>
              <Progress value={getLoadingProgress()} className="w-full" />
              <p className="text-center text-xs text-muted-foreground">
                {getLoadingProgress()}%
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
