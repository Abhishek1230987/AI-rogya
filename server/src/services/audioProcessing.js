import { TranslationServiceClient } from "@google-cloud/translate";
import speech from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

const speechClient = new speech.SpeechClient();
const translationClient = new TranslationServiceClient();
const storage = new Storage();

export class AudioProcessingService {
  constructor() {
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET || "your-bucket-name";
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "your-project-id";
  }

  /**
   * Process audio buffer and optionally use requested language for recognition
   * @param {Buffer} audioBuffer
   * @param {string} mimeType
   * @param {string} language - optional short code like 'hi' or locale like 'hi-IN' or 'auto'
   */
  async processAudio(audioBuffer, mimeType, language = "auto") {
    try {
      console.log("🔊 Starting audio processing...");
      console.log(
        `   - Audio size: ${(audioBuffer.length / 1024).toFixed(2)}KB`,
      );
      console.log(`   - MIME type: ${mimeType}`);
      console.log(`   - Language: ${language}`);

      // Check if Google Cloud credentials are configured
      if (
        !process.env.GOOGLE_CLOUD_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT_ID === "your-project-id"
      ) {
        console.warn(
          "⚠️ Google Cloud APIs not configured - cannot transcribe server-side. Return marker for frontend fallback.",
        );
        return {
          transcript: null, // Mark as fallback
          detectedLanguage: language === "auto" ? "en" : language,
          englishTranslation: null,
          isFallback: true,
          error:
            "Google Cloud not configured - frontend should handle transcription",
        };
      }

      // Upload audio to Cloud Storage temporarily
      const fileName = `audio-${uuidv4()}`;
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      console.log("📤 Uploading audio to Cloud Storage...");
      await file.save(audioBuffer, {
        metadata: { contentType: mimeType },
      });

      // Get signed URL for the uploaded file
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 1000, // 1 minute
      });

      // Determine language code for recognition
      const mapToLocale = (lang) => {
        if (!lang || lang === "auto") return "en-US";
        if (lang.includes("-")) return lang;
        const short = lang.split("-")[0];
        const mapping = {
          en: "en-US",
          hi: "hi-IN",
          bn: "bn-IN",
          ta: "ta-IN",
          te: "te-IN",
          gu: "gu-IN",
          kn: "kn-IN",
          mr: "mr-IN",
          pa: "pa-IN",
          ml: "ml-IN",
        };
        return mapping[short] || "en-US";
      };

      const languageCode = mapToLocale(language);
      console.log(`🔤 Speech recognition language: ${languageCode}`);

      // Perform speech recognition
      const [response] = await speechClient.recognize({
        audio: {
          uri: url,
        },
        config: {
          encoding: "LINEAR16",
          sampleRateHertz: 16000,
          languageCode: languageCode,
          alternativeLanguageCodes: ["en-US", "hi-IN"],
        },
      });

      // Get transcription and detected language
      const transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n");
      const detectedLanguage = response.results[0]?.languageCode || "unknown";

      console.log(
        `✅ Transcription successful: "${transcription.substring(0, 50)}..."`,
      );

      // Translate to English if not in English
      let englishTranslation = transcription;
      if (detectedLanguage !== "en-US") {
        console.log("🌐 Translating to English...");
        const [translation] = await translationClient.translateText({
          parent: `projects/${this.projectId}/locations/global`,
          contents: [transcription],
          mimeType: "text/plain",
          sourceLanguageCode: detectedLanguage.split("-")[0],
          targetLanguageCode: "en",
        });

        englishTranslation = translation.translations[0].translatedText;
        console.log(`✅ Translation complete`);
      }

      // Clean up - delete the temporary file
      await file.delete();

      return {
        transcript: transcription,
        detectedLanguage,
        englishTranslation,
        isFallback: false,
      };
    } catch (error) {
      console.error("Error processing audio:", error);
      throw error;
    }
  }
}

export const audioProcessingService = new AudioProcessingService();
