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
  Loader2
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
      return await apiRequest("POST", "/api/campaigns", data) as any;
    },
    onSuccess: async (campaign) => {
      if (selectedProducts.length > 0) {
        await apiRequest("PUT", `/api/campaigns/${campaign.id}/products`, {
          products: selectedProducts.map((sp, index) => ({
            productId: sp.productId,
            campaignPrice: sp.campaignPrice || null,
            campaignDiscountPrice: sp.campaignDiscountPrice || null,
            priceTagTemplateId: sp.priceTagTemplateId || null,
            pageNumber: 1,
            positionX: 50 + (index % 3) * 150,
            positionY: 50 + Math.floor(index / 3) * 180,
            width: 120,
            height: 140,
          })),
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: t("common.success"),
        description: t("campaigns.savedSuccessfully"),
      });
      setLocation(`/campaigns/${campaign.id}/edit`);
    },
    onError: () => {
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
      };
      
      setSelectedProducts([
        ...selectedProducts,
        {
          productId,
          product: productData,
          campaignPrice: connectorProduct.price?.toString() || "",
          campaignDiscountPrice: connectorProduct.discountPrice?.toString() || "",
          priceTagTemplateId: null,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Files className="w-12 h-12 mx-auto mb-4" />
          <p>{t("templates.noTemplates")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates?.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover-elevate ${
                selectedTemplateId === template.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
              data-testid={`card-template-${template.id}`}
            >
              <CardHeader className="p-0">
                <div className="h-32 bg-muted flex items-center justify-center rounded-t-lg">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.title}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <Files className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <h3 className="font-medium truncate">{template.title}</h3>
                <Badge variant="secondary" className="mt-2">
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
          
          <ScrollArea className="h-[400px] border rounded-lg p-4">
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
                        <p className="font-medium">{sp.product.name}</p>
                        
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
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs">{t("wizard.priceTag")}</Label>
                          <Select
                            value={sp.priceTagTemplateId || "none"}
                            onValueChange={(value) => updateProductPriceTag(sp.productId, value === "none" ? null : value)}
                          >
                            <SelectTrigger className="h-8" data-testid={`select-price-tag-${sp.productId}`}>
                              <SelectValue placeholder={t("wizard.selectPriceTag")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("common.none")}</SelectItem>
                              {priceTagTemplates?.map((ptt) => (
                                <SelectItem key={ptt.id} value={ptt.id}>
                                  {ptt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
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
          disabled={currentStep === 1}
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
    </div>
  );
}
