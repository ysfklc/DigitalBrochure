import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Calendar, 
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Share2,
  Eye,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { Campaign, Template } from "@shared/schema";

const CANVAS_SIZES: Record<string, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1080, height: 566 },
  a4portrait: { width: 794, height: 1123 },
  a4landscape: { width: 1123, height: 794 },
};

function CampaignThumbnail({ campaign, template }: { campaign: Campaign; template?: Template }) {
  const canvasData = campaign.canvasData as any;
  const backgroundImageUrl = template?.backgroundImageUrl;
  
  if (!canvasData?.elements?.length && !backgroundImageUrl) {
    return <Calendar className="h-12 w-12 text-muted-foreground" />;
  }
  
  const elements = canvasData?.elements || [];
  const canvasSize = canvasData?.canvasSize || 'a4portrait';
  const baseWidth = CANVAS_SIZES[canvasSize]?.width || 794;
  const baseHeight = CANVAS_SIZES[canvasSize]?.height || 1123;
  
  const containerWidth = 200;
  const containerHeight = 160;
  const scale = Math.min(containerWidth / baseWidth, containerHeight / baseHeight) * 0.85;
  
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;
  
  // Filter page 1 elements - ensure type comparison works for both string and number
  const page1Elements = elements.filter((el: any) => el.page === 1 || el.page === undefined);

  const renderElement = (element: any) => {
    if (element.type === 'product') {
      const productData = element.data?.product || element.data;
      const imageUrl = productData?.imageUrl;
      const price = element.data?.campaignPrice || productData?.price;
      const discountPrice = element.data?.campaignDiscountPrice || productData?.discountPrice;
      const labelImageUrl = template?.labelImageUrl;
      
      // Calculate price label dimensions - 1/6 of product size
      const labelWidth = Math.max((element.width * scale) / 6, 12);
      const labelHeight = Math.max((element.height * scale) / 6, 10);
      
      return (
        <div className="w-full h-full relative overflow-visible">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Package className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          {/* Price Label - Bottom right corner */}
          {(price || discountPrice) && (
            <div 
              className="absolute flex items-center justify-center rounded-sm overflow-hidden"
              style={{ 
                right: 0,
                bottom: 0,
                width: `${labelWidth}px`,
                height: `${labelHeight}px`,
                backgroundImage: labelImageUrl ? `url(${labelImageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: labelImageUrl ? 'transparent' : 'hsl(var(--primary))',
              }}
            >
              <span 
                className="font-bold text-white leading-none"
                style={{ fontSize: `${Math.max(labelHeight * 0.5, 5)}px` }}
              >
                ${discountPrice || price}
              </span>
            </div>
          )}
        </div>
      );
    }
    
    if (element.type === 'text') {
      const textData = element.data;
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontFamily: textData?.fontFamily,
            fontSize: `${(textData?.fontSize || 12) * scale * 0.3}px`,
            fontWeight: textData?.fontWeight,
            color: textData?.color,
            backgroundColor: textData?.backgroundColor === 'transparent' ? 'transparent' : textData?.backgroundColor,
          }}
        >
          <span className="truncate px-0.5">{textData?.text}</span>
        </div>
      );
    }
    
    if (element.type === 'shape') {
      const shapeData = element.data;
      
      if (shapeData?.shapeType === 'rectangle') {
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: shapeData?.fill,
              border: `1px solid ${shapeData?.stroke}`,
              borderRadius: '2px',
            }}
          />
        );
      }
      
      if (shapeData?.shapeType === 'circle') {
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: shapeData?.fill,
              border: `1px solid ${shapeData?.stroke}`,
            }}
          />
        );
      }
      
      if (shapeData?.shapeType === 'triangle') {
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon
              points="50,5 95,95 5,95"
              fill={shapeData?.fill}
              stroke={shapeData?.stroke}
              strokeWidth={1}
            />
          </svg>
        );
      }
    }
    
    return null;
  };

  return (
    <div 
      className="relative border border-border rounded shadow-sm overflow-hidden"
      style={{
        width: scaledWidth,
        height: scaledHeight,
        backgroundColor: backgroundImageUrl ? undefined : 'white',
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {page1Elements.map((element: any) => (
        <div
          key={element.id}
          className="absolute"
          style={{
            left: element.x * scale,
            top: element.y * scale,
            width: element.width * scale,
            height: element.height * scale,
            transform: `rotate(${element.rotation || 0}deg)`,
            opacity: (element.opacity || 100) / 100,
          }}
        >
          {renderElement(element)}
        </div>
      ))}
    </div>
  );
}

export default function CampaignsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: templates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  // Create a map for quick template lookup
  const templateMap = templates?.reduce((acc, template) => {
    acc[template.id] = template;
    return acc;
  }, {} as Record<string, Template>) || {};

  const deleteMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      await apiRequest("DELETE", `/api/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: t("common.success"),
        description: t("campaigns.campaignDeleted"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("campaigns.deleteError"),
        variant: "destructive",
      });
    },
  });

  const filteredCampaigns = campaigns?.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "draft":
        return "secondary";
      case "scheduled":
        return "outline";
      case "completed":
        return "secondary";
      case "paused":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const handleDelete = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCampaign) {
      deleteMutation.mutate(selectedCampaign.id);
    }
    setDeleteDialogOpen(false);
    setSelectedCampaign(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-6 border-b">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {t("campaigns.title")}
        </h1>
        <Button asChild data-testid="button-create-campaign">
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("campaigns.createCampaign")}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 p-4 border-b">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-campaigns"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder={t("campaigns.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="draft">{t("campaigns.draft")}</SelectItem>
            <SelectItem value="active">{t("campaigns.active")}</SelectItem>
            <SelectItem value="scheduled">{t("campaigns.scheduled")}</SelectItem>
            <SelectItem value="completed">{t("campaigns.completed")}</SelectItem>
            <SelectItem value="paused">{t("campaigns.paused")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-0">
                    <Skeleton className="h-40 w-full rounded-t-lg" />
                  </CardHeader>
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )
        ) : !filteredCampaigns?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4" />
            <p>{t("campaigns.noCampaigns")}</p>
            <Button asChild className="mt-4" data-testid="button-create-first-campaign">
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("campaigns.createCampaign")}
              </Link>
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="overflow-hidden" data-testid={`card-campaign-${campaign.id}`}>
                <CardHeader className="p-0 relative">
                  <div className="h-40 bg-muted flex items-center justify-center">
                    <CampaignThumbnail campaign={campaign} template={campaign.templateId ? templateMap[campaign.templateId] : undefined} />
                  </div>
                  <Badge
                    variant={getStatusBadgeVariant(campaign.status)}
                    className="absolute top-2 right-2"
                  >
                    {t(`campaigns.${campaign.status}`)}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4">
                  <h3 className="font-medium truncate" data-testid={`text-campaign-name-${campaign.id}`}>
                    {campaign.name}
                  </h3>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                  <Button variant="outline" size="sm" asChild data-testid={`button-view-campaign-${campaign.id}`}>
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      {t("common.view")}
                    </Link>
                  </Button>
                  <Button size="sm" asChild data-testid={`button-edit-campaign-${campaign.id}`}>
                    <Link href={`/campaigns/${campaign.id}/edit`}>
                      <Edit className="h-4 w-4 mr-1" />
                      {t("campaigns.openEditor")}
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-campaign-menu-${campaign.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/sharing?campaign=${campaign.id}`}>
                          <Share2 className="h-4 w-4 mr-2" />
                          {t("campaigns.share")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        {t("campaigns.duplicate")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(campaign)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("campaigns.deleteCampaign")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("campaigns.campaignName")}</TableHead>
                <TableHead>{t("campaigns.status")}</TableHead>
                <TableHead>{t("campaigns.startDate")}</TableHead>
                <TableHead>{t("campaigns.endDate")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(campaign.status)}>
                      {t(`campaigns.${campaign.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(campaign.startDate)}</TableCell>
                  <TableCell>{formatDate(campaign.endDate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/campaigns/${campaign.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/sharing?campaign=${campaign.id}`}>
                              <Share2 className="h-4 w-4 mr-2" />
                              {t("campaigns.share")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            {t("campaigns.duplicate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(campaign)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("campaigns.deleteCampaign")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("campaigns.deleteCampaign")}</DialogTitle>
            <DialogDescription>
              {t("products.confirmDelete")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="button-confirm-delete">
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
