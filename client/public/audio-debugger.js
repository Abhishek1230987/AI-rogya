/**
 * Frontend Audio Debugging Script
 *
 * How to use:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Run: window.AudioDebugger.diagnose()
 */

window.AudioDebugger = {
  // Configuration
  config: {
    serverUrl: "http://localhost:5000",
    sosEndpoint: "/api/sos/send",
  },

  // Store test results
  results: {
    mediaApi: {},
    browser: {},
    network: {},
    server: {},
  },

  // Logging helper
  log(message, type = "info") {
    const styles = {
      info: "color: #0066cc; font-weight: bold;",
      success: "color: #00aa00; font-weight: bold;",
      error: "color: #ff0000; font-weight: bold;",
      warning: "color: #ff6600; font-weight: bold;",
      debug: "color: #666666; font-style: italic;",
    };

    const icons = {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warning: "⚠️",
      debug: "🔍",
    };

    console.log(`%c${icons[type]} ${message}`, styles[type] || styles.info);
  },

  logSection(title) {
    console.log("%c" + "=".repeat(60), "color: #0066cc; font-weight: bold;");
    console.log(
      "%c📋 " + title,
      "color: #0066cc; font-weight: bold; font-size: 14px;"
    );
    console.log("%c" + "=".repeat(60), "color: #0066cc; font-weight: bold;");
  },

  // Check Media API support
  async checkMediaApi() {
    this.logSection("Media API Support Check");

    // Check getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      this.log("✓ getUserMedia API available", "success");
      this.results.mediaApi.getUserMedia = true;
    } else {
      this.log("✗ getUserMedia API not available", "error");
      this.results.mediaApi.getUserMedia = false;
    }

    // Check MediaRecorder
    if (typeof MediaRecorder !== "undefined") {
      this.log("✓ MediaRecorder available", "success");
      this.results.mediaApi.mediaRecorder = true;

      // Check supported audio types
      const types = ["audio/webm", "audio/wav", "audio/mp3", "audio/ogg"];
      console.log("\n  📊 Supported audio types:");
      types.forEach((type) => {
        if (MediaRecorder.isTypeSupported(type)) {
          console.log(`    ✓ ${type}`);
        } else {
          console.log(`    ✗ ${type}`);
        }
      });
    } else {
      this.log("✗ MediaRecorder not available", "error");
      this.results.mediaApi.mediaRecorder = false;
    }
  },

  // Check browser capabilities
  async checkBrowserCapabilities() {
    this.logSection("Browser Capabilities");

    // Local storage
    try {
      localStorage.setItem("test", "test");
      localStorage.removeItem("test");
      this.log("✓ LocalStorage available", "success");
      this.results.browser.localStorage = true;
    } catch {
      this.log("✗ LocalStorage not available", "error");
      this.results.browser.localStorage = false;
    }

    // Session storage
    try {
      sessionStorage.setItem("test", "test");
      sessionStorage.removeItem("test");
      this.log("✓ SessionStorage available", "success");
      this.results.browser.sessionStorage = true;
    } catch {
      this.log("✗ SessionStorage not available", "error");
      this.results.browser.sessionStorage = false;
    }

    // FormData
    if (typeof FormData !== "undefined") {
      this.log("✓ FormData available", "success");
      this.results.browser.formData = true;
    } else {
      this.log("✗ FormData not available", "error");
      this.results.browser.formData = false;
    }

    // Blob
    if (typeof Blob !== "undefined") {
      this.log("✓ Blob available", "success");
      this.results.browser.blob = true;
    } else {
      this.log("✗ Blob not available", "error");
      this.results.browser.blob = false;
    }
  },

  // Test recording
  async testRecording() {
    this.logSection("Audio Recording Test");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      this.log("✓ Microphone access granted", "success");

      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      // Record for 2 seconds
      mediaRecorder.start();
      this.log("Recording audio for 2 seconds...", "debug");

      await new Promise((resolve) => {
        setTimeout(() => {
          mediaRecorder.stop();
          resolve();
        }, 2000);
      });

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        this.log(
          `✓ Audio recorded: ${(audioBlob.size / 1024).toFixed(2)}KB`,
          "success"
        );
        this.results.browser.recordingTest = {
          success: true,
          size: audioBlob.size,
          type: audioBlob.type,
        };
      };

      // Stop tracks
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      this.log(`✗ Recording failed: ${error.message}`, "error");
      this.results.browser.recordingTest = {
        success: false,
        error: error.message,
      };
    }
  },

  // Check network connectivity
  async checkNetworkConnectivity() {
    this.logSection("Network Connectivity Check");

    try {
      const response = await fetch(this.config.serverUrl + "/", {
        method: "HEAD",
        mode: "no-cors",
      });
      this.log(`✓ Server reachable at ${this.config.serverUrl}`, "success");
      this.results.network.serverReachable = true;
    } catch (error) {
      this.log(`✗ Cannot reach server at ${this.config.serverUrl}`, "error");
      this.log(`  Error: ${error.message}`, "debug");
      this.results.network.serverReachable = false;
    }
  },

  // Check authentication
  async checkAuthentication() {
    this.logSection("Authentication Check");

    const token = localStorage.getItem("token");
    if (token) {
      this.log("✓ Authentication token found", "success");
      this.log(`  Token: ${token.substring(0, 20)}...`, "debug");
      this.results.server.authenticated = true;
    } else {
      this.log("✗ No authentication token found", "warning");
      this.log("  Please login to the application first", "debug");
      this.results.server.authenticated = false;
    }
  },

  // Test FormData creation
  async testFormDataCreation() {
    this.logSection("FormData Creation Test");

    try {
      const audioBlob = new Blob(["test audio data"], {
        type: "audio/wav",
      });
      const formData = new FormData();

      formData.append("message", "Test SOS");
      formData.append("severity", "HIGH");
      formData.append("audio", audioBlob, "test.wav");

      this.log("✓ FormData created successfully", "success");
      this.log("  Contents:", "debug");
      for (let [key, value] of formData.entries()) {
        if (value instanceof Blob) {
          this.log(
            `    ${key}: Blob(${value.size} bytes, ${value.type})`,
            "debug"
          );
        } else {
          this.log(`    ${key}: ${value}`, "debug");
        }
      }
      this.results.browser.formDataTest = true;
    } catch (error) {
      this.log(`✗ FormData creation failed: ${error.message}`, "error");
      this.results.browser.formDataTest = false;
    }
  },

  // Full diagnostic
  async diagnose() {
    console.clear();
    console.log(
      "%c╔══════════════════════════════════════════════════════════════╗",
      "color: #0066cc; font-weight: bold;"
    );
    console.log(
      "%c║        🎙️ Frontend Audio Debugging Tool                     ║",
      "color: #0066cc; font-weight: bold;"
    );
    console.log(
      "%c╚══════════════════════════════════════════════════════════════╝",
      "color: #0066cc; font-weight: bold;"
    );

    await this.checkMediaApi();
    await this.checkBrowserCapabilities();
    await this.checkNetworkConnectivity();
    await this.checkAuthentication();
    await this.testFormDataCreation();
    await this.testRecording();

    this.printSummary();
  },

  printSummary() {
    this.logSection("Diagnostic Summary");

    const passed = Object.values(this.results)
      .flatMap(Object.values)
      .filter((v) => v === true).length;

    const failed = Object.values(this.results)
      .flatMap(Object.values)
      .filter(
        (v) => v === false || (typeof v === "object" && v.success === false)
      ).length;

    console.log(`\n📊 Results: ${passed} ✓, ${failed} ✗\n`);

    // Recommendations
    console.log("%c💡 Recommendations:", "color: #ff6600; font-weight: bold;");

    if (
      this.results.mediaApi.mediaRecorder &&
      this.results.browser.recordingTest?.success
    ) {
      console.log("  ✓ Audio recording is working");
    } else {
      console.log("  ✗ Fix: Check microphone permissions and browser support");
    }

    if (this.results.network.serverReachable) {
      console.log("  ✓ Server is reachable");
    } else {
      console.log("  ✗ Fix: Start the backend server (npm run dev)");
    }

    if (this.results.server.authenticated) {
      console.log("  ✓ You are authenticated");
    } else {
      console.log("  ✗ Fix: Login to the application first");
    }

    if (this.results.browser.formData) {
      console.log("  ✓ FormData API is working");
    } else {
      console.log("  ✗ Fix: Update your browser");
    }

    console.log("\n" + "=".repeat(60));
    console.log("📚 Next steps: Check server logs and run debug script");
    console.log("=".repeat(60));
  },

  // Helper to send test SOS (requires auth token)
  async testSOSSend() {
    this.logSection("Test SOS Send (Requires Auth)");

    const token = localStorage.getItem("token");
    if (!token) {
      this.log("✗ No authentication token. Please login first.", "error");
      return;
    }

    try {
      // Create test audio
      const audioBlob = new Blob(["test audio data"], {
        type: "audio/wav",
      });
      const formData = new FormData();

      formData.append("message", "🧪 Frontend Debug Test SOS");
      formData.append("severity", "HIGH");
      formData.append(
        "location",
        JSON.stringify({
          address: "Test Location",
          latitude: 40.7128,
          longitude: -74.006,
        })
      );
      formData.append("audio", audioBlob, "test.wav");

      this.log("Sending test SOS...", "debug");

      const response = await fetch(
        this.config.serverUrl + this.config.sosEndpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        this.log("✓ Test SOS sent successfully!", "success");
        this.log(JSON.stringify(data, null, 2), "debug");
      } else {
        this.log(`✗ Test SOS failed: ${data.message}`, "error");
        this.log(JSON.stringify(data, null, 2), "debug");
      }
    } catch (error) {
      this.log(`✗ Error: ${error.message}`, "error");
    }
  },
};

// Auto-start diagnosis
window.AudioDebugger.diagnose();

// Print available commands
console.log("\n" + "=".repeat(60));
console.log("%c🎯 Available Commands:", "color: #00aa00; font-weight: bold;");
console.log("=".repeat(60));
console.log("  AudioDebugger.diagnose()     - Run full diagnosis");
console.log("  AudioDebugger.testSOSSend()  - Send test SOS (requires login)");
console.log("  AudioDebugger.results        - View detailed results");
