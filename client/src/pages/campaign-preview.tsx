import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Edit, Package, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  type: 'product' | 'text' | 'shape' | 'image' | 'header' | 'footer';
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

export default function CampaignPreviewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
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
      
      return (
        <div className="w-full h-full bg-card border rounded-md overflow-hidden flex flex-col">
          <div className="flex-1 bg-muted flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <Package className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="p-1 text-center bg-background">
            <p className="text-xs font-medium truncate">{name}</p>
            <p className="text-xs text-primary font-bold">
              ${discountPrice || price}
            </p>
          </div>
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
      <div className="flex flex-col h-full">
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
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-muted-foreground">{t('campaigns.notFound')}</p>
        <Button variant="ghost" onClick={() => setLocation("/campaigns")}>
          {t('common.backToList')}
        </Button>
      </div>
    );
  }

  const scaledCanvasWidth = (CANVAS_SIZES[canvasSize].width * scale);
  const scaledCanvasHeight = (CANVAS_SIZES[canvasSize].height * scale);
  const scaledHeaderHeight = (headerHeight * scale);
  const scaledFooterHeight = (footerHeight * scale);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/campaigns")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg" data-testid="text-campaign-name">
              {campaign.name}
            </h1>
            <Badge variant={getStatusBadgeVariant(campaign.status)}>
              {t(`campaigns.${campaign.status}`)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation(`/campaigns/${id}/edit`)}
            data-testid="button-edit-campaign"
          >
            <Edit className="h-4 w-4 mr-2" />
            {t('campaigns.openEditor')}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-muted p-6 overflow-auto">
        <div
          className="relative bg-white shadow-lg rounded-md overflow-hidden"
          style={{
            width: scaledCanvasWidth,
            height: scaledCanvasHeight,
          }}
          data-testid="preview-canvas"
        >
          {showHeaderZone && (
            <div
              className="absolute top-0 left-0 right-0 bg-muted/30 border-b border-dashed border-muted-foreground/30"
              style={{ height: scaledHeaderHeight }}
            />
          )}
          
          {showFooterZone && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-muted/30 border-t border-dashed border-muted-foreground/30"
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
                opacity: element.opacity,
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
              {t('editor.pageOf', { current: currentPage, total: totalPages })}
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
