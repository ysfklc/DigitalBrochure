import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<{ userId: string; totpRequired: boolean } | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (data: any) => {
      if (data.requiresTotp) {
        setRequires2FA(true);
        setPendingLoginData({ userId: data.userId, totpRequired: true });
      } else {
        login(data.user, data.token);
        toast({
          title: t("common.success"),
          description: t("auth.login") + " " + t("common.success").toLowerCase(),
        });
        setLocation("/dashboard");
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("auth.invalidCredentials"),
      });
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  if (requires2FA && pendingLoginData) {
    return (
      <TwoFactorVerification
        userId={pendingLoginData.userId}
        onSuccess={(user, token) => {
          login(user, token);
          setLocation("/dashboard");
        }}
        onCancel={() => {
          setRequires2FA(false);
          setPendingLoginData(null);
        }}
      />
    );
  }

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
            {t("app.tagline")}
          </h1>
          <p className="text-white/80 text-lg">
            Create professional digital brochures and promotional posters with our intuitive canvas editor.
          </p>
        </div>
        <div className="relative z-10">
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex-1">
              <div className="text-3xl font-bold text-white">1000+</div>
              <div className="text-white/70 text-sm">Templates</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex-1">
              <div className="text-3xl font-bold text-white">50K+</div>
              <div className="text-white/70 text-sm">Users</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex-1">
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-white/70 text-sm">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex justify-end items-center gap-2 p-4">
          <LanguageSelector />
          <ThemeToggle />
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center lg:hidden mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                  eB
                </div>
              </div>
              <CardTitle className="text-2xl font-semibold">{t("auth.login")}</CardTitle>
              <CardDescription>
                {t("auth.noAccount")}{" "}
                <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                  {t("auth.signUp")}
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.email")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="name@example.com"
                              className="pl-10"
                              data-testid="input-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.password")}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pl-10 pr-10"
                              data-testid="input-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-remember"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            {t("auth.rememberMe")}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <Link
                      href="/reset-password"
                      className="text-sm text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("auth.signIn")
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TwoFactorVerification({ 
  userId, 
  onSuccess, 
  onCancel 
}: { 
  userId: string; 
  onSuccess: (user: any, token: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async (data: { userId: string; token: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-2fa", data);
      return response;
    },
    onSuccess: (data: any) => {
      onSuccess(data.user, data.token);
      toast({
        title: t("common.success"),
        description: t("auth.login") + " " + t("common.success").toLowerCase(),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "Invalid verification code",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      verifyMutation.mutate({ userId, token: code });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("auth.twoFactor")}</CardTitle>
          <CardDescription>{t("auth.enterCode")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono w-48"
                maxLength={6}
                data-testid="input-2fa-code"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                data-testid="button-cancel-2fa"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={code.length !== 6 || verifyMutation.isPending}
                data-testid="button-verify-2fa"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("auth.verifyCode")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
