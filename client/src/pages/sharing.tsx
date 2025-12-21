import { useState, useRef } from "react";
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
  QrCode,
  Loader2
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
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { QRCodeSVG } from "qrcode.react";

const CANVAS_SIZES: Record<string, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1080, height: 566 },
  a4portrait: { width: 794, height: 1123 },
  a4landscape: { width: 1123, height: 794 },
};

export default function SharingPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(useSearch());
  const campaignIdFromUrl = searchParams.get("campaign");
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaignIdFromUrl || "");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<"png" | "svg" | "qr-png" | "qr-svg" | null>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);

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

  const downloadCampaignAsImages = async (format: "png" | "svg") => {
    if (!selectedCampaign) return;
    
    setDownloading(format);
    try {
      // Fetch the campaign with all details
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}`);
      const campaignData = await response.json();
      
      const canvasData = campaignData.canvasData || {};
      const totalPages = canvasData.totalPages || 1;
      const canvasSize = canvasData.canvasSize || "a4portrait";
      const sizeDims = CANVAS_SIZES[canvasSize] || CANVAS_SIZES.a4portrait;

      if (totalPages === 1) {
        // Single page: download directly
        const canvas = document.createElement("canvas");
        canvas.width = sizeDims.width;
        canvas.height = sizeDims.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (format === "png") {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${selectedCampaign.name}-page-1.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast({
                title: t("common.success"),
                description: `Downloaded page 1 as PNG`,
              });
            }
          });
        } else {
          // SVG format
          const svgContent = `<svg width="${sizeDims.width}" height="${sizeDims.height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${sizeDims.width}" height="${sizeDims.height}" fill="white"/>
          </svg>`;
          const blob = new Blob([svgContent], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${selectedCampaign.name}-page-1.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast({
            title: t("common.success"),
            description: `Downloaded page 1 as SVG`,
          });
        }
      } else {
        // Multiple pages: create ZIP
        const zip = new JSZip();

        for (let page = 1; page <= totalPages; page++) {
          const canvas = document.createElement("canvas");
          canvas.width = sizeDims.width;
          canvas.height = sizeDims.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not get canvas context");

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const imageData = canvas.toDataURL("image/png");
          const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
          const filename = `page-${page}.${format}`;
          zip.file(filename, base64Data, { base64: true });
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedCampaign.name}-pages.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: t("common.success"),
          description: `Downloaded ${totalPages} pages as ZIP`,
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: t("common.error"),
        description: `Failed to download campaign as ${format.toUpperCase()}`,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const downloadQRCode = async (format: "png" | "svg") => {
    if (!shareUrl || !qrCodeRef.current) return;
    
    setDownloading(format === "png" ? "qr-png" : "qr-svg");
    try {
      if (format === "png") {
        const canvas = await html2canvas(qrCodeRef.current, {
          backgroundColor: "#ffffff",
          scale: 2,
        });
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${selectedCampaign?.name || "campaign"}-qr-code.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({
              title: t("common.success"),
              description: "Downloaded QR code as PNG",
            });
          }
        });
      } else {
        const svg = qrCodeRef.current.querySelector("svg");
        if (svg) {
          const svgData = new XMLSerializer().serializeToString(svg);
          const blob = new Blob([svgData], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${selectedCampaign?.name || "campaign"}-qr-code.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast({
            title: t("common.success"),
            description: "Downloaded QR code as SVG",
          });
        }
      }
    } catch (error) {
      console.error("QR download error:", error);
      toast({
        title: t("common.error"),
        description: `Failed to download QR code as ${format.toUpperCase()}`,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
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
                    <Button 
                      variant="outline" 
                      onClick={() => downloadCampaignAsImages("png")}
                      disabled={downloading === "png"}
                      data-testid="button-download-png"
                    >
                      {downloading === "png" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download PNG
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => downloadCampaignAsImages("svg")}
                      disabled={downloading === "svg"}
                      data-testid="button-download-svg"
                    >
                      {downloading === "svg" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download SVG
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
                    <div 
                      ref={qrCodeRef}
                      className="w-48 h-48 bg-white rounded-lg flex items-center justify-center border p-4"
                    >
                      <QRCodeSVG 
                        value={shareUrl} 
                        size={200}
                        level="H"
                        includeMargin={true}
                        data-testid="qr-code-element"
                      />
                    </div>
                    <div className="flex flex-col gap-4 text-center md:text-left">
                      <div>
                        <h4 className="font-medium mb-1">Download QR Code</h4>
                        <p className="text-sm text-muted-foreground">
                          Get a high-resolution QR code for print materials
                        </p>
                      </div>
                      <div className="flex gap-2 justify-center md:justify-start">
                        <Button 
                          variant="outline" 
                          onClick={() => downloadQRCode("png")}
                          disabled={downloading === "qr-png"}
                          data-testid="button-download-qr-png"
                        >
                          {downloading === "qr-png" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          PNG
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => downloadQRCode("svg")}
                          disabled={downloading === "qr-svg"}
                          data-testid="button-download-qr-svg"
                        >
                          {downloading === "qr-svg" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
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
