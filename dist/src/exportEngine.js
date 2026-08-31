"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmniExportEngine = void 0;
// src/exportEngine.ts - OmniStudio Production Export Pipeline
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class OmniExportEngine {
    constructor(graphData) {
        this.graph = graphData;
    }
    /**
     * 1. Schema Validator: Verifies structural compliance with CanvasGraph specification
     */
    validateSchema() {
        const errors = [];
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
    auditPrintReadiness() {
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
    compileProductionBundle() {
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
                .map(n => n.data.pdfAssetId)
        };
        return JSON.stringify(bundleManifest, null, 2);
    }
}
exports.OmniExportEngine = OmniExportEngine;
// --- RUN EXPORT AUDIT CLI ---
const filePath = path.join(__dirname, '../canvas_graph.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const graphData = JSON.parse(rawData);
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
