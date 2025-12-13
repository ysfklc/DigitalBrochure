import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
import { Shield, Loader2, CheckCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Setup2FAPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { login } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);

  const params = new URLSearchParams(searchString);
  const userId = params.get("userId");

  const { data: totpData, isLoading: isLoadingTotp } = useQuery({
    queryKey: [`/api/auth/setup-2fa?userId=${userId}`],
    enabled: !!userId,
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: { userId: string; token: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-2fa-setup", data);
      return response;
    },
    onSuccess: (data: any) => {
      setSetupComplete(true);
      setTimeout(() => {
        login(data.user, data.token);
        setLocation("/subscription");
      }, 2000);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "Invalid verification code. Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6 && userId) {
      verifyMutation.mutate({ userId, token: code });
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Request</CardTitle>
            <CardDescription>
              This page requires a valid user ID. Please try logging in again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setLocation("/login")}
              data-testid="button-back-to-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">2FA Setup Complete</CardTitle>
            <CardDescription>
              Your account is now protected with two-factor authentication.
              Redirecting to subscription selection...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("auth.setupTotp")}</CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingTotp ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : totpData ? (
            <>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={totpData.otpauthUrl || ""}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Or enter this code manually:
                </p>
                <code className="px-3 py-2 bg-muted rounded-md text-sm font-mono tracking-wider">
                  {totpData.secret}
                </code>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-center">
                    {t("auth.enterCode")}
                  </label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    data-testid="input-2fa-code"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={code.length !== 6 || verifyMutation.isPending}
                  data-testid="button-verify-2fa"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    t("auth.verifyCode")
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              Failed to load 2FA setup. Please try again.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
