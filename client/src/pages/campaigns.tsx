import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
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
  Eye
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
import type { Campaign } from "@shared/schema";

export default function CampaignsPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
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
                    {campaign.thumbnailUrl ? (
                      <img
                        src={campaign.thumbnailUrl}
                        alt={campaign.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    )}
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
