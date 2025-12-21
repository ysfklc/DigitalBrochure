import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Lightbulb, 
  Clock, 
  CheckCircle, 
  CheckCheck,
  Trash2,
  MessageSquare,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoleVerification } from "@/lib/use-role-verification";
import type { Suggestion } from "@shared/schema";

interface SuggestionWithUser extends Suggestion {
  user?: { firstName: string; lastName: string; email: string };
  tenant?: { name: string };
}

export default function AdminSuggestionsPage() {
  useRoleVerification(["super_admin"]);
  
  const { t } = useTranslation();
  const { toast } = useToast();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionWithUser | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminComment, setAdminComment] = useState("");

  const { data: suggestions, isLoading } = useQuery<SuggestionWithUser[]>({
    queryKey: ["/api/admin/suggestions"],
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, status, adminComment }: { id: string; status: string; adminComment?: string }) => {
      return apiRequest("PATCH", `/api/admin/suggestions/${id}`, { status, adminComment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suggestions"] });
      toast({ title: t("adminSuggestions.statusUpdated") });
      setStatusDialogOpen(false);
      setSelectedSuggestion(null);
      setNewStatus("");
      setAdminComment("");
    },
    onError: () => {
      toast({ title: t("adminSuggestions.updateError"), variant: "destructive" });
    },
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/suggestions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suggestions"] });
      toast({ title: t("adminSuggestions.deleted") });
      setDeleteDialogOpen(false);
      setSelectedSuggestion(null);
    },
    onError: () => {
      toast({ title: t("adminSuggestions.deleteError"), variant: "destructive" });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "reviewed": return <CheckCircle className="h-4 w-4" />;
      case "implemented": return <CheckCheck className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500 text-white dark:bg-yellow-600";
      case "reviewed": return "bg-blue-500 text-white dark:bg-blue-600";
      case "implemented": return "bg-green-500 text-white dark:bg-green-600";
      case "rejected": return "bg-red-500 text-white dark:bg-red-600";
      default: return "bg-yellow-500 text-white dark:bg-yellow-600";
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openStatusDialog = (suggestion: SuggestionWithUser) => {
    setSelectedSuggestion(suggestion);
    setNewStatus(suggestion.status || "pending");
    setAdminComment("");
    setStatusDialogOpen(true);
  };

  const openDeleteDialog = (suggestion: SuggestionWithUser) => {
    setSelectedSuggestion(suggestion);
    setDeleteDialogOpen(true);
  };

  const handleUpdateStatus = () => {
    if (selectedSuggestion) {
      updateSuggestionMutation.mutate({
        id: selectedSuggestion.id,
        status: newStatus,
        adminComment: adminComment.trim() || undefined,
      });
    }
  };

  const handleDelete = () => {
    if (selectedSuggestion) {
      deleteSuggestionMutation.mutate(selectedSuggestion.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            {t("adminSuggestions.title")}
          </h1>
          <p className="text-muted-foreground">{t("adminSuggestions.description")}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !suggestions?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mb-4" />
            <p>{t("adminSuggestions.noSuggestions")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} data-testid={`card-suggestion-${suggestion.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg" data-testid={`text-suggestion-title-${suggestion.id}`}>
                        {suggestion.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {suggestion.user && `${suggestion.user.firstName} ${suggestion.user.lastName}`}
                        {suggestion.tenant && ` - ${suggestion.tenant.name}`}
                        {` - ${formatDate(suggestion.createdAt)}`}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusBadgeClass(suggestion.status || "pending")}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(suggestion.status || "pending")}
                        {t(`suggestions.${suggestion.status || "pending"}`)}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground" data-testid={`text-suggestion-content-${suggestion.id}`}>
                    {suggestion.content}
                  </p>
                  
                  {suggestion.adminComment && (
                    <div className="p-3 rounded-md bg-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("adminSuggestions.commentHistory")}</span>
                      </div>
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">{suggestion.adminComment}</pre>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openStatusDialog(suggestion)}
                      data-testid={`button-update-status-${suggestion.id}`}
                    >
                      {t("adminSuggestions.updateStatus")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(suggestion)}
                      data-testid={`button-delete-${suggestion.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminSuggestions.updateStatusTitle")}</DialogTitle>
            <DialogDescription>{t("adminSuggestions.updateStatusDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("adminSuggestions.status")}</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("suggestions.pending")}</SelectItem>
                  <SelectItem value="reviewed">{t("suggestions.reviewed")}</SelectItem>
                  <SelectItem value="implemented">{t("suggestions.implemented")}</SelectItem>
                  <SelectItem value="rejected">{t("suggestions.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("adminSuggestions.comment")}</label>
              <Textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder={t("adminSuggestions.commentPlaceholder")}
                rows={4}
                className="resize-none"
                data-testid="input-admin-comment"
              />
              <p className="text-xs text-muted-foreground">{t("adminSuggestions.commentHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleUpdateStatus} 
              disabled={updateSuggestionMutation.isPending}
              data-testid="button-confirm-status"
            >
              {updateSuggestionMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminSuggestions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminSuggestions.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
