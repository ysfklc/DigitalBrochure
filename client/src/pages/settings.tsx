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
import { CreditCard, Database, RefreshCw, Eye, EyeOff, Mail, Send } from "lucide-react";

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

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);

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

      <Tabs defaultValue="payment" className="space-y-6">
        <TabsList>
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
    </div>
  );
}
