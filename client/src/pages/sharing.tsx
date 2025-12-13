import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { 
  Share2, 
  Link as LinkIcon, 
  Copy, 
  Check,
  Download,
  ExternalLink,
  QrCode
} from "lucide-react";
import { SiFacebook, SiX, SiWhatsapp, SiLinkedin, SiInstagram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Campaign } from "@shared/schema";

export default function SharingPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(useSearch());
  const campaignIdFromUrl = searchParams.get("campaign");
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaignIdFromUrl || "");
  const [copied, setCopied] = useState(false);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const selectedCampaign = campaigns?.find((c) => c.id === selectedCampaignId);
  const shareUrl = selectedCampaign 
    ? `${window.location.origin}/view/${selectedCampaign.id}` 
    : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: t("common.success"),
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: t("common.error"),
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const socialPlatforms = [
    {
      name: "Facebook",
      icon: SiFacebook,
      color: "bg-[#1877F2] hover:bg-[#1877F2]/90",
      url: (link: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    },
    {
      name: "X (Twitter)",
      icon: SiX,
      color: "bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90",
      url: (link: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`,
    },
    {
      name: "WhatsApp",
      icon: SiWhatsapp,
      color: "bg-[#25D366] hover:bg-[#25D366]/90",
      url: (link: string) => `https://wa.me/?text=${encodeURIComponent(link)}`,
    },
    {
      name: "LinkedIn",
      icon: SiLinkedin,
      color: "bg-[#0A66C2] hover:bg-[#0A66C2]/90",
      url: (link: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-6 border-b">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          {t("nav.sharing")}
        </h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select a Campaign to Share</CardTitle>
              <CardDescription>
                Choose a campaign from your collection to generate shareable links
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedCampaignId}
                  onValueChange={setSelectedCampaignId}
                >
                  <SelectTrigger data-testid="select-campaign">
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.filter(c => c.status === "active" || c.status === "completed").map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center gap-2">
                          <span>{campaign.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {campaign.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {selectedCampaign && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    <CardTitle>Share Link</CardTitle>
                  </div>
                  <CardDescription>
                    Copy this link to share your campaign brochure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-share-url"
                    />
                    <Button onClick={copyToClipboard} data-testid="button-copy-link">
                      {copied ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" asChild data-testid="button-open-link">
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                    <Button variant="outline" data-testid="button-download-pdf">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    <CardTitle>Share on Social Media</CardTitle>
                  </div>
                  <CardDescription>
                    Share your campaign directly to social platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {socialPlatforms.map((platform) => (
                      <Button
                        key={platform.name}
                        className={`${platform.color} text-white`}
                        asChild
                        data-testid={`button-share-${platform.name.toLowerCase().replace(/[^a-z]/g, "")}`}
                      >
                        <a
                          href={platform.url(shareUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <platform.icon className="h-4 w-4 mr-2" />
                          {platform.name}
                        </a>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    <CardTitle>QR Code</CardTitle>
                  </div>
                  <CardDescription>
                    Scan or download the QR code to share your campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border">
                      <QrCode className="h-32 w-32 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-4 text-center md:text-left">
                      <div>
                        <h4 className="font-medium mb-1">Download QR Code</h4>
                        <p className="text-sm text-muted-foreground">
                          Get a high-resolution QR code for print materials
                        </p>
                      </div>
                      <div className="flex gap-2 justify-center md:justify-start">
                        <Button variant="outline" data-testid="button-download-qr-png">
                          <Download className="h-4 w-4 mr-2" />
                          PNG
                        </Button>
                        <Button variant="outline" data-testid="button-download-qr-svg">
                          <Download className="h-4 w-4 mr-2" />
                          SVG
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sharing Statistics</CardTitle>
                  <CardDescription>
                    Track how your campaign is performing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Unique Visitors</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Downloads</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Social Shares</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!selectedCampaign && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Share2 className="h-12 w-12 mb-4" />
              <p className="text-lg">Select a campaign to start sharing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
