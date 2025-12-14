import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Building2, Users, CreditCard, Eye } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import type { Tenant, Subscription, User } from "@shared/schema";

interface TenantWithDetails extends Tenant {
  userCount: number;
  subscription: Subscription | null;
}

export default function TenantsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, token, startImpersonation } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithDetails | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<TenantWithDetails | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });

  const { data: tenants, isLoading } = useQuery<TenantWithDetails[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      return apiRequest("POST", "/api/admin/tenants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setIsCreateOpen(false);
      setFormData({ name: "", slug: "" });
      toast({ title: t("tenants.createSuccess") });
    },
    onError: () => {
      toast({ title: t("tenants.createError"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Tenant> }) => {
      return apiRequest("PATCH", `/api/admin/tenants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setEditingTenant(null);
      setFormData({ name: "", slug: "" });
      toast({ title: t("tenants.updateSuccess") });
    },
    onError: () => {
      toast({ title: t("tenants.updateError"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setDeletingTenant(null);
      toast({ title: t("tenants.deleteSuccess") });
    },
    onError: () => {
      toast({ title: t("tenants.deleteError"), variant: "destructive" });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (id: string) => {
      const data = await apiRequest("POST", `/api/admin/tenants/${id}/impersonate`);
      return data as { user: User; token: string; tenant: Tenant };
    },
    onSuccess: (data: { user: User; token: string; tenant: Tenant }) => {
      if (user && token) {
        startImpersonation(data.user, data.token, user, token);
        toast({ title: t("tenants.impersonateSuccess", { name: data.tenant.name }) });
        setLocation("/dashboard");
      }
    },
    onError: () => {
      toast({ title: t("tenants.impersonateError"), variant: "destructive" });
    },
  });

  const handleImpersonate = (tenantId: string) => {
    impersonateMutation.mutate(tenantId);
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data: formData });
    }
  };

  const handleDelete = () => {
    if (deletingTenant) {
      deleteMutation.mutate(deletingTenant.id);
    }
  };

  const openEditDialog = (tenant: TenantWithDetails) => {
    setEditingTenant(tenant);
    setFormData({ name: tenant.name, slug: tenant.slug });
  };

  const getSubscriptionBadge = (subscription: Subscription | null) => {
    if (!subscription) {
      return <Badge variant="outline">{t("tenants.noSubscription")}</Badge>;
    }
    const variant = subscription.status === "active" ? "default" : "secondary";
    return <Badge variant={variant}>{subscription.status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("tenants.title")}</h1>
          <p className="text-muted-foreground">{t("tenants.description")}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-tenant">
          <Plus className="h-4 w-4 mr-2" />
          {t("tenants.create")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("tenants.allTenants")}
          </CardTitle>
          <CardDescription>
            {t("tenants.totalCount", { count: tenants?.length || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tenants.name")}</TableHead>
                <TableHead>{t("tenants.slug")}</TableHead>
                <TableHead>{t("tenants.code")}</TableHead>
                <TableHead>{t("tenants.users")}</TableHead>
                <TableHead>{t("tenants.subscription")}</TableHead>
                <TableHead>{t("tenants.createdAt")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants?.map((tenant) => (
                <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm" data-testid={`text-tenant-code-${tenant.id}`}>
                      {tenant.code || "-"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {tenant.userCount}
                    </div>
                  </TableCell>
                  <TableCell>{getSubscriptionBadge(tenant.subscription)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleImpersonate(tenant.id)}
                        disabled={impersonateMutation.isPending}
                        data-testid={`button-view-tenant-${tenant.id}`}
                        title={t("tenants.viewAsTenant")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(tenant)}
                        data-testid={`button-edit-tenant-${tenant.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTenant(tenant)}
                        data-testid={`button-delete-tenant-${tenant.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!tenants || tenants.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t("tenants.noTenants")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tenants.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("tenants.name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("tenants.namePlaceholder")}
                data-testid="input-tenant-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{t("tenants.slug")}</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder={t("tenants.slugPlaceholder")}
                data-testid="input-tenant-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-tenant">
              {createMutation.isPending ? t("common.saving") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tenants.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("tenants.name")}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-tenant-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">{t("tenants.slug")}</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                data-testid="input-edit-tenant-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTenant(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-update-tenant">
              {updateMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTenant} onOpenChange={() => setDeletingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tenants.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tenants.deleteDescription", { name: deletingTenant?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
