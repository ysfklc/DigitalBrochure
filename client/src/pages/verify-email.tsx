import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useSearch } from "wouter";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/verify-email", token],
    queryFn: async () => {
      if (!token) {
        throw new Error("No verification token provided");
      }
      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data?.verified) {
      setVerificationStatus("success");
    } else if (error) {
      setVerificationStatus("error");
      setErrorMessage((error as Error).message);
    } else if (!token) {
      setVerificationStatus("error");
      setErrorMessage("No verification token provided");
    }
  }, [data, error, token]);

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-primary/90 to-primary/70 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptLTYtNnY2aC02di02aDZ6bTEyLTZ2Nmg2di02aC02em0tNiAwdi02aDZ2Nmg2djZoLTZ2NmgtNnYtNmgtNnYtNmg2em0tMTIgMHY2aC02di02aDZ6bTAgMTJ2LTZoNnY2aC02em0xMiAxMnYtNmg2djZoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-xl backdrop-blur-sm">
              eB
            </div>
            <span className="text-white font-bold text-2xl">{t("app.name")}</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Email Verification
          </h1>
          <p className="text-white/80 text-lg">
            Verify your email address to activate your account and start creating professional digital brochures.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex justify-end items-center gap-2 p-4">
          <LanguageSelector />
          <ThemeToggle />
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {isLoading ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : verificationStatus === "success" ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                )}
              </div>
              <CardTitle className="text-2xl font-semibold">
                {isLoading ? "Verifying Email..." : verificationStatus === "success" ? "Email Verified" : "Verification Failed"}
              </CardTitle>
              <CardDescription>
                {isLoading 
                  ? "Please wait while we verify your email address."
                  : verificationStatus === "success"
                  ? "Your email has been verified successfully. You can now log in to your account."
                  : errorMessage
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isLoading && (
                <Link href="/login" className="block">
                  <Button className="w-full" data-testid="button-go-to-login">
                    {verificationStatus === "success" ? "Go to Login" : "Back to Login"}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
