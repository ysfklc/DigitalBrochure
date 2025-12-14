import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Building2, Loader2, Trash2 } from "lucide-react";
import type { Tenant } from "@shared/schema";

interface TenantInfo extends Tenant {
  code: string;
}

export default function OrganizationSettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: tenantInfo, isLoading } = useQuery<TenantInfo>({
    queryKey: ["/api/tenant/current"],
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      
      const response = await fetch("/api/tenant/logo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload logo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/current"] });
      toast({
        title: t("common.success"),
        description: t("organizationSettings.logoUploadSuccess"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/tenant/logo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/current"] });
      toast({
        title: t("common.success"),
        description: t("organizationSettings.logoRemoveSuccess"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("organizationSettings.logoRemoveError"),
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("common.error"),
          description: t("organizationSettings.fileTooLarge"),
          variant: "destructive",
        });
        return;
      }
      
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: t("common.error"),
          description: t("organizationSettings.invalidFileType"),
          variant: "destructive",
        });
        return;
      }
      
      setIsUploading(true);
      uploadLogoMutation.mutate(file, {
        onSettled: () => {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
      });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = () => {
    removeLogoMutation.mutate();
  };

  const isAdmin = user?.role === "tenant_admin" || user?.role === "super_admin";

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-4 p-6 border-b">
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            {t("organizationSettings.title")}
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t("common.accessDenied")}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-4 p-6 border-b">
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            {t("organizationSettings.title")}
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-6 border-b">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {t("organizationSettings.title")}
        </h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t("organizationSettings.organizationInfo")}
              </CardTitle>
              <CardDescription>
                {t("organizationSettings.organizationInfoDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("organizationSettings.organizationName")}
                </label>
                <p className="text-lg font-medium" data-testid="text-org-name">
                  {tenantInfo?.name}
                </p>
              </div>
              {tenantInfo?.code && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("organizationSettings.organizationCode")}
                  </label>
                  <p className="text-lg font-mono" data-testid="text-org-code">
                    {tenantInfo.code}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("organizationSettings.logoTitle")}</CardTitle>
              <CardDescription>
                {t("organizationSettings.logoDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24 rounded-md">
                  {tenantInfo?.logoUrl ? (
                    <AvatarImage 
                      src={tenantInfo.logoUrl} 
                      alt={tenantInfo.name}
                      className="object-cover"
                      data-testid="img-org-logo"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-md bg-muted text-2xl">
                    {tenantInfo?.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-logo-file"
                  />
                  
                  <Button
                    onClick={handleUploadClick}
                    disabled={isUploading || uploadLogoMutation.isPending}
                    data-testid="button-upload-logo"
                  >
                    {isUploading || uploadLogoMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("common.uploading")}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t("organizationSettings.uploadLogo")}
                      </>
                    )}
                  </Button>

                  {tenantInfo?.logoUrl && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveLogo}
                      disabled={removeLogoMutation.isPending}
                      data-testid="button-remove-logo"
                    >
                      {removeLogoMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {t("organizationSettings.removeLogo")}
                    </Button>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {t("organizationSettings.logoRequirements")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
