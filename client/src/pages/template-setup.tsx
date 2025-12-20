import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Plus, Upload, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PriceTagTemplate } from "@shared/schema";

const AVAILABLE_FONTS = [
  "Inter",
  "Roboto",
  "Roboto Mono",
  "Open Sans",
  "Lato",
  "Oswald",
  "Playfair Display",
  "Merriweather",
  "Ubuntu",
  "Inconsolata",
  "Droid Sans",
  "Droid Serif",
  "Monaco",
  "Courier New",
  "Georgia",
  "Verdana",
  "Times New Roman",
  "Arial",
  "Helvetica",
  "Comic Sans MS",
];

interface TextConfig {
  fontFamily: string;
  fontSize: number;
  textColor: string;
}

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
  discountedPriceConfig: TextConfig;
  unitOfMeasureConfig: TextConfig;
  dateTextConfig: Pick<TextConfig, "fontFamily" | "fontSize">;
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
    discountedPriceConfig: DEFAULT_TEXT_CONFIG,
    unitOfMeasureConfig: DEFAULT_TEXT_CONFIG,
    dateTextConfig: { fontFamily: "Inter", fontSize: 12 },
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
      
      return apiRequest("POST", "/api/templates/setup", formDataObj);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: t("common.success"), description: t("templates.savedSuccessfully") });
      setLocation("/templates");
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
                      {files.coverPageImage && <p className="text-xs text-muted-foreground mt-2">{files.coverPageImage.name}</p>}
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
                      {files.middlePageImage && <p className="text-xs text-muted-foreground mt-2">{files.middlePageImage.name}</p>}
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
                      {files.finalPageImage && <p className="text-xs text-muted-foreground mt-2">{files.finalPageImage.name}</p>}
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
                  {files.labelImage && <p className="text-xs text-muted-foreground mt-2">{files.labelImage.name}</p>}
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
                  />
                </TabsContent>

                <TabsContent value="label-text" className="space-y-4">
                  <StyleConfigForm
                    config={formData.labelTextConfig}
                    onChange={(config) => setFormData({ ...formData, labelTextConfig: config })}
                    includeColor
                  />
                </TabsContent>

                <TabsContent value="price" className="space-y-4">
                  <StyleConfigForm
                    config={formData.discountedPriceConfig}
                    onChange={(config) => setFormData({ ...formData, discountedPriceConfig: config })}
                    includeColor
                  />
                </TabsContent>

                <TabsContent value="unit" className="space-y-4">
                  <StyleConfigForm
                    config={formData.unitOfMeasureConfig}
                    onChange={(config) => setFormData({ ...formData, unitOfMeasureConfig: config })}
                    includeColor
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
}: {
  config: TextConfig;
  onChange: (config: TextConfig) => void;
  includeColor?: boolean;
}) {
  return (
    <div className="space-y-4">
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
      <div>
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
  config: Pick<TextConfig, "fontFamily" | "fontSize">;
  onChange: (config: Pick<TextConfig, "fontFamily" | "fontSize">) => void;
}) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}
