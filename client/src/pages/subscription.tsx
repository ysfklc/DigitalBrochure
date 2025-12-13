import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Check, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const plans = [
  {
    id: "monthly",
    price: 300,
    period: 1,
    popular: false,
    bestValue: false,
  },
  {
    id: "six_month",
    price: 250,
    period: 6,
    popular: true,
    bestValue: false,
  },
  {
    id: "yearly",
    price: 200,
    period: 12,
    popular: false,
    bestValue: true,
  },
];

const features = [
  "unlimitedCampaigns",
  "allTemplates",
  "prioritySupport",
  "teamMembers",
  "analytics",
  "socialIntegration",
];

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const subscribeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("POST", "/api/subscription/create", { plan });
      return response;
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: "Subscription activated successfully!",
      });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("errors.somethingWentWrong"),
      });
    },
  });

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    subscribeMutation.mutate(planId);
  };

  const getPlanName = (id: string) => {
    switch (id) {
      case "monthly":
        return t("subscription.monthly");
      case "six_month":
        return t("subscription.sixMonth");
      case "yearly":
        return t("subscription.yearly");
      default:
        return id;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex justify-end items-center gap-2 p-4">
        <LanguageSelector />
        <ThemeToggle />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-2xl">
              eB
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">{t("subscription.title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subscription.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1">{t("subscription.popular")}</Badge>
                </div>
              )}
              {plan.bestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary" className="px-3 py-1">
                    {t("subscription.bestValue")}
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-xl">{getPlanName(plan.id)}</CardTitle>
                <CardDescription>
                  {plan.period === 1 ? "Billed monthly" : `Billed every ${plan.period} months`}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">€{plan.price}</span>
                  <span className="text-muted-foreground">{t("subscription.perMonth")}</span>
                </div>
                {plan.period > 1 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Total: €{plan.price * plan.period}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">
                        {t(`subscription.features.${feature}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={subscribeMutation.isPending && selectedPlan === plan.id}
                  data-testid={`button-select-${plan.id}`}
                >
                  {subscribeMutation.isPending && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      {t("subscription.selectPlan")}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Payment will be processed securely through our payment provider.
        </p>
      </div>
    </div>
  );
}
