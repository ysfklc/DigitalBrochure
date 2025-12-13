import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Lightbulb, 
  Plus, 
  Clock, 
  CheckCircle, 
  CheckCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Suggestion } from "@shared/schema";

const suggestionFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Description must be at least 10 characters"),
});

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>;

export default function SuggestionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<SuggestionFormValues>({
    resolver: zodResolver(suggestionFormSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const { data: suggestions, isLoading } = useQuery<Suggestion[]>({
    queryKey: ["/api/suggestions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: SuggestionFormValues) => {
      return apiRequest("/api/suggestions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suggestions"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: t("common.success"),
        description: "Your suggestion has been submitted.",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "reviewed":
        return <CheckCircle className="h-4 w-4" />;
      case "implemented":
        return <CheckCheck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "reviewed":
        return "default";
      case "implemented":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const onSubmit = (data: SuggestionFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-6 border-b">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {t("suggestions.title")}
        </h1>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-submit-suggestion">
          <Plus className="h-4 w-4 mr-2" />
          {t("suggestions.submit")}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !suggestions?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mb-4" />
            <p>{t("suggestions.noSuggestions")}</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)} data-testid="button-first-suggestion">
              <Plus className="h-4 w-4 mr-2" />
              {t("suggestions.submit")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} data-testid={`card-suggestion-${suggestion.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" data-testid={`text-suggestion-title-${suggestion.id}`}>
                        {suggestion.title}
                      </CardTitle>
                      <CardDescription>
                        {formatDate(suggestion.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(suggestion.status || "pending")}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(suggestion.status || "pending")}
                        {t(`suggestions.${suggestion.status || "pending"}`)}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-suggestion-content-${suggestion.id}`}>
                    {suggestion.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("suggestions.submit")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suggestions.suggestionTitle")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("suggestions.suggestionTitle")}
                        data-testid="input-suggestion-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("suggestions.suggestionContent")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("suggestions.suggestionContent")}
                        rows={5}
                        className="resize-none"
                        data-testid="input-suggestion-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-confirm-suggestion">
                  {createMutation.isPending ? t("common.loading") : t("common.submit")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
