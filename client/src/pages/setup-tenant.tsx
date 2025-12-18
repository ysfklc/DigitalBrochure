import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Building2, Loader2, Users, Plus, Clock, CheckCircle, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

const joinTenantSchema = z.object({
  tenantCode: z.string().min(1, "Organization code is required").max(20),
  message: z.string().max(500).optional(),
});

type TenantSetupValues = z.infer<typeof tenantSetupSchema>;
type JoinTenantValues = z.infer<typeof joinTenantSchema>;

type SetupMode = "choice" | "create" | "join";

interface JoinRequestWithTenant {
  id: string;
  userId: string;
  tenantId: string;
  status: string;
  message: string | null;
  createdAt: string;
  tenant: { id: string; name: string } | null;
}

export default function SetupTenantPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, updateUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<SetupMode>("choice");

  const createForm = useForm<TenantSetupValues>({
    resolver: zodResolver(tenantSetupSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const joinForm = useForm<JoinTenantValues>({
    resolver: zodResolver(joinTenantSchema),
    defaultValues: {
      tenantCode: "",
      message: "",
    },
  });

  const { data: myJoinRequests, isLoading: isLoadingRequests } = useQuery<JoinRequestWithTenant[]>({
    queryKey: ["/api/join-requests/my"],
  });

  const hasPendingRequest = myJoinRequests?.some(r => r.status === "pending");

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (value: string) => {
    createForm.setValue("name", value);
    const currentSlug = createForm.getValues("slug");
    if (!currentSlug || currentSlug === generateSlug(createForm.getValues("name").slice(0, -1))) {
      createForm.setValue("slug", generateSlug(value));
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

  const joinTenantMutation = useMutation({
    mutationFn: async (data: JoinTenantValues) => {
      const response = await apiRequest("POST", "/api/join-requests", {
        tenantCode: data.tenantCode.toUpperCase(),
        message: data.message || null,
      });
      return response;
    },
    onSuccess: (data: any) => {
      // If immediately approved, update tenantId
      if (data.approved && data.tenantId && user) {
        updateUser({ ...user, tenantId: data.tenantId });
      }
      toast({
        title: t("common.success"),
        description: data.approved 
          ? "You've joined the organization!" 
          : "Join request submitted! The organization admin will review your request.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests/my"] });
      joinForm.reset();
      // Redirect to dashboard after successful join or create
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || "Failed to submit join request",
      });
    },
  });

  const onCreateSubmit = (data: TenantSetupValues) => {
    setupTenantMutation.mutate(data);
  };

  const onJoinSubmit = (data: JoinTenantValues) => {
    joinTenantMutation.mutate(data);
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (mode === "create") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create Your Organization</CardTitle>
            <CardDescription className="text-base">
              Create a new organization to get started. You can invite team members later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
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
                  control={createForm.control}
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

                <div className="flex flex-col gap-2">
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
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("choice")}
                    data-testid="button-back-to-choice"
                  >
                    Back
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join an Organization</CardTitle>
            <CardDescription className="text-base">
              Enter the organization code provided by your admin to request access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...joinForm}>
              <form onSubmit={joinForm.handleSubmit(onJoinSubmit)} className="space-y-4">
                <FormField
                  control={joinForm.control}
                  name="tenantCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          placeholder="ABCD1234"
                          className="uppercase tracking-wider font-mono text-center text-lg"
                          maxLength={20}
                          data-testid="input-tenant-code"
                        />
                      </FormControl>
                      <FormDescription>
                        Ask your organization admin for this code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={joinForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Hi, I'd like to join your organization..."
                          className="resize-none"
                          rows={3}
                          data-testid="input-join-message"
                        />
                      </FormControl>
                      <FormDescription>
                        Include a message for the organization admin
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={joinTenantMutation.isPending}
                    data-testid="button-submit-join-request"
                  >
                    {joinTenantMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Request to Join"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("choice")}
                    data-testid="button-back-to-choice-join"
                  >
                    Back
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to eBrochure</CardTitle>
            <CardDescription className="text-base">
              To get started, create a new organization or join an existing one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer transition-all hover-elevate"
                onClick={() => setMode("create")}
                data-testid="card-create-org"
              >
                <CardContent className="pt-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Create Organization</h3>
                  <p className="text-sm text-muted-foreground">
                    Start fresh with a new organization and invite your team
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover-elevate"
                onClick={() => setMode("join")}
                data-testid="card-join-org"
              >
                <CardContent className="pt-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Join Organization</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter an organization code to request access
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoadingRequests ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : myJoinRequests && myJoinRequests.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Join Requests</CardTitle>
              <CardDescription>
                Track the status of your requests to join organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myJoinRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`join-request-${request.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium" data-testid={`text-org-name-${request.id}`}>
                          {request.tenant?.name || "Unknown Organization"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
              {hasPendingRequest && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Your request is being reviewed. The organization admin will approve or reject it.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
