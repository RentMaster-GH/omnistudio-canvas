// --- FILL TYPES ---
export type SolidFill = { type: 'solid'; color: string };
export type GradientFill = { type: 'gradient'; colors: string[] };
export type PatternFill = { type: 'pattern'; url: string };

// --- CANVAS GRAPH ROOT ---
export interface CanvasGraph {
  version: "1.0.0";
  dimensions: {
    width: number;
    height: number;
    unit: "px" | "mm" | "in";
    dpi: number;
  };
  colorSpace: "sRGB" | "display-p3" | "CMYK"; // CMYK for Acrobat print exports
  rootNodeIds: string[]; // Order determines global z-index
  nodes: Record<string, CanvasNode>; // Flat map for O(1) lookups
}

// --- NODE TYPES ---
export type CanvasNodeType = 
  | "group" 
  | "vector_path" 
  | "text_block" 
  | "raster_image" 
  | "pdf_page_surface" 
  | "smart_shape";

export interface CanvasNode {
  id: string;
  name: string;
  type: CanvasNodeType;
  visible: boolean;
  locked: boolean;
  
  // Transform & Geometry
  transform: NodeTransform;
  
  // Layout engine (Canva-style Flexbox/Grid for graphics)
  layout?: AutoLayoutProperties;
  
  // Visual Styles
  style: NodeStyle;
  
  // Type-specific payloads
  data: VectorData | TextBlockData | RasterData | PdfSurfaceData | GroupData;

  // Interoperability metadata
  aiMetadata?: {
    promptUsed?: string;
    inpaintMaskId?: string;
    ocrConfidence?: number;
  };
}

// --- TRANSFORMS & STYLES ---
export interface NodeTransform {
  x: number;
  y: number;
  rotation: number; // In degrees
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  anchorX: number; // 0.0 to 1.0 (Pivot point)
  anchorY: number;
}

export interface NodeStyle {
  opacity: number;
  blendMode: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten";
  fill?: SolidFill | GradientFill | PatternFill;
  stroke?: {
    color: string;
    width: number;
    align: "inside" | "center" | "outside";
    dashArray?: number[];
    cap: "butt" | "round" | "square";
  };
  shadows?: Array<{
    x: number;
    y: number;
    blur: number;
    color: string;
  }>;
  filters?: Array<{
    type: "blur" | "brightness" | "contrast" | "chroma_key";
    value: number | string;
  }>;
}

// --- ACROBAT-SPECIFIC: TEXT REFLOW & PDF DATA ---
export interface TextBlockData {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  align: "left" | "center" | "right" | "justify";
  // Acrobat PDF reflow properties
  pdfReflow?: {
    isScannedOcr: boolean;
    originalBoundingBox: [number, number, number, number]; // [x, y, w, h]
    embeddedFontData?: string; // Base64 font stream if non-standard
  };
}

export interface PdfSurfaceData {
  pdfAssetId: string; // Links to asset in .omni bundle
  pageIndex: number;
  renderAsVector: boolean; // True = sharp zoom; False = fast raster proxy
  formFields?: Array<{
    id: string;
    type: "text_input" | "checkbox" | "signature";
    value: string;
    rect: [number, number, number, number];
  }>;
}

// --- CANVA-SPECIFIC: LAYOUT & VECTORS ---
export interface AutoLayoutProperties {
  mode: "none" | "flex_row" | "flex_column" | "grid";
  gap: number;
  padding: [number, number, number, number]; // top, right, bottom, left
  alignItems: "start" | "center" | "end" | "stretch";
  justifyContent: "start" | "center" | "end" | "space-between";
}

export interface VectorData {
  svgPathData: string; // Standard SVG Path (d="..." attribute)
  fillRule: "nonzero" | "evenodd";
}

export interface RasterData {
  assetId: string; // Internal pointer to assets/ folder
  cropRect?: [number, number, number, number]; // Normalized 0..1 coordinates
}

export interface GroupData {
  childrenNodeIds: string[];
}