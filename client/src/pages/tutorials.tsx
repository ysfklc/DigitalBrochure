import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { 
  PlayCircle, 
  FileText, 
  Bell, 
  ExternalLink,
  Download,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tutorial } from "@shared/schema";

export default function TutorialsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"video" | "pdf" | "announcement">("video");

  const { data: tutorials, isLoading } = useQuery<Tutorial[]>({
    queryKey: ["/api/tutorials"],
  });

  const filteredTutorials = tutorials?.filter((tutorial) => tutorial.type === activeTab);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <PlayCircle className="h-5 w-5" />;
      case "pdf":
        return <FileText className="h-5 w-5" />;
      case "announcement":
        return <Bell className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const renderVideoTutorial = (tutorial: Tutorial) => (
    <Card key={tutorial.id} className="overflow-hidden" data-testid={`card-tutorial-${tutorial.id}`}>
      <CardHeader className="p-0 relative">
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          {tutorial.thumbnailUrl ? (
            <img
              src={tutorial.thumbnailUrl}
              alt={tutorial.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <PlayCircle className="h-16 w-16 text-muted-foreground" />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <PlayCircle className="h-16 w-16 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-medium line-clamp-2" data-testid={`text-tutorial-title-${tutorial.id}`}>
          {tutorial.title}
        </h3>
        {tutorial.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {tutorial.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDate(tutorial.createdAt)}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" asChild data-testid={`button-watch-${tutorial.id}`}>
          <a href={tutorial.contentUrl || "#"} target="_blank" rel="noopener noreferrer">
            <PlayCircle className="h-4 w-4 mr-2" />
            {t("tutorials.watch")}
          </a>
        </Button>
      </CardFooter>
    </Card>
  );

  const renderPdfTutorial = (tutorial: Tutorial) => (
    <Card key={tutorial.id} data-testid={`card-tutorial-${tutorial.id}`}>
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium line-clamp-1" data-testid={`text-tutorial-title-${tutorial.id}`}>
            {tutorial.title}
          </h3>
          {tutorial.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {tutorial.description}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDate(tutorial.createdAt)}</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" className="flex-1" asChild data-testid={`button-view-${tutorial.id}`}>
          <a href={tutorial.contentUrl || "#"} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            {t("common.view")}
          </a>
        </Button>
        <Button className="flex-1" asChild data-testid={`button-download-${tutorial.id}`}>
          <a href={tutorial.contentUrl || "#"} download>
            <Download className="h-4 w-4 mr-2" />
            {t("tutorials.download")}
          </a>
        </Button>
      </CardFooter>
    </Card>
  );

  const renderAnnouncement = (tutorial: Tutorial) => (
    <Card key={tutorial.id} data-testid={`card-tutorial-${tutorial.id}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Bell className="h-3 w-3 mr-1" />
            Announcement
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDate(tutorial.createdAt)}</span>
        </div>
        <h3 className="font-medium text-lg" data-testid={`text-tutorial-title-${tutorial.id}`}>
          {tutorial.title}
        </h3>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{tutorial.description}</p>
      </CardContent>
      {tutorial.contentUrl && (
        <CardFooter>
          <Button variant="outline" asChild data-testid={`button-read-more-${tutorial.id}`}>
            <a href={tutorial.contentUrl} target="_blank" rel="noopener noreferrer">
              {t("tutorials.readMore")}
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  const renderTutorials = () => {
    if (isLoading) {
      return (
        <div className={activeTab === "video" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "grid grid-cols-1 md:grid-cols-2 gap-6"
        }>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className={activeTab === "video" ? "p-0" : ""}>
                {activeTab === "video" ? (
                  <Skeleton className="aspect-video w-full" />
                ) : (
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                )}
              </CardHeader>
              {activeTab === "video" && (
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      );
    }

    if (!filteredTutorials?.length) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          {getTypeIcon(activeTab)}
          <p className="mt-4">{t("tutorials.noTutorials")}</p>
        </div>
      );
    }

    if (activeTab === "video") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map(renderVideoTutorial)}
        </div>
      );
    }

    if (activeTab === "pdf") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTutorials.map(renderPdfTutorial)}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredTutorials.map(renderAnnouncement)}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-6 border-b">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {t("tutorials.title")}
        </h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "video" | "pdf" | "announcement")}>
          <TabsList className="mb-6">
            <TabsTrigger value="video" data-testid="tab-videos">
              <PlayCircle className="h-4 w-4 mr-2" />
              {t("tutorials.videos")}
            </TabsTrigger>
            <TabsTrigger value="pdf" data-testid="tab-documents">
              <FileText className="h-4 w-4 mr-2" />
              {t("tutorials.documents")}
            </TabsTrigger>
            <TabsTrigger value="announcement" data-testid="tab-announcements">
              <Bell className="h-4 w-4 mr-2" />
              {t("tutorials.announcements")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {renderTutorials()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
