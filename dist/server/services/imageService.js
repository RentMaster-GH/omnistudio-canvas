"use strict";
const sharp = require('sharp');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
/**
 * Image Fine-Tuning, Resizing, and Format Conversion (using Sharp)
 */
const editImage = async (inputPath, outputPath, options = {}) => {
    let pipeline = sharp(inputPath);
    // 1. Resize & Crop
    if (options.width || options.height) {
        pipeline = pipeline.resize(options.width ? parseInt(options.width) : null, options.height ? parseInt(options.height) : null, { fit: options.fit || 'cover' });
    }
    // 2. Rotate
    if (options.rotate) {
        pipeline = pipeline.rotate(parseInt(options.rotate));
    }
    // 3. Fine-tuning (Brightness, Saturation, Blur)
    if (options.brightness || options.saturation) {
        pipeline = pipeline.modulate({
            brightness: options.brightness ? parseFloat(options.brightness) : 1,
            saturation: options.saturation ? parseFloat(options.saturation) : 1,
        });
    }
    if (options.blur) {
        pipeline = pipeline.blur(parseFloat(options.blur));
    }
    // 4. Format Conversion (PNG, JPEG, WEBP, AVIF)
    if (options.format) {
        pipeline = pipeline.toFormat(options.format, { quality: options.quality ? parseInt(options.quality) : 80 });
    }
    await pipeline.toFile(outputPath);
    return outputPath;
};
/**
 * Overlay Image/Text graphic onto a base image (e.g. Watermarking, Layering)
 */
const overlayImages = async (baseImagePath, overlayPath, outputPath, left = 0, top = 0) => {
    await sharp(baseImagePath)
        .composite([{ input: overlayPath, top: parseInt(top), left: parseInt(left) }])
        .toFile(outputPath);
    return outputPath;
};
/**
 * Add Text directly to a PDF Document Page
 */
const addTextToPdf = async (inputPdfPath, outputPdfPath, text, x = 50, y = 50, fontSize = 24) => {
    const existingPdfBytes = fs.readFileSync(inputPdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0]; // Edits first page (can be parameterized for any page)
    firstPage.drawText(text, {
        x: parseFloat(x),
        y: parseFloat(y),
        size: parseFloat(fontSize),
        font: helveticaFont,
        color: rgb(0, 0, 0),
    });
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPdfPath, pdfBytes);
    return outputPdfPath;
};
module.exports = {
    editImage,
    overlayImages,
    addTextToPdf,
};
