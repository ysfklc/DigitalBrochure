import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditCard, Database, RefreshCw, Eye, EyeOff, Mail, Send, Plus, Trash2, Edit, Link, TestTube } from "lucide-react";
import { useRoleVerification } from "@/lib/use-role-verification";
import type { ProductConnector } from "@shared/schema";

interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  isTestMode: boolean;
}

interface ProductApiConfig {
  endpoint: string;
  method: string;
  headers: string;
  syncSchedule: string;
  isEnabled: boolean;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  appUrl: string;
  isEnabled: boolean;
}

interface RequestParam {
  key: string;
  value: string;
}

interface FieldMappings {
  name: string;
  image: string;
  price?: string;
  sku?: string;
}

interface ConnectorFormData {
  name: string;
  description: string;
  isEnabled: boolean;
  requestMethod: string;
  requestUrl: string;
  requestHeaders: Record<string, string>;
  requestParams: RequestParam[];
  requestBody: string;
  responseParser: string;
  fieldMappings: FieldMappings;
}

const emptyConnectorForm: ConnectorFormData = {
  name: "",
  description: "",
  isEnabled: true,
  requestMethod: "GET",
  requestUrl: "",
  requestHeaders: {},
  requestParams: [{ key: "", value: "" }],
  requestBody: "",
  responseParser: "$.data",
  fieldMappings: { name: "name", image: "imageUrl", price: "price", sku: "sku" },
};

export default function SettingsPage() {
  // Verify user has super_admin role (security check against localStorage tampering)
  useRoleVerification(["super_admin"]);

  const { t } = useTranslation();
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<ProductConnector | null>(null);
  const [connectorForm, setConnectorForm] = useState<ConnectorFormData>(emptyConnectorForm);
  const [testQuery, setTestQuery] = useState("test");
  const [testResults, setTestResults] = useState<any[] | null>(null);

  const [iyzicoForm, setIyzicoForm] = useState<IyzicoConfig>({
    apiKey: "",
    secretKey: "",
    baseUrl: "https://sandbox-api.iyzipay.com",
    isTestMode: true,
  });

  const [productApiForm, setProductApiForm] = useState<ProductApiConfig>({
    endpoint: "",
    method: "GET",
    headers: "{}",
    syncSchedule: "0 0 * * *",
    isEnabled: false,
  });

  const [emailForm, setEmailForm] = useState<EmailConfig>({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "noreply@example.com",
    appUrl: "",
    isEnabled: false,
  });

  const { data: settings, isLoading } = useQuery<{
    iyzico: IyzicoConfig | null;
    productApi: ProductApiConfig | null;
    email: EmailConfig | null;
  }>({
    queryKey: ["/api/admin/settings"],
  });

  const { data: connectors, isLoading: loadingConnectors } = useQuery<ProductConnector[]>({
    queryKey: ["/api/admin/product-connectors"],
  });

  useEffect(() => {
    if (settings?.iyzico) {
      setIyzicoForm(settings.iyzico);
    }
    if (settings?.productApi) {
      setProductApiForm(settings.productApi);
    }
    if (settings?.email) {
      setEmailForm(settings.email);
    }
  }, [settings]);

  const saveIyzicoMutation = useMutation({
    mutationFn: async (data: IyzicoConfig) => {
      return apiRequest("POST", "/api/admin/settings/iyzico", { value: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: t("settings.saveSuccess") });
    },
    onError: () => {
      toast({ title: t("settings.saveError"), variant: "destructive" });
    },
  });

  const saveProductApiMutation = useMutation({
    mutationFn: async (data: ProductApiConfig) => {
      return apiRequest("POST", "/api/admin/settings/product_api", { value: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: t("settings.saveSuccess") });
    },
    onError: () => {
      toast({ title: t("settings.saveError"), variant: "destructive" });
    },
  });

  const syncProductsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/sync-products");
    },
    onSuccess: () => {
      toast({ title: t("settings.syncSuccess") });
    },
    onError: () => {
      toast({ title: t("settings.syncError"), variant: "destructive" });
    },
  });

  const saveEmailMutation = useMutation({
    mutationFn: async (data: EmailConfig) => {
      return apiRequest("POST", "/api/admin/settings/email", { value: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: t("settings.saveSuccess") });
    },
    onError: () => {
      toast({ title: t("settings.saveError"), variant: "destructive" });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/test-email");
    },
    onSuccess: () => {
      toast({ title: t("settings.testEmailSuccess") });
    },
    onError: () => {
      toast({ title: t("settings.testEmailError"), variant: "destructive" });
    },
  });

  const createConnectorMutation = useMutation({
    mutationFn: async (data: ConnectorFormData) => {
      return apiRequest("POST", "/api/admin/product-connectors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-connectors"] });
      setConnectorDialogOpen(false);
      setConnectorForm(emptyConnectorForm);
      toast({ title: t("settings.connectorCreated") });
    },
    onError: () => {
      toast({ title: t("settings.connectorError"), variant: "destructive" });
    },
  });

  const updateConnectorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ConnectorFormData }) => {
      return apiRequest("PATCH", `/api/admin/product-connectors/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-connectors"] });
      setConnectorDialogOpen(false);
      setEditingConnector(null);
      setConnectorForm(emptyConnectorForm);
      toast({ title: t("settings.connectorUpdated") });
    },
    onError: () => {
      toast({ title: t("settings.connectorError"), variant: "destructive" });
    },
  });

  const deleteConnectorMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/product-connectors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-connectors"] });
      toast({ title: t("settings.connectorDeleted") });
    },
    onError: () => {
      toast({ title: t("settings.connectorError"), variant: "destructive" });
    },
  });

  const testConnectorMutation = useMutation({
    mutationFn: async ({ id, searchQuery }: { id: string; searchQuery: string }) => {
      return apiRequest("POST", `/api/admin/product-connectors/${id}/test`, { searchQuery });
    },
    onSuccess: (data: any) => {
      setTestResults(data.products || []);
      toast({ title: t("settings.testSuccess") });
    },
    onError: () => {
      toast({ title: t("settings.testError"), variant: "destructive" });
    },
  });

  const openConnectorDialog = (connector?: ProductConnector) => {
    if (connector) {
      setEditingConnector(connector);
      setConnectorForm({
        name: connector.name,
        description: connector.description || "",
        isEnabled: connector.isEnabled ?? true,
        requestMethod: connector.requestMethod,
        requestUrl: connector.requestUrl,
        requestHeaders: (connector.requestHeaders as Record<string, string>) || {},
        requestParams: (connector.requestParams as RequestParam[]) || [{ key: "", value: "" }],
        requestBody: connector.requestBody || "",
        responseParser: connector.responseParser,
        fieldMappings: (connector.fieldMappings as FieldMappings) || { name: "", image: "" },
      });
    } else {
      setEditingConnector(null);
      setConnectorForm(emptyConnectorForm);
    }
    setTestResults(null);
    setConnectorDialogOpen(true);
  };

  const handleSaveConnector = () => {
    const cleanParams = connectorForm.requestParams.filter(p => p.key.trim() !== "");
    const formData = { ...connectorForm, requestParams: cleanParams };
    
    if (editingConnector) {
      updateConnectorMutation.mutate({ id: editingConnector.id, data: formData });
    } else {
      createConnectorMutation.mutate(formData);
    }
  };

  const addParam = () => {
    setConnectorForm({
      ...connectorForm,
      requestParams: [...connectorForm.requestParams, { key: "", value: "" }],
    });
  };

  const updateParam = (index: number, field: "key" | "value", value: string) => {
    const newParams = [...connectorForm.requestParams];
    newParams[index][field] = value;
    setConnectorForm({ ...connectorForm, requestParams: newParams });
  };

  const removeParam = (index: number) => {
    const newParams = connectorForm.requestParams.filter((_, i) => i !== index);
    setConnectorForm({ ...connectorForm, requestParams: newParams.length ? newParams : [{ key: "", value: "" }] });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.description")}</p>
      </div>

      <Tabs defaultValue="connectors" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="connectors" data-testid="tab-connectors">
            <Link className="h-4 w-4 mr-2" />
            {t("settings.productConnectors")}
          </TabsTrigger>
          <TabsTrigger value="payment" data-testid="tab-payment">
            <CreditCard className="h-4 w-4 mr-2" />
            {t("settings.paymentGateway")}
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">
            <Database className="h-4 w-4 mr-2" />
            {t("settings.productSync")}
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">
            <Mail className="h-4 w-4 mr-2" />
            {t("settings.emailSettings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connectors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    {t("settings.productConnectorsTitle")}
                  </CardTitle>
                  <CardDescription>{t("settings.productConnectorsDescription")}</CardDescription>
                </div>
                <Button onClick={() => openConnectorDialog()} data-testid="button-add-connector">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("settings.addConnector")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingConnectors ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : connectors?.length ? (
                <div className="space-y-4">
                  {connectors.map((connector) => (
                    <div
                      key={connector.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-md border"
                      data-testid={`connector-item-${connector.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{connector.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${connector.isEnabled ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}`}>
                            {connector.isEnabled ? t("common.enabled") : t("common.disabled")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {connector.requestMethod} {connector.requestUrl}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openConnectorDialog(connector)}
                          data-testid={`button-edit-connector-${connector.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteConnectorMutation.mutate(connector.id)}
                          data-testid={`button-delete-connector-${connector.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("settings.noConnectors")}</p>
                  <p className="text-sm">{t("settings.noConnectorsHint")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("settings.iyzicoTitle")}
              </CardTitle>
              <CardDescription>{t("settings.iyzicoDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="test-mode">{t("settings.testMode")}</Label>
                <Switch
                  id="test-mode"
                  checked={iyzicoForm.isTestMode}
                  onCheckedChange={(checked) => setIyzicoForm({ ...iyzicoForm, isTestMode: checked })}
                  data-testid="switch-test-mode"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">{t("settings.apiKey")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type={showSecrets ? "text" : "password"}
                    value={iyzicoForm.apiKey}
                    onChange={(e) => setIyzicoForm({ ...iyzicoForm, apiKey: e.target.value })}
                    placeholder={t("settings.apiKeyPlaceholder")}
                    data-testid="input-api-key"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecrets(!showSecrets)}
                    data-testid="button-toggle-secrets"
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret-key">{t("settings.secretKey")}</Label>
                <Input
                  id="secret-key"
                  type={showSecrets ? "text" : "password"}
                  value={iyzicoForm.secretKey}
                  onChange={(e) => setIyzicoForm({ ...iyzicoForm, secretKey: e.target.value })}
                  placeholder={t("settings.secretKeyPlaceholder")}
                  data-testid="input-secret-key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-url">{t("settings.baseUrl")}</Label>
                <Input
                  id="base-url"
                  value={iyzicoForm.baseUrl}
                  onChange={(e) => setIyzicoForm({ ...iyzicoForm, baseUrl: e.target.value })}
                  placeholder="https://api.iyzipay.com"
                  data-testid="input-base-url"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => saveIyzicoMutation.mutate(iyzicoForm)}
                disabled={saveIyzicoMutation.isPending}
                data-testid="button-save-iyzico"
              >
                {saveIyzicoMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {t("settings.productApiTitle")}
              </CardTitle>
              <CardDescription>{t("settings.productApiDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-enabled">{t("settings.enableSync")}</Label>
                <Switch
                  id="sync-enabled"
                  checked={productApiForm.isEnabled}
                  onCheckedChange={(checked) => setProductApiForm({ ...productApiForm, isEnabled: checked })}
                  data-testid="switch-sync-enabled"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint">{t("settings.apiEndpoint")}</Label>
                <Input
                  id="endpoint"
                  value={productApiForm.endpoint}
                  onChange={(e) => setProductApiForm({ ...productApiForm, endpoint: e.target.value })}
                  placeholder="https://api.example.com/products"
                  data-testid="input-endpoint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">{t("settings.httpMethod")}</Label>
                <Input
                  id="method"
                  value={productApiForm.method}
                  onChange={(e) => setProductApiForm({ ...productApiForm, method: e.target.value })}
                  placeholder="GET"
                  data-testid="input-method"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headers">{t("settings.headers")}</Label>
                <Textarea
                  id="headers"
                  value={productApiForm.headers}
                  onChange={(e) => setProductApiForm({ ...productApiForm, headers: e.target.value })}
                  placeholder='{"Authorization": "Bearer token"}'
                  rows={3}
                  data-testid="input-headers"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule">{t("settings.syncSchedule")}</Label>
                <Input
                  id="schedule"
                  value={productApiForm.syncSchedule}
                  onChange={(e) => setProductApiForm({ ...productApiForm, syncSchedule: e.target.value })}
                  placeholder="0 0 * * *"
                  data-testid="input-schedule"
                />
                <p className="text-xs text-muted-foreground">{t("settings.cronHint")}</p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 flex-wrap">
              <Button
                onClick={() => saveProductApiMutation.mutate(productApiForm)}
                disabled={saveProductApiMutation.isPending}
                data-testid="button-save-product-api"
              >
                {saveProductApiMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
              <Button
                variant="outline"
                onClick={() => syncProductsMutation.mutate()}
                disabled={syncProductsMutation.isPending || !productApiForm.isEnabled}
                data-testid="button-sync-products"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncProductsMutation.isPending ? "animate-spin" : ""}`} />
                {t("settings.syncNow")}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t("settings.emailTitle")}
              </CardTitle>
              <CardDescription>{t("settings.emailDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-enabled">{t("settings.enableEmail")}</Label>
                <Switch
                  id="email-enabled"
                  checked={emailForm.isEnabled}
                  onCheckedChange={(checked) => setEmailForm({ ...emailForm, isEnabled: checked })}
                  data-testid="switch-email-enabled"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-host">{t("settings.smtpHost")}</Label>
                <Input
                  id="smtp-host"
                  value={emailForm.smtpHost}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                  placeholder="smtp.example.com"
                  data-testid="input-smtp-host"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">{t("settings.smtpPort")}</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={emailForm.smtpPort}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpPort: parseInt(e.target.value) || 587 })}
                  placeholder="587"
                  data-testid="input-smtp-port"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">{t("settings.smtpUser")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="smtp-user"
                    type={showSecrets ? "text" : "password"}
                    value={emailForm.smtpUser}
                    onChange={(e) => setEmailForm({ ...emailForm, smtpUser: e.target.value })}
                    placeholder={t("settings.smtpUserPlaceholder")}
                    data-testid="input-smtp-user"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecrets(!showSecrets)}
                    data-testid="button-toggle-email-secrets"
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">{t("settings.smtpPass")}</Label>
                <Input
                  id="smtp-pass"
                  type={showSecrets ? "text" : "password"}
                  value={emailForm.smtpPass}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpPass: e.target.value })}
                  placeholder={t("settings.smtpPassPlaceholder")}
                  data-testid="input-smtp-pass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-from">{t("settings.smtpFrom")}</Label>
                <Input
                  id="smtp-from"
                  type="email"
                  value={emailForm.smtpFrom}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpFrom: e.target.value })}
                  placeholder="noreply@example.com"
                  data-testid="input-smtp-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-url">{t("settings.appUrl")}</Label>
                <Input
                  id="app-url"
                  value={emailForm.appUrl}
                  onChange={(e) => setEmailForm({ ...emailForm, appUrl: e.target.value })}
                  placeholder="https://yourapp.com"
                  data-testid="input-app-url"
                />
                <p className="text-xs text-muted-foreground">{t("settings.appUrlHint")}</p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 flex-wrap">
              <Button
                onClick={() => saveEmailMutation.mutate(emailForm)}
                disabled={saveEmailMutation.isPending}
                data-testid="button-save-email"
              >
                {saveEmailMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
              <Button
                variant="outline"
                onClick={() => testEmailMutation.mutate()}
                disabled={testEmailMutation.isPending || !emailForm.isEnabled}
                data-testid="button-test-email"
              >
                <Send className={`h-4 w-4 mr-2 ${testEmailMutation.isPending ? "animate-spin" : ""}`} />
                {t("settings.testEmail")}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={connectorDialogOpen} onOpenChange={setConnectorDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingConnector ? t("settings.editConnector") : t("settings.addConnector")}
            </DialogTitle>
            <DialogDescription>
              {t("settings.connectorDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("settings.connectorName")}</Label>
                  <Input
                    value={connectorForm.name}
                    onChange={(e) => setConnectorForm({ ...connectorForm, name: e.target.value })}
                    placeholder={t("settings.connectorNamePlaceholder")}
                    data-testid="input-connector-name"
                  />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={connectorForm.isEnabled}
                      onCheckedChange={(checked) => setConnectorForm({ ...connectorForm, isEnabled: checked })}
                      data-testid="switch-connector-enabled"
                    />
                    <Label>{t("settings.connectorEnabled")}</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("settings.connectorDescription")}</Label>
                <Input
                  value={connectorForm.description}
                  onChange={(e) => setConnectorForm({ ...connectorForm, description: e.target.value })}
                  placeholder={t("settings.connectorDescriptionPlaceholder")}
                  data-testid="input-connector-description"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t("settings.requestMethod")}</Label>
                  <Select
                    value={connectorForm.requestMethod}
                    onValueChange={(value) => setConnectorForm({ ...connectorForm, requestMethod: value })}
                  >
                    <SelectTrigger data-testid="select-request-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>{t("settings.requestUrl")}</Label>
                  <Input
                    value={connectorForm.requestUrl}
                    onChange={(e) => setConnectorForm({ ...connectorForm, requestUrl: e.target.value })}
                    placeholder="https://api.example.com/products"
                    data-testid="input-request-url"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("settings.requestParams")}</Label>
                  <Button variant="ghost" size="sm" onClick={addParam} data-testid="button-add-param">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("common.add")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("settings.requestParamsHint")}</p>
                <div className="space-y-2">
                  {connectorForm.requestParams.map((param, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={param.key}
                        onChange={(e) => updateParam(index, "key", e.target.value)}
                        placeholder={t("settings.paramKey")}
                        data-testid={`input-param-key-${index}`}
                      />
                      <Input
                        value={param.value}
                        onChange={(e) => updateParam(index, "value", e.target.value)}
                        placeholder={t("settings.paramValue")}
                        data-testid={`input-param-value-${index}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParam(index)}
                        data-testid={`button-remove-param-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {connectorForm.requestMethod !== "GET" && (
                <div className="space-y-2">
                  <Label>{t("settings.requestBody")}</Label>
                  <Textarea
                    value={connectorForm.requestBody}
                    onChange={(e) => setConnectorForm({ ...connectorForm, requestBody: e.target.value })}
                    placeholder='{"query": "{{search}}"}'
                    rows={3}
                    data-testid="input-request-body"
                  />
                  <p className="text-xs text-muted-foreground">{t("settings.requestBodyHint")}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("settings.responseParser")}</Label>
                <Input
                  value={connectorForm.responseParser}
                  onChange={(e) => setConnectorForm({ ...connectorForm, responseParser: e.target.value })}
                  placeholder="$.data.products"
                  data-testid="input-response-parser"
                />
                <p className="text-xs text-muted-foreground">{t("settings.responseParserHint")}</p>
              </div>

              <div className="space-y-2">
                <Label>{t("settings.fieldMappings")}</Label>
                <p className="text-xs text-muted-foreground">{t("settings.fieldMappingsHint")}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">{t("settings.fieldName")}</Label>
                    <Input
                      value={connectorForm.fieldMappings.name}
                      onChange={(e) => setConnectorForm({
                        ...connectorForm,
                        fieldMappings: { ...connectorForm.fieldMappings, name: e.target.value }
                      })}
                      placeholder="name"
                      data-testid="input-field-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t("settings.fieldImage")}</Label>
                    <Input
                      value={connectorForm.fieldMappings.image}
                      onChange={(e) => setConnectorForm({
                        ...connectorForm,
                        fieldMappings: { ...connectorForm.fieldMappings, image: e.target.value }
                      })}
                      placeholder="imageUrl"
                      data-testid="input-field-image"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t("settings.fieldPrice")}</Label>
                    <Input
                      value={connectorForm.fieldMappings.price || ""}
                      onChange={(e) => setConnectorForm({
                        ...connectorForm,
                        fieldMappings: { ...connectorForm.fieldMappings, price: e.target.value }
                      })}
                      placeholder="price"
                      data-testid="input-field-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">{t("settings.fieldSku")}</Label>
                    <Input
                      value={connectorForm.fieldMappings.sku || ""}
                      onChange={(e) => setConnectorForm({
                        ...connectorForm,
                        fieldMappings: { ...connectorForm.fieldMappings, sku: e.target.value }
                      })}
                      placeholder="sku"
                      data-testid="input-field-sku"
                    />
                  </div>
                </div>
              </div>

              {editingConnector && (
                <div className="space-y-2 border-t pt-4">
                  <Label>{t("settings.testConnector")}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      placeholder={t("settings.testQueryPlaceholder")}
                      data-testid="input-test-query"
                    />
                    <Button
                      variant="outline"
                      onClick={() => testConnectorMutation.mutate({ id: editingConnector.id, searchQuery: testQuery })}
                      disabled={testConnectorMutation.isPending}
                      data-testid="button-test-connector"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {t("settings.test")}
                    </Button>
                  </div>
                  {testResults && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-2">{t("settings.testResults")} ({testResults.length})</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {testResults.slice(0, 5).map((product, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {product.imageUrl && (
                              <img src={product.imageUrl} alt="" className="w-8 h-8 object-cover rounded" />
                            )}
                            <span className="truncate">{product.name}</span>
                          </div>
                        ))}
                        {testResults.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{testResults.length - 5} {t("common.more")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectorDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveConnector}
              disabled={createConnectorMutation.isPending || updateConnectorMutation.isPending || !connectorForm.name || !connectorForm.requestUrl}
              data-testid="button-save-connector"
            >
              {(createConnectorMutation.isPending || updateConnectorMutation.isPending) ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
