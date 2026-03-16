import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import textToSpeech from "@google-cloud/text-to-speech";
import { Readable } from "stream";
import gTTS from "google-tts-api";
import fetch from "node-fetch";

const router = express.Router();

// Initialize Google Cloud Text-to-Speech client
let ttsClient = null;
try {
  // Check if Google Cloud credentials are configured
  if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_PROJECT
  ) {
    ttsClient = new textToSpeech.TextToSpeechClient();
    console.log("✅ Google Cloud Text-to-Speech initialized");
  } else {
    console.warn(
      "⚠️ Google Cloud TTS not configured - narration will use browser voices only"
    );
  }
} catch (error) {
  console.error("❌ Failed to initialize Google Cloud TTS:", error.message);
}

// Helper: escape text for SSML
function escapeForSSML(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * @route   POST /api/narration/speak
 * @desc    Convert text to speech using Google Cloud TTS
 * @access  Private
 */
router.post("/speak", authenticateToken, async (req, res) => {
  try {
    const { text, language } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    // Normalize language code: convert "ur" to "ur-IN", "mai" to "hi-IN", etc.
    const normalizeLanguage = (lang) => {
      if (!lang) return "hi-IN";

      const langMap = {
        en: "en-US",
        hi: "hi-IN",
        bn: "bn-IN",
        ta: "ta-IN",
        te: "te-IN",
        gu: "gu-IN",
        kn: "kn-IN",
        mr: "mr-IN",
        or: "or-IN",
        as: "as-IN",
        ur: "ur-IN",
        mai: "hi-IN", // Maithili uses Devanagari, so use Hindi voice
      };

      // If already has a region (e.g., "hi-IN"), return as-is
      if (lang.includes("-")) {
        return lang;
      }

      // Map short code to full code
      return langMap[lang] || "en-US";
    };

    // Normalize the language code
    const normalizedLanguage = normalizeLanguage(language);
    console.log(`🔄 Language normalized: ${language} → ${normalizedLanguage}`);

    // If Google Cloud TTS not available, use a dev fallback (google-tts-api)
    if (!ttsClient) {
      try {
        console.log("ℹ️ Using google-tts-api fallback for narration");

        // Use normalized language or default to 'hi-IN' for Devanagari support
        const lang = normalizedLanguage || "hi-IN";

        // google-tts-api expects short codes like 'hi'
        const shortLang = lang.split("-")[0] || "hi";

        // Build URL for mp3
        // Limit text length for google-tts-api (it will truncate if too long)
        const safeText = String(text).slice(0, 200);

        const url = gTTS.getAudioUrl(safeText, {
          lang: shortLang,
          slow: false,
          host: "https://translate.google.com",
        });

        // Fetch the mp3 data and pipe it back
        const audioResp = await fetch(url);
        if (!audioResp.ok) {
          throw new Error(`Fallback TTS fetch failed: ${audioResp.status}`);
        }

        const buffer = await audioResp.arrayBuffer();
        const buf = Buffer.from(buffer);

        res.set({
          "Content-Type": "audio/mpeg",
          "Content-Length": buf.length,
          "Cache-Control": "no-cache",
        });

        return res.send(buf);
      } catch (err) {
        console.error("❌ Fallback TTS error:", err);
        return res.status(503).json({
          success: false,
          message:
            "Cloud narration is currently unavailable. Please try browser narration or enable server-side TTS.",
        });
      }
    }

    console.log(`🔊 Generating audio for language: ${normalizedLanguage}`);

    // Map language codes to Google Cloud TTS voice names
    const voiceMapping = {
      "hi-IN": {
        languageCode: "hi-IN",
        name: "hi-IN-Wavenet-D",
        ssmlGender: "FEMALE",
      },
      "bn-IN": {
        languageCode: "bn-IN",
        name: "bn-IN-Wavenet-A",
        ssmlGender: "FEMALE",
      },
      "ta-IN": {
        languageCode: "ta-IN",
        name: "ta-IN-Wavenet-A",
        ssmlGender: "FEMALE",
      },
      "te-IN": {
        languageCode: "te-IN",
        name: "te-IN-Standard-A",
        ssmlGender: "FEMALE",
      },
      "gu-IN": {
        languageCode: "gu-IN",
        name: "gu-IN-Wavenet-A",
        ssmlGender: "FEMALE",
      },
      "kn-IN": {
        languageCode: "kn-IN",
        name: "kn-IN-Wavenet-A",
        ssmlGender: "FEMALE",
      },
      "mr-IN": {
        languageCode: "mr-IN",
        name: "mr-IN-Wavenet-A",
        ssmlGender: "FEMALE",
      },
      "or-IN": {
        languageCode: "or-IN",
        name: "or-IN-Wavenet-A",
        ssmlGender: "FEMALE",
      },
      "as-IN": {
        languageCode: "as-IN",
        name: "as-IN-Wavenet-A",
        ssmlGender: "FEMALE",
      },
      "ur-IN": {
        languageCode: "ur-IN",
        name: "ur-IN-Wavenet-A",
        ssmlGender: "FEMALE",
      },
      "en-US": {
        languageCode: "en-US",
        name: "en-US-Wavenet-F",
        ssmlGender: "FEMALE",
      },
      "en-IN": {
        languageCode: "en-IN",
        name: "en-IN-Wavenet-D",
        ssmlGender: "FEMALE",
      },
    };

    const voiceConfig =
      voiceMapping[normalizedLanguage] || voiceMapping["en-US"];

    // Construct the request for Google Cloud TTS
    // Use SSML for Indic scripts (helps with Devanagari/Hindi pronunciation)
    const useSSML = /^hi(-|$)|^bn(-|$)/i.test(voiceConfig.languageCode);

    const input = useSSML
      ? {
          ssml: `<speak><lang xml:lang="${
            voiceConfig.languageCode
          }">${escapeForSSML(text)}</lang></speak>`,
        }
      : { text: text };

    const request = {
      input,
      voice: {
        languageCode: voiceConfig.languageCode,
        name: voiceConfig.name,
        ssmlGender: voiceConfig.ssmlGender,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 0.9, // Slightly slower for comprehension
        pitch: 0.0,
        volumeGainDb: 0.0,
      },
    };

    // Perform the text-to-speech request
    const [response] = await ttsClient.synthesizeSpeech(request);

    console.log(`✅ Audio generated successfully for ${language}`);

    // Send the audio content as MP3
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": response.audioContent.length,
      "Cache-Control": "no-cache",
    });

    res.send(response.audioContent);
  } catch (error) {
    console.error("❌ Error generating speech:", error);

    // Handle specific Google Cloud TTS errors
    if (error.code === "PERMISSION_DENIED") {
      return res.status(403).json({
        success: false,
        message: "Text-to-speech service configuration error",
      });
    }

    if (error.code === "INVALID_ARGUMENT") {
      return res.status(400).json({
        success: false,
        message: "Invalid text or language provided",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to generate speech audio",
    });
  }
});

/**
 * @route   GET /api/narration/voices
 * @desc    Get available voices for a language
 * @access  Private
 */
router.get("/voices", authenticateToken, async (req, res) => {
  try {
    const { language } = req.query;

    if (!ttsClient) {
      // Provide a fallback list of voices that the client can use when cloud TTS is unavailable
      const fallbackVoices = [
        {
          name: "hi-IN-Wavenet-D (fallback)",
          languageCodes: ["hi-IN"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "bn-IN-Wavenet-A (fallback)",
          languageCodes: ["bn-IN"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "en-IN-Wavenet-D (fallback)",
          languageCodes: ["en-IN"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
        {
          name: "en-US-Wavenet-F (fallback)",
          languageCodes: ["en-US"],
          ssmlGender: "FEMALE",
          naturalSampleRateHertz: 24000,
        },
      ];

      return res.json({
        success: true,
        voices: fallbackVoices,
        message: "Cloud TTS not configured — returning fallback voices.",
      });
    }

    const [result] = await ttsClient.listVoices({
      languageCode: language || "en-US",
    });

    const voices = result.voices.map((voice) => ({
      name: voice.name,
      languageCodes: voice.languageCodes,
      ssmlGender: voice.ssmlGender,
      naturalSampleRateHertz: voice.naturalSampleRateHertz,
    }));

    res.json({
      success: true,
      voices: voices,
    });
  } catch (error) {
    console.error("❌ Error fetching voices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available voices",
    });
  }
});

export default router;
