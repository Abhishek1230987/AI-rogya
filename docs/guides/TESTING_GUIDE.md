# 🧪 Multilingual Consultation System - Testing Guide

**Date**: November 8, 2025  
**Version**: 1.0

---

## 📋 Pre-Testing Checklist

### **Setup Requirements**

- [ ] Server running (`npm run server` in `/server`)
- [ ] Frontend running (`npm run dev` in `/client`)
- [ ] Database connected and migrations run
- [ ] Gemini API key configured in `.env`
- [ ] Logged in as test user

### **Browser Requirements**

- [ ] Modern browser (Chrome, Firefox, Safari, Edge)
- [ ] JavaScript enabled
- [ ] Cookies/localStorage enabled
- [ ] Microphone access granted (for voice tests)

---

## ✅ Test Cases

### **Test Group 1: Language Selection & Detection**

#### **Test 1.1: Language Dropdown Display**

```
Steps:
1. Open application
2. Look at top-right corner for language selector
3. Click on language dropdown

Expected:
- [ ] Dropdown opens
- [ ] Shows 12 languages
- [ ] Shows flag icons
- [ ] Shows native names
- [ ] Shows English names

Languages to verify:
- [ ] English (English) 🇬🇧
- [ ] Hindi (हिंदी) 🇮🇳
- [ ] Bengali (বাংলা) 🇮🇳
- [ ] Tamil (தமிழ்) 🇮🇳
- [ ] Telugu (తెలుగు) 🇮🇳
- [ ] Marathi (मराठी) 🇮🇳
- [ ] Gujarati (ગુજરાતી) 🇮🇳
- [ ] Kannada (ಕನ್ನಡ) 🇮🇳
- [ ] Odia (ଓଡ଼ିଆ) 🇮🇳
- [ ] Urdu (اردو) 🇵🇰
- [ ] Assamese (অসমীয়া) 🇮🇳
- [ ] Maithili (मैथिली) 🇮🇳
```

#### **Test 1.2: Language Selection Persistence**

```
Steps:
1. Select Hindi from dropdown
2. Navigate to another page
3. Come back
4. Check language selector

Expected:
- [ ] Hindi still selected
- [ ] localStorage shows "selectedLanguage": "hi"
```

#### **Test 1.3: Script Detection (Hindi)**

```
Steps:
1. Go to Text Consultation
2. Select "English" (or keep as Auto)
3. Type in Devanagari: "मुझे बुखार है"
4. Send

Expected:
- [ ] System detects Hindi automatically
- [ ] Response in Hindi Devanagari
- [ ] No Hinglish in response
```

---

### **Test Group 2: Text Consultation - Multiple Languages**

#### **Test 2.1: English Consultation**

```
Steps:
1. Select English from dropdown
2. Type: "I have a fever and headache"
3. Click Send

Expected:
- [ ] Request sent successfully
- [ ] Response in English
- [ ] No script mixing
- [ ] Professional medical advice
- [ ] Consider medical history if available
```

**Sample Response**:

```
A fever and headache can have various causes. Common reasons include:
- Viral infection (flu, cold)
- Bacterial infection
- Tension or stress-related headache

I recommend:
1. Rest and stay hydrated
2. Monitor your temperature
3. If symptoms persist > 3 days, see a doctor
```

---

#### **Test 2.2: Hindi Consultation**

```
Steps:
1. Select Hindi from dropdown
2. Type: "मुझे बुखार है और सिर दर्द भी है"
3. Click Send

Expected:
- [ ] Request sent successfully
- [ ] Response ONLY in Devanagari script
- [ ] NOT in Hinglish
- [ ] Professional medical advice
- [ ] Context from medical history
```

**Expected Response Type** (in Hindi, Devanagari):

```
आपको बुखार और सिर दर्द हो रहे हैं। यह सामान्य कारणों से हो सकता है:
- वायरल संक्रमण
- बैक्टीरियल संक्रमण
- तनाव से संबंधित सिर दर्द

मेरी सिफारिश:
1. पर्याप्त आराम करें
2. पानी खूब पिएं
3. यदि लक्षण 3 दिन से अधिक रहें तो डॉक्टर से मिलें
```

---

#### **Test 2.3: Tamil Consultation**

```
Steps:
1. Select Tamil from dropdown
2. Type: "என்னுக்கு குளிர் மற்றும் தொண்டை வலி உள்ளது"
3. Click Send

Expected:
- [ ] Response ONLY in Tamil script
- [ ] No English/Hinglish
- [ ] Medical advice relevant to symptoms
```

---

#### **Test 2.4: Telugu Consultation**

```
Steps:
1. Select Telugu from dropdown
2. Type: "నాకు జ్వరం ఉన్నాయి"
3. Click Send

Expected:
- [ ] Response in Telugu script only
- [ ] Proper medical guidance
```

---

#### **Test 2.5: Marathi Consultation**

```
Steps:
1. Select Marathi
2. Type: "मला ताप आणि खोकला आहे"
3. Click Send

Expected:
- [ ] Response in Marathi (Devanagari)
- [ ] Different from Hindi response
- [ ] Proper Marathi terminology
```

---

#### **Test 2.6: Gujarati Consultation**

```
Steps:
1. Select Gujarati
2. Type: "મને તાવ છે"
3. Click Send

Expected:
- [ ] Response in Gujarati script only
- [ ] Proper Gujarati text
```

---

#### **Test 2.7: Kannada Consultation**

```
Steps:
1. Select Kannada
2. Type: "ನನಗೆ ಜ್ವರವಿದೆ"
3. Click Send

Expected:
- [ ] Response in Kannada script
```

---

#### **Test 2.8: Bengali Consultation**

```
Steps:
1. Select Bengali
2. Type: "আমার জ্বর আছে"
3. Click Send

Expected:
- [ ] Response in Bengali script
```

---

#### **Test 2.9: Odia Consultation**

```
Steps:
1. Select Odia
2. Type: "ମୋତେ ଜ୍ବର ଅଛି"
3. Click Send

Expected:
- [ ] Response in Odia script
```

---

#### **Test 2.10: Urdu Consultation**

```
Steps:
1. Select Urdu
2. Type: "مجھے بخار ہے"
3. Click Send

Expected:
- [ ] Response in Urdu script
- [ ] Right-to-left text handling (if supported)
```

---

#### **Test 2.11: Assamese Consultation**

```
Steps:
1. Select Assamese
2. Type: "মোৰ জ্ৱর আছে"
3. Click Send

Expected:
- [ ] Response in Assamese script
```

---

#### **Test 2.12: Maithili Consultation**

```
Steps:
1. Select Maithili
2. Type: "मोहमे बुखार अछि"
3. Click Send

Expected:
- [ ] Response in Maithili script
```

---

### **Test Group 3: Auto-Detection**

#### **Test 3.1: Auto-Detect Hindi (Hinglish)**

```
Steps:
1. Keep language as "Auto" or "English"
2. Type Hinglish: "mujhe bukhar hai"
3. Send

Expected:
- [ ] System may respond in English OR
- [ ] System may detect intent and respond appropriately
```

#### **Test 3.2: Auto-Detect from Script**

```
Steps:
1. Keep language as "Auto"
2. Type: "नमस्ते, मुझे बुखार है"
3. Send

Expected:
- [ ] System detects Devanagari script → Hindi
- [ ] Response in Hindi
```

---

### **Test Group 4: Voice Consultation**

#### **Test 4.1: Voice Text Consultation (English)**

```
Steps:
1. Go to Voice Consultation page
2. Select English
3. Type: "I have stomach pain"
4. Click Send

Expected:
- [ ] Response in English
- [ ] Medical advice for stomach pain
```

#### **Test 4.2: Voice Text Consultation (Hindi)**

```
Steps:
1. Go to Voice Consultation page
2. Select Hindi
3. Type: "मेरे पेट में दर्द है"
4. Click Send

Expected:
- [ ] Response in Hindi Devanagari
- [ ] Medical advice in Hindi
```

#### **Test 4.3: Voice Audio Consultation (English)**

```
Steps:
1. Go to Voice Consultation
2. Click Record button
3. Say: "I have a fever"
4. Stop recording
5. Wait for transcription

Expected:
- [ ] Audio recorded
- [ ] Transcription: "I have a fever"
- [ ] Response in English
- [ ] Medical advice
```

#### **Test 4.4: Voice Audio Consultation (Hindi)**

```
Steps:
1. Go to Voice Consultation
2. Select Hindi
3. Click Record
4. Say in Hindi: "मुझे बुखार है"
5. Stop recording

Expected:
- [ ] Audio recorded
- [ ] Transcription in Devanagari
- [ ] Response in Hindi
```

---

### **Test Group 5: Medical History Integration**

#### **Test 5.1: History Consideration in English**

```
Steps:
1. Add medical history (allergies, medications)
2. Select English
3. Ask: "I want to take an aspirin"
4. Send

Expected:
- [ ] Response considers medical history
- [ ] Warnings about allergies (if any)
- [ ] Medication interactions mentioned
```

#### **Test 5.2: History Consideration in Hindi**

```
Steps:
1. Ensure medical history is set
2. Select Hindi
3. Type: "क्या मैं एस्पिरिन ले सकता हूँ?"
4. Send

Expected:
- [ ] Response in Hindi
- [ ] Considers allergies/medications
- [ ] Personalized advice
```

---

### **Test Group 6: Consultation History**

#### **Test 6.1: History Displays Correctly**

```
Steps:
1. Perform consultations in 3 different languages
2. Go to consultation history
3. Check each entry

Expected:
- [ ] All 3 consultations listed
- [ ] Each shows original language
- [ ] Timestamp correct
- [ ] Response text correct
```

#### **Test 6.2: History Language Display**

```
Steps:
1. Click on Hindi consultation in history
2. View details

Expected:
- [ ] Original query in Hindi
- [ ] Response in Hindi
- [ ] Language metadata shown
```

---

### **Test Group 7: Text-to-Speech**

#### **Test 7.1: Narration in English**

```
Steps:
1. Get a response in English
2. Click speaker icon
3. Listen

Expected:
- [ ] Audio plays
- [ ] Voice in English
- [ ] Proper pronunciation
```

#### **Test 7.2: Narration in Hindi**

```
Steps:
1. Get a response in Hindi
2. Click speaker icon
3. Listen

Expected:
- [ ] Audio plays
- [ ] Voice in Hindi (if available)
- [ ] Proper pronunciation of Hindi
```

#### **Test 7.3: Narration in Tamil**

```
Steps:
1. Get response in Tamil
2. Click speaker icon

Expected:
- [ ] Audio plays
- [ ] Tamil language voice (if available)
```

---

### **Test Group 8: Edge Cases**

#### **Test 8.1: Mixed Language Input**

```
Steps:
1. Type: "मुझे fever है" (Mix Hindi + English)
2. Send

Expected:
- [ ] System detects dominant language OR
- [ ] Responds with language handling mixed input gracefully
```

#### **Test 8.2: Special Characters**

```
Steps:
1. Type: "नमस्ते! क्या मैं कुछ दवा ले सकता हूँ??"
2. Send

Expected:
- [ ] Special characters handled
- [ ] Response generated correctly
```

#### **Test 8.3: Long Consultation**

```
Steps:
1. Type: Long consultation text (500+ characters)
2. Send

Expected:
- [ ] Text sent successfully
- [ ] Response generated
- [ ] No truncation errors
```

#### **Test 8.4: Empty Message**

```
Steps:
1. Click Send without typing
2. Check error

Expected:
- [ ] Error message: "Message is required"
- [ ] No API call made
```

---

### **Test Group 9: Performance**

#### **Test 9.1: Response Time (English)**

```
Steps:
1. Send English consultation
2. Note response time

Expected:
- [ ] Response within 5-10 seconds
- [ ] No timeout errors
```

#### **Test 9.2: Response Time (Hindi)**

```
Steps:
1. Send Hindi consultation
2. Note response time

Expected:
- [ ] Response within 5-10 seconds
- [ ] No performance degradation
```

#### **Test 9.3: Multiple Consecutive Requests**

```
Steps:
1. Send 5 consultations rapidly
2. Check responses

Expected:
- [ ] All requests processed
- [ ] All responses correct
- [ ] No rate limiting errors
```

---

### **Test Group 10: Accessibility**

#### **Test 10.1: Language Selector Accessibility**

```
Steps:
1. Use Tab key to navigate to language selector
2. Use arrow keys to select language

Expected:
- [ ] Keyboard navigation works
- [ ] Selection changes
- [ ] Screen reader announces language
```

#### **Test 10.2: Input Field Accessibility**

```
Steps:
1. Use Tab to reach message input
2. Type using keyboard
3. Send using keyboard (Enter/Ctrl+Enter)

Expected:
- [ ] Keyboard input works
- [ ] Message sent
- [ ] No focus loss
```

---

## 📊 Test Results Template

### **Tester Information**

```
Name: ___________________
Date: ___________________
Browser: ________________
OS: _____________________
```

### **Test Results**

```
Test Group 1: Language Selection & Detection
  Test 1.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 1.2: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 1.3: [ ] PASS [ ] FAIL [ ] PARTIAL

Test Group 2: Text Consultation
  Test 2.1 (English): [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 2.2 (Hindi): [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 2.3 (Tamil): [ ] PASS [ ] FAIL [ ] PARTIAL
  ... (continue for all tests)

Test Group 3: Auto-Detection
  Test 3.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 3.2: [ ] PASS [ ] FAIL [ ] PARTIAL

Test Group 4: Voice Consultation
  Test 4.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 4.2: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 4.3: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 4.4: [ ] PASS [ ] FAIL [ ] PARTIAL

Test Group 5: Medical History Integration
  Test 5.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 5.2: [ ] PASS [ ] FAIL [ ] PARTIAL

Test Group 6: Consultation History
  Test 6.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 6.2: [ ] PASS [ ] FAIL [ ] PARTIAL

Test Group 7: Text-to-Speech
  Test 7.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 7.2: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 7.3: [ ] PASS [ ] FAIL [ ] PARTIAL

Test Group 8: Edge Cases
  Test 8.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 8.2: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 8.3: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 8.4: [ ] PASS [ ] FAIL [ ] PARTIAL

Test Group 9: Performance
  Test 9.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 9.2: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 9.3: [ ] PASS [ ] FAIL [ ] PARTIAL

Test Group 10: Accessibility
  Test 10.1: [ ] PASS [ ] FAIL [ ] PARTIAL
  Test 10.2: [ ] PASS [ ] FAIL [ ] PARTIAL
```

### **Issues Found**

```
Issue #1:
- Test: ________________
- Description: ________________
- Steps to Reproduce: ________________
- Expected: ________________
- Actual: ________________
- Severity: [ ] Critical [ ] High [ ] Medium [ ] Low

Issue #2:
- Test: ________________
...
```

### **Overall Assessment**

```
Total Tests: 30+
Passed: ____
Failed: ____
Partial: ____
Success Rate: _____%

Ready for Production: [ ] YES [ ] NO [ ] WITH FIXES
```

---

## 🎯 Testing Priority

### **Critical (Must Pass)**

1. Language dropdown shows 12 languages
2. Text consultation works in all 12 languages
3. Response in correct language/script
4. No script mixing
5. Medical history integration

### **High (Should Pass)**

1. Voice consultation works
2. History display correct
3. Performance acceptable
4. Persistence of language selection

### **Medium (Nice to Have)**

1. Text-to-speech working
2. Edge cases handled
3. Keyboard accessibility
4. Auto-detection working

---

## 📝 Sign-Off

```
Tested By: ___________________
Date: ___________________
Approved By: ___________________
Date: ___________________

Ready for Production Release: [ ] YES [ ] NO
```

---

**Good luck with testing! 🚀**
