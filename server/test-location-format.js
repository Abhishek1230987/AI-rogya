import { formatSOSMessage } from "./src/services/telegramService.js";

// Test with actual location data
const userData = {
  name: "Demo",
  email: "demo6@gmail.com",
  age: 25,
};

const sosData = {
  message: "Emergency",
  location: {
    latitude: 28.6139,
    longitude: 77.209,
    accuracy: 50,
    address: "Near Delhi, India",
  },
  severity: "HIGH",
  timestamp: new Date().toISOString(),
};

console.log("🧪 Testing formatted SOS message with location:\n");
console.log(
  "======================================================================"
);
console.log(formatSOSMessage(userData, sosData));
console.log(
  "======================================================================\n"
);

// Test with coordinates only
const sosData2 = {
  message: "Emergency assistance needed",
  location: {
    latitude: 28.6139,
    longitude: 77.209,
    accuracy: 50,
  },
  severity: "CRITICAL",
  timestamp: new Date().toISOString(),
};

console.log("🧪 Testing with coordinates only:\n");
console.log(
  "======================================================================"
);
console.log(formatSOSMessage(userData, sosData2));
console.log(
  "======================================================================\n"
);

// Test with no location
const sosData3 = {
  message: "Emergency",
  location: null,
  severity: "HIGH",
  timestamp: new Date().toISOString(),
};

console.log("🧪 Testing with no location:\n");
console.log(
  "======================================================================"
);
console.log(formatSOSMessage(userData, sosData3));
console.log(
  "======================================================================\n"
);
