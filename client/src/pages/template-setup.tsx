import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Plus, Upload, ChevronRight, Bold, Italic, Underline, Strikethrough } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PriceTagTemplate } from "@shared/schema";

const AVAILABLE_FONTS = [
  "Algerian",
  "Arial",
  "Arial Black",
  "Arial Unicode MS",
  "Baskerville Old Face",
  "Bauhaus 93",
  "Batang",
  "Bell MT",
  "Berlin Sans FB",
  "Bernard MT Condensed",
  "Bodoni MT",
  "Book Antiqua",
  "Bookman Old Style",
  "Bradley Hand ITC",
  "Broadway",
  "Brush Script MT",
  "Calibri",
  "Californian FB",
  "Cambria",
  "Candara",
  "Castellar",
  "Century",
  "Century Gothic",
  "Century Schoolbook",
  "Chiller",
  "Colonna MT",
  "Comic Sans MS",
  "Consolas",
  "Constantia",
  "Cooper Black",
  "Corbel",
  "Courier New",
  "Curlz MT",
  "Dancing Script",
  "Edwardian Script ITC",
  "Elephant",
  "Engravers MT",
  "Eras Bold ITC",
  "Eras Demi ITC",
  "Eras Light ITC",
  "Eras Medium ITC",
  "Felix Titling",
  "Fira Code",
  "Footlight MT Light",
  "Forte",
  "Franklin Gothic Medium",
  "Freestyle Script",
  "French Script MT",
  "Garamond",
  "Georgia",
  "Gill Sans MT",
  "Goudy Old Style",
  "Great Vibes",
  "Gulim",
  "Haettenschweiler",
  "Harlow Solid Italic",
  "Harrington",
  "High Tower Text",
  "Impact",
  "Imprint MT Shadow",
  "Inconsolata",
  "Informal Roman",
  "Inter",
  "JetBrains Mono",
  "Jokerman",
  "Juice ITC",
  "Kristen ITC",
  "Lato",
  "Libre Baskerville",
  "Lobster",
  "Lucida Bright",
  "Lucida Calligraphy",
  "Lucida Console",
  "Lucida Fax",
  "Lucida Handwriting",
  "Lucida Sans",
  "Lucida Sans Typewriter",
  "Lucida Sans Unicode",
  "Magneto",
  "Maiandra GD",
  "Marlett",
  "Matura MT Script Capitals",
  "Merriweather",
  "Microsoft Sans Serif",
  "Mistral",
  "Modern No. 20",
  "Montserrat",
  "Monotype Corsiva",
  "MS Gothic",
  "MS Mincho",
  "MS Sans Serif",
  "MS Serif",
  "Niagara Engraved",
  "Niagara Solid",
  "Nunito",
  "Old English Text MT",
  "Onyx",
  "Open Sans",
  "Pacifico",
  "Palace Script MT",
  "Palatino Linotype",
  "Papyrus",
  "Perpetua",
  "Playbill",
  "Playfair Display",
  "PMingLiU",
  "Poppins",
  "Pristina",
  "Rage Italic",
  "Ravie",
  "Roboto",
  "Rockwell",
  "Segoe Print",
  "Segoe Script",
  "Segoe UI",
  "Showcard Gothic",
  "SimSun",
  "Snap ITC",
  "Source Code Pro",
  "Stencil",
  "Sylfaen",
  "Tahoma",
  "Tempus Sans ITC",
  "Times New Roman",
  "Trebuchet MS",
  "Crimson Text",
  "Tw Cen MT",
  "Verdana",
  "Viner Hand ITC",
  "Vivaldi",
  "Vladimir Script",
  "Webdings",
  "Wingdings",
  "Wingdings 2",
  "Wingdings 3",
];

interface TextConfig {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
}

interface DateConfig {
  fontFamily: string;
  fontSize: number;
  dateFormat: string;
  textColor: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
}

const DATE_FORMATS = [
  { value: "dd/mm/YYYY", label: "dd/mm/YYYY", example: "21/12/2025" },
  { value: "dd/mm", label: "dd/mm", example: "21/12" },
  { value: "mm/dd/YYYY", label: "mm/dd/YYYY", example: "12/21/2025" },
  { value: "mm/dd", label: "mm/dd", example: "12/21" },
  { value: "dd.mm.YYYY", label: "dd.mm.YYYY", example: "21.12.2025" },
  { value: "dd.mm", label: "dd.mm", example: "21.12" },
  { value: "mm.dd.YYYY", label: "mm.dd.YYYY", example: "12.21.2025" },
  { value: "mm.dd", label: "mm.dd", example: "12.21" },
  { value: "YYYY/mm/dd", label: "YYYY/mm/dd", example: "2025/12/21" },
  { value: "YYYY/mm", label: "YYYY/mm", example: "2025/12" },
];

interface TemplateFormData {
  title: string;
  type: "single_page" | "multi_page";
  labelTemplateId?: string;
  backgroundImageUrl?: string;
  coverPageImageUrl?: string;
  middlePageImageUrl?: string;
  finalPageImageUrl?: string;
  productTitleConfig: TextConfig;
  labelTextConfig: TextConfig;
  originalPriceConfig: TextConfig;
  discountedPriceConfig: TextConfig;
  unitOfMeasureConfig: TextConfig;
  dateTextConfig: DateConfig;
}

interface TemplateFormFiles {
  backgroundImage?: File;
  coverPageImage?: File;
  middlePageImage?: File;
  finalPageImage?: File;
  labelImage?: File;
}

const DEFAULT_TEXT_CONFIG: TextConfig = {
  fontFamily: "Inter",
  fontSize: 16,
  textColor: "#000000",
  fontWeight: "normal",
  fontStyle: "normal",
  textDecoration: "none",
};

export default function TemplateSetupPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"type-select" | "basic-info" | "images" | "styling" | "label">("type-select");
  const [templateType, setTemplateType] = useState<"single_page" | "multi_page" | null>(null);

  const [formData, setFormData] = useState<TemplateFormData>({
    title: "",
    type: "single_page",
    productTitleConfig: DEFAULT_TEXT_CONFIG,
    labelTextConfig: DEFAULT_TEXT_CONFIG,
    originalPriceConfig: { ...DEFAULT_TEXT_CONFIG, textDecoration: "line-through" },
    discountedPriceConfig: { ...DEFAULT_TEXT_CONFIG, textColor: "#dc2626", fontWeight: "bold" },
    unitOfMeasureConfig: DEFAULT_TEXT_CONFIG,
    dateTextConfig: { fontFamily: "Inter", fontSize: 12, dateFormat: "dd/mm/YYYY", textColor: "#000000", fontWeight: "normal", fontStyle: "normal", textDecoration: "none" },
  });

  const [files, setFiles] = useState<TemplateFormFiles>({});
  const backgroundImageInputRef = useRef<HTMLInputElement>(null);
  const coverPageImageInputRef = useRef<HTMLInputElement>(null);
  const middlePageImageInputRef = useRef<HTMLInputElement>(null);
  const finalPageImageInputRef = useRef<HTMLInputElement>(null);
  const labelImageInputRef = useRef<HTMLInputElement>(null);

  const { data: labelTemplates } = useQuery<PriceTagTemplate[]>({
    queryKey: ["/api/price-tag-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const formDataObj = new FormData();
      formDataObj.append("title", formData.title);
      formDataObj.append("type", formData.type);
      if (formData.labelTemplateId) {
        formDataObj.append("labelTemplateId", formData.labelTemplateId);
      }
      formDataObj.append("productTitleConfig", JSON.stringify(formData.productTitleConfig));
      formDataObj.append("labelTextConfig", JSON.stringify(formData.labelTextConfig));
      formDataObj.append("originalPriceConfig", JSON.stringify(formData.originalPriceConfig));
      formDataObj.append("discountedPriceConfig", JSON.stringify(formData.discountedPriceConfig));
      formDataObj.append("unitOfMeasureConfig", JSON.stringify(formData.unitOfMeasureConfig));
      formDataObj.append("dateTextConfig", JSON.stringify(formData.dateTextConfig));
      
      // Append files if they exist
      if (files.backgroundImage) {
        formDataObj.append("backgroundImage", files.backgroundImage);
      }
      if (files.coverPageImage) {
        formDataObj.append("coverPageImage", files.coverPageImage);
      }
      if (files.middlePageImage) {
        formDataObj.append("middlePageImage", files.middlePageImage);
      }
      if (files.finalPageImage) {
        formDataObj.append("finalPageImage", files.finalPageImage);
      }
      if (files.labelImage) {
        formDataObj.append("labelImage", files.labelImage);
      }
      
      return apiRequest("POST", "/api/templates/setup", formDataObj) as Promise<{ id: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: t("common.success"), description: t("templates.savedSuccessfully") });
      setLocation(`/templates/${data.id}/edit`);
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("templates.saveFailed"), variant: "destructive" });
    },
  });

  const handleTypeSelect = (type: "single_page" | "multi_page") => {
    setTemplateType(type);
    setFormData({ ...formData, type });
    setStep("basic-info");
  };

  const handleNextStep = () => {
    if (!formData.title.trim()) {
      toast({ title: t("common.error"), description: "Please enter a template name", variant: "destructive" });
      return;
    }
    setStep("images");
  };

  const handleCreateTemplate = async () => {
    try {
      await createTemplateMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const handleFileChange = (key: keyof TemplateFormFiles, file: File | null) => {
    if (file) {
      setFiles({ ...files, [key]: file });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">{t("templates.createTemplate")}</h1>
          <p className="text-muted-foreground mt-2">Set up your brochure template with custom styling</p>
        </div>

        {step === "type-select" && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="cursor-pointer hover-elevate"
              onClick={() => handleTypeSelect("single_page")}
              data-testid="card-template-type-single"
            >
              <CardHeader>
                <CardTitle>{t("templates.singlePage")}</CardTitle>
                <CardDescription>One template page with background and label</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Perfect for simple brochures with a single background image and configurable text styling.
                </p>
                <Button className="w-full">
                  Select <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover-elevate"
              onClick={() => handleTypeSelect("multi_page")}
              data-testid="card-template-type-multi"
            >
              <CardHeader>
                <CardTitle>{t("templates.multiPage")}</CardTitle>
                <CardDescription>Cover, middle, and final pages</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Multi-page templates with separate designs for cover, middle pages, and final page.
                </p>
                <Button className="w-full">
                  Select <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "basic-info" && (
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
              <CardDescription>Give your template a name</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Summer Sale Brochure"
                  data-testid="input-template-name"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("type-select")}>
                  Back
                </Button>
                <Button onClick={handleNextStep} data-testid="button-next-step">
                  Next: Upload Images
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "images" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Template Images</CardTitle>
              <CardDescription>
                {templateType === "single_page"
                  ? "Upload background and label images"
                  : "Upload cover, middle, and final page images"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {templateType === "single_page" && (
                <>
                  <div>
                    <Label>Background Image</Label>
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50"
                      onClick={() => backgroundImageInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload background image</p>
                      {files.backgroundImage && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-muted-foreground">{files.backgroundImage.name}</p>
                          <img src={URL.createObjectURL(files.backgroundImage)} alt="preview" className="max-h-32 mx-auto rounded" />
                        </div>
                      )}
                      <input
                        ref={backgroundImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange("backgroundImage", e.target.files?.[0] || null)}
                        data-testid="input-background-image"
                      />
                    </div>
                  </div>
                </>
              )}

              {templateType === "multi_page" && (
                <>
                  <div>
                    <Label>Cover Page Image</Label>
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50"
                      onClick={() => coverPageImageInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload cover page</p>
                      {files.coverPageImage && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-muted-foreground">{files.coverPageImage.name}</p>
                          <img src={URL.createObjectURL(files.coverPageImage)} alt="preview" className="max-h-32 mx-auto rounded" />
                        </div>
                      )}
                      <input
                        ref={coverPageImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange("coverPageImage", e.target.files?.[0] || null)}
                        data-testid="input-cover-image"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Middle Page Image</Label>
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50"
                      onClick={() => middlePageImageInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload middle page</p>
                      {files.middlePageImage && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-muted-foreground">{files.middlePageImage.name}</p>
                          <img src={URL.createObjectURL(files.middlePageImage)} alt="preview" className="max-h-32 mx-auto rounded" />
                        </div>
                      )}
                      <input
                        ref={middlePageImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange("middlePageImage", e.target.files?.[0] || null)}
                        data-testid="input-middle-image"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Final Page Image</Label>
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50"
                      onClick={() => finalPageImageInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload final page</p>
                      {files.finalPageImage && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-muted-foreground">{files.finalPageImage.name}</p>
                          <img src={URL.createObjectURL(files.finalPageImage)} alt="preview" className="max-h-32 mx-auto rounded" />
                        </div>
                      )}
                      <input
                        ref={finalPageImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange("finalPageImage", e.target.files?.[0] || null)}
                        data-testid="input-final-image"
                      />
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <Label>Label/Price Tag Image</Label>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50"
                  onClick={() => labelImageInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload label image</p>
                  {files.labelImage && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">{files.labelImage.name}</p>
                      <img src={URL.createObjectURL(files.labelImage)} alt="preview" className="max-h-32 mx-auto rounded" />
                    </div>
                  )}
                  <input
                    ref={labelImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange("labelImage", e.target.files?.[0] || null)}
                    data-testid="input-label-image"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("basic-info")}>
                  Back
                </Button>
                <Button onClick={() => setStep("styling")} data-testid="button-configure-styling">
                  Next: Configure Text Styling
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "styling" && (
          <Card>
            <CardHeader>
              <CardTitle>Text Styling Configuration</CardTitle>
              <CardDescription>Configure fonts, sizes, and colors for each text element</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="product-title" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="product-title">Product Title</TabsTrigger>
                  <TabsTrigger value="label-text">Label Text</TabsTrigger>
                  <TabsTrigger value="price">Price</TabsTrigger>
                  <TabsTrigger value="unit">Unit</TabsTrigger>
                  <TabsTrigger value="date">Date</TabsTrigger>
                </TabsList>

                <TabsContent value="product-title" className="space-y-4">
                  <StyleConfigForm
                    config={formData.productTitleConfig}
                    onChange={(config) => setFormData({ ...formData, productTitleConfig: config })}
                    includeColor
                    previewText="Product Name"
                  />
                </TabsContent>

                <TabsContent value="label-text" className="space-y-4">
                  <StyleConfigForm
                    config={formData.labelTextConfig}
                    onChange={(config) => setFormData({ ...formData, labelTextConfig: config })}
                    includeColor
                    previewText="Special Offer"
                  />
                </TabsContent>

                <TabsContent value="price" className="space-y-4">
                  {/* Price Preview on Label Image */}
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <Label className="text-xs text-muted-foreground mb-2 block">Live Preview on Label</Label>
                    <div 
                      className="relative bg-background rounded border min-h-[120px] flex items-center justify-center overflow-hidden"
                      data-testid="price-label-preview"
                    >
                      {files.labelImage ? (
                        <div className="relative w-full h-32">
                          <img 
                            src={URL.createObjectURL(files.labelImage)} 
                            alt="Label preview" 
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <span
                              style={{
                                fontFamily: formData.originalPriceConfig.fontFamily,
                                fontSize: `${Math.min(formData.originalPriceConfig.fontSize, 24)}px`,
                                color: formData.originalPriceConfig.textColor,
                                fontWeight: formData.originalPriceConfig.fontWeight === "bold" ? "bold" : "normal",
                                fontStyle: formData.originalPriceConfig.fontStyle === "italic" ? "italic" : "normal",
                                textDecoration: formData.originalPriceConfig.textDecoration === "underline" ? "underline" : formData.originalPriceConfig.textDecoration === "line-through" ? "line-through" : "none",
                              }}
                            >
                              $129.99
                            </span>
                            <span
                              style={{
                                fontFamily: formData.discountedPriceConfig.fontFamily,
                                fontSize: `${Math.min(formData.discountedPriceConfig.fontSize, 32)}px`,
                                color: formData.discountedPriceConfig.textColor,
                                fontWeight: formData.discountedPriceConfig.fontWeight === "bold" ? "bold" : "normal",
                                fontStyle: formData.discountedPriceConfig.fontStyle === "italic" ? "italic" : "normal",
                                textDecoration: formData.discountedPriceConfig.textDecoration === "underline" ? "underline" : formData.discountedPriceConfig.textDecoration === "line-through" ? "line-through" : "none",
                              }}
                            >
                              $99.99
                            </span>
                            <span
                              style={{
                                fontFamily: formData.unitOfMeasureConfig.fontFamily,
                                fontSize: `${Math.min(formData.unitOfMeasureConfig.fontSize, 14)}px`,
                                color: formData.unitOfMeasureConfig.textColor,
                                fontWeight: formData.unitOfMeasureConfig.fontWeight === "bold" ? "bold" : "normal",
                                fontStyle: formData.unitOfMeasureConfig.fontStyle === "italic" ? "italic" : "normal",
                              }}
                            >
                              per kg
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 p-4">
                          <span className="text-muted-foreground text-sm mb-2">Upload a label image to see preview</span>
                          <span
                            style={{
                              fontFamily: formData.originalPriceConfig.fontFamily,
                              fontSize: `${Math.min(formData.originalPriceConfig.fontSize, 24)}px`,
                              color: formData.originalPriceConfig.textColor,
                              fontWeight: formData.originalPriceConfig.fontWeight === "bold" ? "bold" : "normal",
                              fontStyle: formData.originalPriceConfig.fontStyle === "italic" ? "italic" : "normal",
                              textDecoration: formData.originalPriceConfig.textDecoration === "underline" ? "underline" : formData.originalPriceConfig.textDecoration === "line-through" ? "line-through" : "none",
                            }}
                          >
                            $129.99
                          </span>
                          <span
                            style={{
                              fontFamily: formData.discountedPriceConfig.fontFamily,
                              fontSize: `${Math.min(formData.discountedPriceConfig.fontSize, 32)}px`,
                              color: formData.discountedPriceConfig.textColor,
                              fontWeight: formData.discountedPriceConfig.fontWeight === "bold" ? "bold" : "normal",
                              fontStyle: formData.discountedPriceConfig.fontStyle === "italic" ? "italic" : "normal",
                              textDecoration: formData.discountedPriceConfig.textDecoration === "underline" ? "underline" : formData.discountedPriceConfig.textDecoration === "line-through" ? "line-through" : "none",
                            }}
                          >
                            $99.99
                          </span>
                          <span
                            style={{
                              fontFamily: formData.unitOfMeasureConfig.fontFamily,
                              fontSize: `${Math.min(formData.unitOfMeasureConfig.fontSize, 14)}px`,
                              color: formData.unitOfMeasureConfig.textColor,
                              fontWeight: formData.unitOfMeasureConfig.fontWeight === "bold" ? "bold" : "normal",
                              fontStyle: formData.unitOfMeasureConfig.fontStyle === "italic" ? "italic" : "normal",
                            }}
                          >
                            per kg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        Original Price
                        <Badge variant="secondary" className="text-xs">Strikethrough recommended</Badge>
                      </h4>
                      <StyleConfigForm
                        config={formData.originalPriceConfig}
                        onChange={(config) => setFormData({ ...formData, originalPriceConfig: config })}
                        includeColor
                        previewText="$129.99"
                      />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        Discounted Price
                        <Badge variant="secondary" className="text-xs">Highlighted</Badge>
                      </h4>
                      <StyleConfigForm
                        config={formData.discountedPriceConfig}
                        onChange={(config) => setFormData({ ...formData, discountedPriceConfig: config })}
                        includeColor
                        previewText="$99.99"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="unit" className="space-y-4">
                  <StyleConfigForm
                    config={formData.unitOfMeasureConfig}
                    onChange={(config) => setFormData({ ...formData, unitOfMeasureConfig: config })}
                    includeColor
                    previewText="per kg"
                  />
                </TabsContent>

                <TabsContent value="date" className="space-y-4">
                  <DateStyleConfigForm
                    config={formData.dateTextConfig}
                    onChange={(config) => setFormData({ ...formData, dateTextConfig: config })}
                  />
                </TabsContent>
              </Tabs>

              <Separator className="my-6" />

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("images")}>
                  Back
                </Button>
                <Button onClick={() => setStep("label")} data-testid="button-select-label-template">
                  Next: Select Label Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "label" && (
          <Card>
            <CardHeader>
              <CardTitle>Associate Label Template</CardTitle>
              <CardDescription>Select an existing label/price tag template or create a new one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {labelTemplates && labelTemplates.length > 0 && (
                <div>
                  <Label>Available Label Templates</Label>
                  <ScrollArea className="border rounded-lg p-4 h-64">
                    <div className="space-y-2">
                      {labelTemplates.map((template) => (
                        <Button
                          key={template.id}
                          variant={formData.labelTemplateId === template.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setFormData({ ...formData, labelTemplateId: template.id })}
                          data-testid={`button-select-label-${template.id}`}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("styling")}>
                  Back
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={createTemplateMutation.isPending}
                  data-testid="button-create-template"
                >
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StyleConfigForm({
  config,
  onChange,
  includeColor = true,
  previewText = "Sample Text Preview",
}: {
  config: TextConfig;
  onChange: (config: TextConfig) => void;
  includeColor?: boolean;
  previewText?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-muted/30">
        <Label className="text-xs text-muted-foreground mb-2 block">Live Preview</Label>
        <div 
          className="p-3 bg-background rounded border min-h-[60px] flex items-center justify-center"
          data-testid="text-style-preview"
        >
          <span
            style={{
              fontFamily: config.fontFamily,
              fontSize: `${Math.min(config.fontSize, 48)}px`,
              color: config.textColor,
              fontWeight: config.fontWeight || "normal",
              fontStyle: config.fontStyle || "normal",
              textDecoration: config.textDecoration || "none",
            }}
          >
            {previewText}
          </span>
        </div>
      </div>
      <div>
        <Label>Font Family</Label>
        <Select value={config.fontFamily} onValueChange={(value) => onChange({ ...config, fontFamily: value })}>
          <SelectTrigger data-testid="select-font-family">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_FONTS.map((font) => (
              <SelectItem key={font} value={font}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[120px]">
          <Label>Font Size</Label>
          <Input
            type="number"
            value={config.fontSize}
            onChange={(e) => onChange({ ...config, fontSize: parseInt(e.target.value) })}
            min="8"
            max="100"
            data-testid="input-font-size"
          />
        </div>
        <div>
          <Label>Font Style</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant={config.fontWeight === "bold" ? "default" : "outline"}
              onClick={() => onChange({ ...config, fontWeight: config.fontWeight === "bold" ? "normal" : "bold" })}
              data-testid="button-bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={config.fontStyle === "italic" ? "default" : "outline"}
              onClick={() => onChange({ ...config, fontStyle: config.fontStyle === "italic" ? "normal" : "italic" })}
              data-testid="button-italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={config.textDecoration === "underline" ? "default" : "outline"}
              onClick={() => onChange({ ...config, textDecoration: config.textDecoration === "underline" ? "none" : "underline" })}
              data-testid="button-underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={config.textDecoration === "line-through" ? "default" : "outline"}
              onClick={() => onChange({ ...config, textDecoration: config.textDecoration === "line-through" ? "none" : "line-through" })}
              data-testid="button-strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {includeColor && (
        <div>
          <Label>Text Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={config.textColor}
              onChange={(e) => onChange({ ...config, textColor: e.target.value })}
              className="h-10 w-20 cursor-pointer rounded border"
              data-testid="input-text-color"
            />
            <Input
              value={config.textColor}
              onChange={(e) => onChange({ ...config, textColor: e.target.value })}
              placeholder="#000000"
              className="flex-1"
              data-testid="input-text-color-hex"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DateStyleConfigForm({
  config,
  onChange,
}: {
  config: DateConfig;
  onChange: (config: DateConfig) => void;
}) {
  const getFormattedDatePreview = (format: string) => {
    const formatMap: Record<string, string> = {
      "dd/mm/YYYY": "21/12/2025 - 28/12/2025",
      "dd/mm": "21/12 - 28/12",
      "mm/dd/YYYY": "12/21/2025 - 12/28/2025",
      "mm/dd": "12/21 - 12/28",
      "dd.mm.YYYY": "21.12.2025 - 28.12.2025",
      "dd.mm": "21.12 - 28.12",
      "mm.dd.YYYY": "12.21.2025 - 12.28.2025",
      "mm.dd": "12.21 - 12.28",
      "YYYY/mm/dd": "2025/12/21 - 2025/12/28",
      "YYYY/mm": "2025/12 - 2025/12",
    };
    return formatMap[format] || "21/12/2025 - 28/12/2025";
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-muted/30">
        <Label className="text-xs text-muted-foreground mb-2 block">Live Preview</Label>
        <div 
          className="p-3 bg-background rounded border min-h-[60px] flex items-center justify-center"
          data-testid="date-style-preview"
        >
          <span
            style={{
              fontFamily: config.fontFamily,
              fontSize: `${Math.min(config.fontSize, 48)}px`,
              color: config.textColor,
              fontWeight: config.fontWeight === "bold" ? "bold" : "normal",
              fontStyle: config.fontStyle === "italic" ? "italic" : "normal",
              textDecoration: config.textDecoration === "underline" ? "underline" : config.textDecoration === "line-through" ? "line-through" : "none",
            }}
          >
            {getFormattedDatePreview(config.dateFormat)}
          </span>
        </div>
      </div>
      <div>
        <Label>Date Format</Label>
        <Select value={config.dateFormat} onValueChange={(value) => onChange({ ...config, dateFormat: value })}>
          <SelectTrigger data-testid="select-date-format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map((format) => (
              <SelectItem key={format.value} value={format.value}>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{format.label}</span>
                  <span className="text-muted-foreground text-xs">({format.example})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Font Family</Label>
        <Select value={config.fontFamily} onValueChange={(value) => onChange({ ...config, fontFamily: value })}>
          <SelectTrigger data-testid="select-date-font-family">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_FONTS.map((font) => (
              <SelectItem key={font} value={font}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Font Size</Label>
        <Input
          type="number"
          value={config.fontSize}
          onChange={(e) => onChange({ ...config, fontSize: parseInt(e.target.value) })}
          min="8"
          max="100"
          data-testid="input-date-font-size"
        />
      </div>
      <div>
        <Label>Font Style</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={config.fontWeight === "bold" ? "default" : "outline"}
            size="icon"
            onClick={() => onChange({ ...config, fontWeight: config.fontWeight === "bold" ? "normal" : "bold" })}
            data-testid="button-date-bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={config.fontStyle === "italic" ? "default" : "outline"}
            size="icon"
            onClick={() => onChange({ ...config, fontStyle: config.fontStyle === "italic" ? "normal" : "italic" })}
            data-testid="button-date-italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={config.textDecoration === "underline" ? "default" : "outline"}
            size="icon"
            onClick={() => onChange({ ...config, textDecoration: config.textDecoration === "underline" ? "none" : "underline" })}
            data-testid="button-date-underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={config.textDecoration === "line-through" ? "default" : "outline"}
            size="icon"
            onClick={() => onChange({ ...config, textDecoration: config.textDecoration === "line-through" ? "none" : "line-through" })}
            data-testid="button-date-strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div>
        <Label>Text Color</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={config.textColor}
            onChange={(e) => onChange({ ...config, textColor: e.target.value })}
            className="h-10 w-20 cursor-pointer rounded border"
            data-testid="input-date-text-color"
          />
          <Input
            value={config.textColor}
            onChange={(e) => onChange({ ...config, textColor: e.target.value })}
            placeholder="#000000"
            className="flex-1"
            data-testid="input-date-text-color-hex"
          />
        </div>
      </div>
    </div>
  );
}
