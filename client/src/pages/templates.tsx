import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FileText, Eye, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Template } from "@shared/schema";

export default function TemplatesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: t("common.success"), description: "Template deleted successfully" });
    },
  });

  const filteredTemplates = templates?.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("templates.title")}</h1>
          <p className="text-muted-foreground">Manage your brochure templates</p>
        </div>
        <Button onClick={() => setLocation("/templates/new")} data-testid="button-add-template">
          <Plus className="mr-2 h-4 w-4" />
          {t("templates.addTemplate")}
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setTypeFilter("all")}>
              All Templates
            </TabsTrigger>
            <TabsTrigger value="single_page" onClick={() => setTypeFilter("single_page")}>
              {t("templates.singlePage")}
            </TabsTrigger>
            <TabsTrigger value="multi_page" onClick={() => setTypeFilter("multi_page")}>
              {t("templates.multiPage")}
            </TabsTrigger>
          </TabsList>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-templates"
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-40 w-full mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("templates.noTemplates")}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first template to get started
                </p>
                <Button onClick={() => setLocation("/templates/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("templates.addTemplate")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTemplates?.map((template) => (
                <Card key={template.id} className="overflow-hidden group" data-testid={`card-template-${template.id}`}>
                  <div
                    className="aspect-[3/4] flex items-center justify-center relative"
                    style={{ backgroundColor: template.backgroundColor || "#f3f4f6" }}
                  >
                    <FileText
                      className="h-16 w-16 opacity-20"
                      style={{ color: template.textColor || "#000" }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="icon" variant="secondary">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="secondary">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{template.title}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {template.type === "single_page"
                            ? t("templates.singlePage")
                            : t("templates.multiPage")}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/templates/${template.id}/edit`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t("templates.preview")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/templates/${template.id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(template.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Font: {template.fontFamily || "Inter"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
