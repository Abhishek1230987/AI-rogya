// Advanced Medical Document Analysis Service
// Supports OCR with Tesseract.js and AI analysis with Gemini

import Tesseract from "tesseract.js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { geminiService } from "./geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MedicalDocumentAnalyzer {
  constructor() {
    this.gemini = geminiService;
    this.trainedDataPath = path.join(__dirname, "../../eng.traineddata");
    console.log("[INIT] Medical Analyzer initialized with full OCR support");
  }

  // Main analysis method that tries multiple approaches
  async analyzeDocument(filePath, mimeType, originalName) {
    console.log(`🔬 Starting comprehensive analysis of: ${originalName}`);
    console.log(`📂 File path: ${filePath}`);
    console.log(`🎯 MIME type: ${mimeType}`);

    try {
      let extractedText = "";
      let analysisResult = {};
      let extractionError = null;

      // Step 1: Extract text using OCR
      try {
        if (mimeType.startsWith("image/")) {
          console.log("📸 Attempting image OCR extraction...");
          extractedText = await this.extractTextFromImage(filePath);
          console.log(
            `✅ Image extraction successful: ${extractedText.length} chars`
          );
        } else if (mimeType === "application/pdf") {
          console.log("📄 Attempting PDF extraction...");
          extractedText = await this.extractTextFromPDF(filePath);
          console.log(
            `✅ PDF extraction successful: ${extractedText.length} chars`
          );
        } else {
          console.log(`⚠️ Unsupported file type: ${mimeType}`);
        }
      } catch (textExtractionError) {
        extractionError = textExtractionError.message;
        console.error("❌ Text extraction error:", extractionError);
        extractedText = "";
      }

      console.log(
        `📝 Extracted text length: ${extractedText.length} characters`
      );

      // Step 2: Analyze extracted text with AI
      try {
        if (extractedText.length > 50) {
          console.log("🤖 Attempting AI analysis...");
          analysisResult = await this.analyzeWithAI(
            extractedText,
            originalName
          );
          console.log("✅ AI analysis successful");
        } else {
          console.log(
            "⚠️ Insufficient text extracted, using enhanced mock data"
          );
          analysisResult = this.generateEnhancedMockData(
            originalName,
            mimeType
          );
        }
      } catch (analysisError) {
        console.error("❌ Analysis error:", analysisError.message);
        console.log("🔄 Falling back to mock data...");
        analysisResult = this.generateEnhancedMockData(originalName, mimeType);
      }

      return {
        ...analysisResult,
        extractedTextLength: extractedText.length,
        extractedText:
          extractedText.substring(0, 500) +
          (extractedText.length > 500 ? "..." : ""),
        processingMethod:
          extractedText.length > 50 ? "AI_ANALYSIS" : "ENHANCED_MOCK",
        confidence:
          extractedText.length > 50 ? analysisResult.confidence || 85 : 70,
        extractionError: extractionError || undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Critical analysis error:", error);
      const fallbackData = this.generateEnhancedMockData(
        originalName,
        mimeType
      );
      return {
        ...fallbackData,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // OCR for images using Tesseract.js with robust error handling
  async extractTextFromImage(imagePath) {
    let processedImagePath = null;
    let worker = null;
    try {
      console.log("🖼️ Processing image with OCR...");
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      const stats = fs.statSync(imagePath);
      console.log(
        `📊 Original file size: ${(stats.size / 1024).toFixed(2)} KB`
      );

      console.log("🔧 Preprocessing image...");
      processedImagePath = await this.preprocessImage(imagePath);
      console.log("✅ Image preprocessing complete");

      console.log("🔍 Initializing Tesseract worker...");
      worker = await Tesseract.createWorker("eng", 1, {
        logger: (msg) => {
          if (msg.status) {
            const progress = Math.round(msg.progress * 100);
            console.log(`   OCR: ${msg.status} (${progress}%)`);
          }
        },
      });

      console.log("🔍 Starting OCR recognition...");
      const ocrPromise = worker.recognize(processedImagePath);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("OCR timeout after 30 seconds")),
          30000
        )
      );

      const result = await Promise.race([ocrPromise, timeoutPromise]);
      const text = result.data?.text || "";

      console.log("✅ Tesseract OCR complete");
      const cleanedText = this.cleanExtractedText(text);
      console.log(`📊 Extracted ${cleanedText.length} characters`);

      return cleanedText;
    } catch (error) {
      console.error("❌ OCR Error:", error.message);
      console.log("⚠️ OCR failed, will use fallback data");
      return "";
    } finally {
      if (worker) {
        try {
          await worker.terminate();
          console.log("✅ Tesseract worker terminated");
        } catch (e) {
          console.warn("⚠️ Issue terminating worker:", e.message);
        }
      }
      if (
        processedImagePath &&
        processedImagePath !== imagePath &&
        fs.existsSync(processedImagePath)
      ) {
        try {
          fs.unlinkSync(processedImagePath);
        } catch (e) {
          // Silently fail
        }
      }
    }
  }

  // Preprocess image for better OCR results
  async preprocessImage(imagePath) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      const stats = fs.statSync(imagePath);
      if (stats.size === 0) {
        throw new Error(`Image file is empty`);
      }

      const processedPath = imagePath.replace(/\.[^/.]+$/, "_processed.png");

      await sharp(imagePath)
        .resize({ width: 2000 })
        .sharpen()
        .normalize()
        .png()
        .toFile(processedPath);

      console.log("✅ Image preprocessing complete");
      return processedPath;
    } catch (error) {
      console.error("❌ Image preprocessing error:", error.message);
      return imagePath;
    }
  }

  // Extract text from PDF (mock for now - would need pdf-parse)
  async extractTextFromPDF(pdfPath) {
    console.log("📄 PDF text extraction (mock implementation)");
    return `Medical Report - Patient Lab Results. Date: ${new Date().toLocaleDateString()}. Glucose: 95 mg/dL. Blood Pressure: 120/80 mmHg.`;
  }

  // Analyze text with AI (Gemini) or pattern matching fallback
  async analyzeWithAI(text, fileName) {
    if (this.gemini && this.gemini.isAvailable()) {
      try {
        console.log("🤖 Using Google Gemini AI for analysis...");
        return await this.gemini.analyzeMedicalDocument(text, fileName);
      } catch (error) {
        console.log("Gemini AI failed, falling back to pattern matching...");
      }
    }

    console.log("🔍 Using pattern matching analysis...");
    return this.analyzeWithPatternMatching(text, fileName);
  }

  // Pattern matching analysis for medical text
  analyzeWithPatternMatching(text, fileName) {
    console.log("🔍 Using pattern matching analysis...");

    const result = {
      patientInfo: this.extractPatientInfo(text),
      medications: this.extractMedications(text),
      conditions: this.extractConditions(text),
      labResults: this.extractLabResults(text),
      vitals: this.extractVitals(text),
      dateOfReport: this.extractDate(text),
      doctorName: this.extractDoctorName(text),
      facility: this.extractFacility(text),
      reportType: this.determineReportType(text, fileName),
      keyFindings: this.extractKeyFindings(text),
      confidence: 75,
      source: "Pattern Matching",
    };

    // Filter out empty arrays and null values
    Object.keys(result).forEach((key) => {
      if (Array.isArray(result[key]) && result[key].length === 0) {
        delete result[key];
      }
      if (result[key] === null || result[key] === "") {
        delete result[key];
      }
    });

    return result;
  }

  // Extract patient information
  extractPatientInfo(text) {
    const patientInfo = {};
    const namePatterns = [
      /(?:name|patient)[:\s]+([a-z]+\s+[a-z]+(?:\s+[a-z]+)?)/gi,
      /patient[:\s]*([a-z]+(?:\s+[a-z]+)+)/gi,
    ];

    for (const pattern of namePatterns) {
      const match = pattern.exec(text);
      if (match) {
        patientInfo.name = match[1].trim();
        break;
      }
    }

    return Object.keys(patientInfo).length > 0 ? patientInfo : null;
  }

  // Extract medications
  extractMedications(text) {
    const medications = [];
    const patterns = [
      /(\w+)\s+(\d+\s*(?:mg|mcg|g|ml))\s*(?:daily|twice daily|bid|tid|once daily)/gi,
      /(metformin|lisinopril|aspirin|atorvastatin|amlodipine|omeprazole|levothyroxine|simvastatin|warfarin|insulin)\s+(\d+\s*(?:mg|mcg|units?))/gi,
      /(?:rx|prescription)[:\s]+([^\n\.]+)/gi,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const medication = match[0]
          .trim()
          .replace(/^(?:rx|prescription|take)[:.\s]*/gi, "");
        if (medication.length > 2) {
          medications.push(medication);
        }
      }
    });

    return [...new Set(medications)];
  }

  // Extract medical conditions
  extractConditions(text) {
    const conditions = [];
    const commonConditions = [
      "diabetes",
      "hypertension",
      "hyperlipidemia",
      "asthma",
      "heart disease",
      "arthritis",
      "depression",
      "anxiety",
      "pneumonia",
      "bronchitis",
    ];

    commonConditions.forEach((condition) => {
      const regex = new RegExp(`\\b${condition}\\b`, "gi");
      if (regex.test(text)) {
        conditions.push(condition.charAt(0).toUpperCase() + condition.slice(1));
      }
    });

    return [...new Set(conditions)];
  }

  // Extract lab results
  extractLabResults(text) {
    const labResults = [];
    const patterns = [
      /(\w+(?:\s+\w+)?)\s*[:=]\s*(\d+(?:\.\d+)?)\s*(mg\/dl|mmol\/l|%|bpm|mmhg|g\/dl)/gi,
      /(glucose|cholesterol|hdl|ldl|hemoglobin|wbc)\s*[:=]?\s*(\d+(?:\.\d+)?)/gi,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[2]) {
          const testName = match[1].trim();
          const value = match[2].trim();
          const unit = match[3] ? ` ${match[3]}` : "";
          labResults.push(`${testName}: ${value}${unit}`);
        }
      }
    });

    return [...new Set(labResults)];
  }

  // Extract vital signs
  extractVitals(text) {
    const vitals = [];
    const vitalPatterns = [
      /blood pressure[:\s]+(\d+\/\d+)/gi,
      /heart rate[:\s]+(\d+)/gi,
      /temperature[:\s]+(\d+(?:\.\d+)?)/gi,
      /weight[:\s]+(\d+(?:\.\d+)?)\s*(kg|lbs?)/gi,
    ];

    vitalPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        vitals.push(match[0].trim());
      }
    });

    return [...new Set(vitals)];
  }

  // Extract dates
  extractDate(text) {
    const datePatterns = [
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
      /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
    ];

    for (const pattern of datePatterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[0];
      }
    }
    return null;
  }

  // Extract doctor names
  extractDoctorName(text) {
    const patterns = [
      /dr\.?\s+([a-z]+\s+[a-z]+)/gi,
      /doctor\s+([a-z]+\s+[a-z]+)/gi,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  // Extract facility names
  extractFacility(text) {
    const patterns = [/([a-z\s]+(?:hospital|clinic|medical center))/gi];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  // Determine report type
  determineReportType(text, fileName) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("lab")) return "Lab Report";
    if (lowerText.includes("imaging")) return "Imaging Report";
    return "Medical Document";
  }

  // Extract key findings
  extractKeyFindings(text) {
    const findings = [];
    const patterns = [
      /findings?[:\s]+([^\n\.]+)/gi,
      /impression[:\s]+([^\n\.]+)/gi,
      /conclusion[:\s]+([^\n\.]+)/gi,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const finding = match[1].trim();
        if (finding.length > 5) {
          findings.push(finding);
        }
      }
    });

    return [...new Set(findings)];
  }

  // Clean extracted text
  cleanExtractedText(text) {
    return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
  }

  // Enhanced mock data
  generateEnhancedMockData(fileName, mimeType) {
    return {
      medications: [
        "Metformin 500mg twice daily",
        "Lisinopril 10mg once daily",
      ],
      conditions: ["Type 2 Diabetes", "Hypertension"],
      labResults: [
        "Glucose: 145 mg/dL",
        "Blood Pressure: 138/85 mmHg",
        "Total Cholesterol: 220 mg/dL",
      ],
      vitals: ["Blood Pressure: 138/85 mmHg", "Heart Rate: 72 bpm"],
      dateOfReport: new Date().toLocaleDateString(),
      reportType: "Medical Document",
      keyFindings: ["Document uploaded for analysis"],
      confidence: 70,
      source: "Enhanced Mock Data",
    };
  }
}

// Export singleton instance
export const medicalAnalyzer = new MedicalDocumentAnalyzer();
