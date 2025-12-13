import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const tenantSetupSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  slug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

type TenantSetupValues = z.infer<typeof tenantSetupSchema>;

export default function SetupTenantPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, updateUser, token } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<TenantSetupValues>({
    resolver: zodResolver(tenantSetupSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const watchName = form.watch("name");

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    const currentSlug = form.getValues("slug");
    if (!currentSlug || currentSlug === generateSlug(form.getValues("name").slice(0, -1))) {
      form.setValue("slug", generateSlug(value));
    }
  };

  const setupTenantMutation = useMutation({
    mutationFn: async (data: TenantSetupValues) => {
      const response = await apiRequest("POST", "/api/tenant/setup", data);
      return response;
    },
    onSuccess: (data: any) => {
      if (user) {
        updateUser({ ...user, tenantId: data.tenant.id });
      }
      toast({
        title: t("common.success"),
        description: "Organization created successfully!",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || "Failed to create organization",
      });
    },
  });

  const onSubmit = (data: TenantSetupValues) => {
    setupTenantMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Organization</CardTitle>
          <CardDescription className="text-base">
            Create your organization to get started. You can invite team members later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Acme Corporation"
                          className="pl-10"
                          data-testid="input-org-name"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="acme-corporation"
                        data-testid="input-org-slug"
                      />
                    </FormControl>
                    <FormDescription>
                      This will be used in your organization's URL
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={setupTenantMutation.isPending}
                data-testid="button-create-org"
              >
                {setupTenantMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Organization"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
