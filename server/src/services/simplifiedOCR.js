// Simplified OCR Service - Lightweight and Reliable
import Tesseract from "tesseract.js";
import sharp from "sharp";
import fs from "fs";
import path from "path";

export class SimplifiedOCR {
  constructor() {
    this.timeout = 15000; // 15 second timeout
  }

  // Main OCR method
  async extractText(imagePath) {
    console.log("[OCR] Starting text extraction from:", imagePath);

    try {
      // Validate file
      if (!fs.existsSync(imagePath)) {
        throw new Error("File does not exist");
      }

      const stats = fs.statSync(imagePath);
      if (stats.size === 0) {
        throw new Error("File is empty");
      }

      console.log(`[OCR] File size: ${(stats.size / 1024).toFixed(2)} KB`);

      // Try OCR with timeout
      const text = await this.ocrWithTimeout(imagePath);

      if (text && text.trim().length > 0) {
        console.log(`[OCR] Extracted ${text.length} characters successfully`);
        return text;
      } else {
        console.log("[OCR] OCR returned empty text");
        return "";
      }
    } catch (error) {
      console.log(`[OCR] Error: ${error.message}`);
      return "";
    }
  }

  // OCR with timeout protection
  async ocrWithTimeout(imagePath) {
    return Promise.race([
      this.doOCR(imagePath),
      this.timeout_promise(this.timeout),
    ]);
  }

  // Actual OCR operation
  async doOCR(imagePath) {
    let worker = null;
    try {
      console.log("[OCR] Creating worker...");
      worker = await Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing") {
            const pct = Math.round(m.progress * 100);
            if (pct % 20 === 0) {
              console.log(`[OCR] Progress: ${pct}%`);
            }
          }
        },
      });

      console.log("[OCR] Running recognition...");
      const {
        data: { text },
      } = await worker.recognize(imagePath);
      return (text || "").trim();
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (e) {
          // Ignore termination errors
        }
      }
    }
  }

  timeout_promise(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OCR timeout")), ms)
    );
  }

  // Preprocess image
  async preprocessImage(imagePath) {
    try {
      console.log("[IMG] Preprocessing image...");
      const outputPath = imagePath.replace(/\.[^.]+$/, "_proc.png");

      await sharp(imagePath)
        .resize({ width: 1800, withoutEnlargement: true })
        .sharpen()
        .png({ compression: 9 })
        .toFile(outputPath);

      console.log("[IMG] Preprocessing complete");
      return outputPath;
    } catch (error) {
      console.log("[IMG] Preprocessing failed:", error.message);
      return imagePath;
    }
  }
}

export const simplifiedOCR = new SimplifiedOCR();
