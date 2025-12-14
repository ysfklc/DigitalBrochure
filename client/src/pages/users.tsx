import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Search, 
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Shield,
  User as UserIcon,
  UserPlus,
  Check,
  X,
  Clock,
  Loader2,
  Copy,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@shared/schema";

interface JoinRequestWithUser {
  id: string;
  userId: string;
  tenantId: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  logoUrl: string | null;
}

const userFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["super_admin", "tenant_admin", "tenant_user"]),
  mobilePhone: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const isAdmin = currentUser?.role === "tenant_admin" || currentUser?.role === "super_admin";

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "tenant_user",
      mobilePhone: "",
    },
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: tenantInfo } = useQuery<TenantInfo>({
    queryKey: ["/api/tenant/current"],
  });

  const { data: joinRequests, isLoading: isLoadingJoinRequests } = useQuery<JoinRequestWithUser[]>({
    queryKey: ["/api/join-requests"],
    enabled: isAdmin,
  });

  const copyTenantCode = () => {
    if (tenantInfo?.code) {
      navigator.clipboard.writeText(tenantInfo.code);
      toast({
        title: t("common.success"),
        description: "Organization code copied to clipboard!",
      });
    }
  };

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/join-requests/${requestId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: t("common.success"),
        description: "Join request approved. User has been added to the organization.",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/join-requests/${requestId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
      toast({
        title: t("common.success"),
        description: "Join request rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      return apiRequest("/api/users/invite", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: t("common.success"),
        description: "Invitation sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("errors.somethingWentWrong"),
        variant: "destructive",
      });
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "default";
      case "tenant_admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return t("users.superAdmin");
      case "tenant_admin":
        return t("users.tenantAdmin");
      default:
        return t("users.tenantUser");
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.reset({
      email: "",
      firstName: "",
      lastName: "",
      role: "tenant_user",
      mobilePhone: "",
    });
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as "tenant_admin" | "tenant_user",
      mobilePhone: user.mobilePhone || "",
    });
    setDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
    toast({
      title: t("common.success"),
      description: "User deleted successfully.",
    });
  };

  const onSubmit = (data: UserFormValues) => {
    createMutation.mutate(data);
  };

  const pendingRequestsCount = joinRequests?.length || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-6 border-b">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {t("users.title")}
        </h1>
        <Button onClick={handleAddUser} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" />
          {t("users.inviteUser")}
        </Button>
      </div>

      {tenantInfo?.code && (
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organization Invite Code</p>
                <p className="font-mono text-lg font-semibold tracking-wider" data-testid="text-tenant-code">
                  {tenantInfo.code}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copyTenantCode} data-testid="button-copy-code">
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this code with new users so they can request to join your organization.
          </p>
        </div>
      )}

      <Tabs defaultValue="users" className="flex-1 flex flex-col">
        <div className="border-b px-6 pt-2">
          <TabsList>
            <TabsTrigger value="users" data-testid="tab-users">
              <UserIcon className="h-4 w-4 mr-2" />
              Team Members
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="requests" data-testid="tab-join-requests">
                <UserPlus className="h-4 w-4 mr-2" />
                Join Requests
                {pendingRequestsCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{pendingRequestsCount}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="users" className="flex-1 flex flex-col m-0">
          <div className="flex items-center gap-4 p-4 border-b">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                <SelectValue placeholder={t("users.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="tenant_admin">{t("users.tenantAdmin")}</SelectItem>
                <SelectItem value="tenant_user">{t("users.tenantUser")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !filteredUsers?.length ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <UserIcon className="h-12 w-12 mb-4" />
                <p>{t("users.noUsers")}</p>
                <Button className="mt-4" onClick={handleAddUser} data-testid="button-first-user">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("users.inviteUser")}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("auth.email")}</TableHead>
                    <TableHead>{t("users.role")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? t("users.active") : t("users.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-user-menu-${user.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("users.editUser")}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("users.deleteUser")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="requests" className="flex-1 overflow-auto p-6 m-0">
            {isLoadingJoinRequests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !joinRequests?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-1">No pending requests</h3>
                  <p className="text-muted-foreground text-sm text-center">
                    When someone requests to join your organization, it will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pending Join Requests</CardTitle>
                    <CardDescription>
                      Review and approve or reject requests from users who want to join your organization.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {joinRequests.map((request) => (
                        <div 
                          key={request.id} 
                          className="flex items-start justify-between p-4 rounded-md border bg-card"
                          data-testid={`join-request-admin-${request.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {request.user?.firstName?.[0]}{request.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {request.user?.firstName} {request.user?.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {request.user?.email}
                              </p>
                              {request.message && (
                                <p className="text-sm mt-2 text-muted-foreground italic">
                                  "{request.message}"
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Requested {new Date(request.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMutation.mutate(request.id)}
                              disabled={rejectMutation.isPending || approveMutation.isPending}
                              data-testid={`button-reject-${request.id}`}
                            >
                              {rejectMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(request.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              data-testid={`button-approve-${request.id}`}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t("users.editUser") : t("users.inviteUser")}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user information"
                : "Send an invitation to add a new team member"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.firstName")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-user-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.lastName")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-user-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.email")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        disabled={!!editingUser}
                        data-testid="input-user-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.role")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currentUser?.role === "super_admin" && (
                          <SelectItem value="super_admin">{t("users.superAdmin")}</SelectItem>
                        )}
                        <SelectItem value="tenant_admin">{t("users.tenantAdmin")}</SelectItem>
                        <SelectItem value="tenant_user">{t("users.tenantUser")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobilePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.mobilePhone")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-user-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-user">
                  {createMutation.isPending
                    ? t("common.loading")
                    : editingUser
                    ? t("common.update")
                    : t("users.inviteUser")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.deleteUser")}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="button-confirm-delete">
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
