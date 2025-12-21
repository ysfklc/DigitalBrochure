import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Campaign } from "@shared/schema";

type CanvasSizeKey = 'square' | 'portrait' | 'landscape' | 'a4portrait' | 'a4landscape';

const CANVAS_SIZES: Record<CanvasSizeKey, { width: number; height: number; label: string; ratio: string }> = {
  square: { width: 1080, height: 1080, label: 'Square', ratio: '1:1' },
  portrait: { width: 1080, height: 1350, label: 'Portrait', ratio: '4:5' },
  landscape: { width: 1080, height: 566, label: 'Landscape', ratio: '1.91:1' },
  a4portrait: { width: 794, height: 1123, label: 'A4 Portrait', ratio: 'A4' },
  a4landscape: { width: 1123, height: 794, label: 'A4 Landscape', ratio: 'A4' },
};

interface CanvasElement {
  id: string;
  type: 'product' | 'text' | 'shape' | 'image' | 'header' | 'footer' | 'date';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  data: any;
  page: number;
}

interface TextElementData {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
}

interface ShapeElementData {
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'line';
  fill: string;
  stroke: string;
  strokeWidth: number;
}

interface DrawingPoint {
  x: number;
  y: number;
}

interface DateElementData {
  format: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
}

// Helper function to format date according to template format
const formatCampaignDate = (date: Date | string | null | undefined, format: string): string => {
  if (!date) return format;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return format;
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD.MM.YYYY':
      return `${day}.${month}.${year}`;
    case 'DD MMM YYYY':
      return `${day} ${monthNames[d.getMonth()]} ${year}`;
    case 'MMMM DD, YYYY':
      return `${monthNamesFull[d.getMonth()]} ${day}, ${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

export default function CampaignViewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [canvasSize, setCanvasSize] = useState<CanvasSizeKey>('a4portrait');
  const [showHeaderZone, setShowHeaderZone] = useState(true);
  const [showFooterZone, setShowFooterZone] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(80);
  const [footerHeight, setFooterHeight] = useState(60);

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: [`/api/campaigns/${id}`],
    enabled: !!id,
  });

  // Fetch template for background image
  const { data: template } = useQuery<any>({
    queryKey: [`/api/templates/${campaign?.templateId}`],
    enabled: !!campaign?.templateId,
  });

  useEffect(() => {
    if (campaign?.canvasData) {
      const data = campaign.canvasData as any;
      if (data.elements) {
        setCanvasElements(data.elements);
      }
      if (data.canvasSize) {
        setCanvasSize(data.canvasSize);
      }
      if (data.totalPages) {
        setTotalPages(data.totalPages);
      }
      if (typeof data.showHeaderZone === 'boolean') {
        setShowHeaderZone(data.showHeaderZone);
      }
      if (typeof data.showFooterZone === 'boolean') {
        setShowFooterZone(data.showFooterZone);
      }
      if (data.headerHeight) {
        setHeaderHeight(data.headerHeight);
      }
      if (data.footerHeight) {
        setFooterHeight(data.footerHeight);
      }
    }
  }, [campaign]);

  const currentPageElements = canvasElements.filter((el) => el.page === currentPage);

  const scale = 0.5;

  const renderElement = (element: CanvasElement) => {
    if (element.type === 'product') {
      const productData = element.data.product || element.data;
      const imageUrl = productData.imageUrl;
      const name = productData.name;
      const price = element.data.campaignPrice || productData.price;
      const discountPrice = element.data.campaignDiscountPrice || productData.discountPrice;
      const unit = productData.unit || 'each';
      
      const priceConfig = (template as any)?.discountedPriceConfig || {};
      const labelTextConfig = (template as any)?.labelTextConfig || {};
      const unitConfig = (template as any)?.unitOfMeasureConfig || {};
      const labelImageUrl = (template as any)?.labelImageUrl;
      
      const labelWidth = Math.max(element.width / 6, 50) * scale;
      const labelHeight = Math.max(element.height / 6, 40) * scale;
      
      return (
        <div className="w-full h-full relative overflow-visible">
          <div className="absolute inset-0 flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted rounded">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {(price || discountPrice) && (
            <div 
              className="absolute flex items-center justify-center rounded-sm overflow-hidden"
              style={{ 
                right: 0,
                bottom: 0,
                width: `${labelWidth}px`,
                height: `${labelHeight}px`,
                backgroundImage: labelImageUrl ? `url(${labelImageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: labelImageUrl ? 'transparent' : 'hsl(var(--primary))',
              }}
            >
              <div className="text-center px-0.5">
                {discountPrice && price && (
                  <p 
                    className="line-through opacity-70"
                    style={{
                      fontFamily: labelTextConfig.fontFamily || 'Inter',
                      fontSize: `${Math.max(8 * scale, 6)}px`,
                      color: labelTextConfig.color || '#ffffff',
                    }}
                  >
                    {campaign?.currency || '₺'}{price}
                  </p>
                )}
                <p 
                  className="font-bold leading-tight"
                  style={{
                    fontFamily: priceConfig.fontFamily || 'Inter',
                    fontSize: `${Math.max(12 * scale, 8)}px`,
                    fontWeight: priceConfig.fontWeight || 'bold',
                    color: priceConfig.color || '#ffffff',
                  }}
                >
                  {campaign?.currency || '₺'}{discountPrice || price}
                </p>
                <p 
                  className="opacity-80"
                  style={{
                    fontFamily: unitConfig.fontFamily || 'Inter',
                    fontSize: `${Math.max(6 * scale, 5)}px`,
                    color: unitConfig.color || '#ffffff',
                  }}
                >
                  /{unit}
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (element.type === 'text') {
      const textData = element.data as TextElementData;
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontFamily: textData.fontFamily,
            fontSize: `${textData.fontSize * scale}px`,
            fontWeight: textData.fontWeight,
            fontStyle: textData.fontStyle,
            textDecoration: textData.textDecoration,
            textAlign: textData.textAlign,
            color: textData.color,
            backgroundColor: textData.backgroundColor === 'transparent' ? 'transparent' : textData.backgroundColor,
          }}
        >
          <span className="w-full px-1">{textData.text}</span>
        </div>
      );
    }
    
    if (element.type === 'shape') {
      const shapeData = element.data as ShapeElementData;
      
      if (shapeData.shapeType === 'rectangle') {
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: shapeData.fill,
              border: `${shapeData.strokeWidth}px solid ${shapeData.stroke}`,
              borderRadius: '4px',
            }}
          />
        );
      }
      
      if (shapeData.shapeType === 'circle') {
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: shapeData.fill,
              border: `${shapeData.strokeWidth}px solid ${shapeData.stroke}`,
            }}
          />
        );
      }
      
      if (shapeData.shapeType === 'triangle') {
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon
              points="50,5 95,95 5,95"
              fill={shapeData.fill}
              stroke={shapeData.stroke}
              strokeWidth={shapeData.strokeWidth}
            />
          </svg>
        );
      }
      
      if (shapeData.shapeType === 'line') {
        return (
          <div
            className="w-full"
            style={{
              height: `${shapeData.strokeWidth}px`,
              backgroundColor: shapeData.stroke,
              marginTop: `${(element.height - shapeData.strokeWidth) / 2}px`,
            }}
          />
        );
      }
      
      if ((shapeData as any).shapeType === 'freehand' && (element.data as any).points) {
        const points = (element.data as any).points as DrawingPoint[];
        const pathData = points.reduce((acc, point, i) => {
          if (i === 0) return `M ${point.x} ${point.y}`;
          return `${acc} L ${point.x} ${point.y}`;
        }, '');
        
        return (
          <svg viewBox={`0 0 ${element.width} ${element.height}`} className="w-full h-full">
            <path
              d={pathData}
              fill="none"
              stroke={(element.data as any).strokeColor || shapeData.stroke}
              strokeWidth={(element.data as any).strokeWidth || shapeData.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      }
    }

    if (element.type === 'date') {
      const dateData = element.data as DateElementData;
      const displayDate = formatCampaignDate(campaign?.startDate, dateData.format);
      
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontFamily: dateData.fontFamily,
            fontSize: `${dateData.fontSize * scale}px`,
            fontWeight: dateData.fontWeight,
            fontStyle: dateData.fontStyle,
            textAlign: dateData.textAlign,
            color: dateData.color,
            backgroundColor: dateData.backgroundColor === 'transparent' ? 'transparent' : dateData.backgroundColor,
          }}
        >
          <span className="w-full px-1" style={{ textAlign: dateData.textAlign }}>
            {displayDate}
          </span>
        </div>
      );
    }
    
    return null;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "scheduled":
        return "secondary";
      case "draft":
        return "outline";
      case "completed":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-4 px-4 py-3 border-b bg-background">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted">
          <Skeleton className="w-[400px] h-[560px]" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-muted-foreground mb-4">Campaign not found</p>
      </div>
    );
  }

  const scaledCanvasWidth = (CANVAS_SIZES[canvasSize].width * scale);
  const scaledCanvasHeight = (CANVAS_SIZES[canvasSize].height * scale);
  const scaledHeaderHeight = (headerHeight * scale);
  const scaledFooterHeight = (footerHeight * scale);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg" data-testid="text-campaign-name">
              {campaign.name}
            </h1>
            <Badge variant={getStatusBadgeVariant(campaign.status)}>
              {campaign.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-muted p-6 overflow-auto">
        <div
          className="relative bg-white shadow-lg rounded-md overflow-hidden"
          style={{
            width: scaledCanvasWidth,
            height: scaledCanvasHeight,
            backgroundImage: template?.backgroundImageUrl ? `url(${template.backgroundImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          data-testid="preview-canvas"
        >
          {showHeaderZone && (
            <div
              className="absolute top-0 left-0 right-0 pointer-events-none"
              style={{ height: scaledHeaderHeight }}
            />
          )}
          
          {showFooterZone && (
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              style={{ height: scaledFooterHeight }}
            />
          )}

          {currentPageElements.map((element) => (
            <div
              key={element.id}
              className="absolute"
              style={{
                left: element.x * scale,
                top: element.y * scale,
                width: element.width * scale,
                height: element.height * scale,
                transform: `rotate(${element.rotation}deg)`,
                opacity: (element.opacity || 100) / 100,
              }}
            >
              {renderElement(element)}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2 mt-4" data-testid="pagination-controls">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {campaign.description && (
          <div className="mt-6 max-w-lg text-center">
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
