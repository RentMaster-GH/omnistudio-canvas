// src/exportEngine.ts - OmniStudio Production Export Pipeline
import * as fs from 'fs';
import * as path from 'path';
import { CanvasGraph } from './types';

export class OmniExportEngine {
  private graph: CanvasGraph;

  constructor(graphData: CanvasGraph) {
    this.graph = graphData;
  }

  /**
   * 1. Schema Validator: Verifies structural compliance with CanvasGraph specification
   */
  public validateSchema(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.graph.version !== "1.0.0") {
      errors.push(`Unsupported schema version: ${this.graph.version}`);
    }

    if (!this.graph.dimensions || !this.graph.dimensions.width) {
      errors.push("Invalid canvas dimensions");
    }

    this.graph.rootNodeIds.forEach((id) => {
      if (!this.graph.nodes[id]) {
        errors.push(`Root node ID "${id}" missing from flat node map.`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 2. CMYK / Print Readiness Audit for Acrobat PDF Workflows
   */
  public auditPrintReadiness(): { colorSpace: string; dpi: number; printReady: boolean } {
    const isCMYK = this.graph.colorSpace === 'CMYK';
    const isHighDPI = this.graph.dimensions.dpi >= 300;

    return {
      colorSpace: this.graph.colorSpace,
      dpi: this.graph.dimensions.dpi,
      printReady: isCMYK && isHighDPI
    };
  }

  /**
   * 3. Compile Production Bundle (.omni bundle manifest)
   */
  public compileProductionBundle(): string {
    const validation = this.validateSchema();
    if (!validation.valid) {
      throw new Error(`Cannot export invalid schema: ${validation.errors.join(', ')}`);
    }

    const bundleManifest = {
      bundleVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      document: this.graph,
      nodeCount: Object.keys(this.graph.nodes).length,
      assetsRequired: Object.values(this.graph.nodes)
        .filter(n => n.type === 'pdf_page_surface')
        .map(n => (n.data as any).pdfAssetId)
    };

    return JSON.stringify(bundleManifest, null, 2);
  }
}

// --- RUN EXPORT AUDIT CLI ---
const filePath = path.join(__dirname, '../canvas_graph.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const graphData: CanvasGraph = JSON.parse(rawData);

const exporter = new OmniExportEngine(graphData);
const validation = exporter.validateSchema();

console.log('--- OMNISTUDIO PRODUCTION EXPORT AUDIT ---');
console.log(`Schema Compliance: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);

const printAudit = exporter.auditPrintReadiness();
console.log(`Color Space: ${printAudit.colorSpace}`);
console.log(`DPI Resolution: ${printAudit.dpi}`);
console.log(`Print Ready (300 DPI CMYK): ${printAudit.printReady ? 'YES' : 'NO (Digital Display Mode)'}`);

// Save bundle manifest
const manifestPath = path.join(__dirname, '../production_bundle.omni.json');
fs.writeFileSync(manifestPath, exporter.compileProductionBundle(), 'utf-8');
console.log(`\n📦 Successfully generated production bundle at: production_bundle.omni.json`);