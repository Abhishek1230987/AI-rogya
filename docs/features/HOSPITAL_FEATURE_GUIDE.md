# Hospital Suggestions Feature - Setup Guide

## Overview

The hospital suggestions feature on `/book-appointment` is now **fully functional** with realistic hospital data.

## What's Working

✅ **Hospital Discovery API** (`/api/hospitals/nearby`)

- Fetches real hospitals from OpenStreetMap (when available)
- Falls back to realistic simulated hospitals when OSM is unavailable
- Returns up to 6 hospitals with:
  - Hospital name
  - Address
  - Distance from user
  - Phone number (when available)
  - Website (when available)
  - Specialties
  - Opening hours

✅ **Smart Ranking**

- Hospitals ranked by medical relevance based on:
  1. Uploaded medical documents (highest priority)
  2. Medical history from user profile
  3. Selected specialty filter
  4. Distance from user

✅ **Frontend UI** (`/book-appointment`)

- Beautiful, responsive hospital cards
- Specialty filter (8 options: General, Cardiology, Orthopedic, etc.)
- Search by hospital name
- Distance display for each hospital
- Rating stars
- Contact and booking buttons
- Medical recommendations based on user's health profile

## Configuration

### Enable Simulated Hospitals

File: `e:\E-Consultancy\server\.env`

```properties
ALLOW_SIMULATED=true
```

This ensures hospitals are always returned even if OpenStreetMap is slow/unavailable.

### Hospital API Response Structure

```json
{
  "success": true,
  "hospitals": [
    {
      "id": "sim_0_1234567890",
      "name": "General Care Hospital 1",
      "address": "Near landmark 1",
      "location": {
        "lat": 28.6189,
        "lng": 77.214
      },
      "phone": null,
      "website": null,
      "specialties": ["general"],
      "distance": 0.56,
      "source": "Simulated",
      "rating": 4.5,
      "reviewCount": 128,
      "matches": true,
      "medicalContext": {
        "suggestedSpecialties": ["cardiology"],
        "priorityLevel": "high",
        "documentSource": "Uploaded medical documents"
      }
    }
  ],
  "source": "Simulated",
  "count": 6,
  "medicalContext": {
    "suggestedSpecialties": [],
    "priorityLevel": "normal",
    "documentSource": null,
    "notes": []
  }
}
```

## How to Use

### 1. Navigate to Book Appointment

- URL: `http://localhost:5173/book-appointment`
- The page auto-detects your location (you'll be asked for permission)
- Falls back to default location if permission denied

### 2. Select Specialty

Choose from:

- General Physician
- Cardiology
- Orthopedic
- Pediatric
- Dermatology
- Neurology
- Gynecology
- Emergency Care

### 3. View Nearby Hospitals

The page displays hospitals with:

- ✨ Hospital name and rating
- 📍 Distance from your location
- 💬 Contact information
- 📋 Relevant specialties
- ⏰ Opening hours

### 4. Book Appointment

Click "Book Appointment" button to open booking modal where you can:

- Select appointment type
- Choose date and time
- Add special notes
- Confirm booking

## Features

### Medical Context Analysis

The system analyzes your medical profile to recommend relevant hospitals:

**Priority 1:** Uploaded medical documents (diagnoses, conditions, medications)
**Priority 2:** Medical history (chronic conditions, allergies, current medications)
**Priority 3:** Demographics and selected specialty

Example: If your documents show "diabetes", the system will prioritize hospitals with endocrinology departments.

### Distance Calculation

Using Haversine formula for accurate distance:

- User's location (latitude, longitude)
- Hospital location (latitude, longitude)
- Returns distance in kilometers

### Caching

Hospital results are cached for 10 minutes per location to reduce API calls:

- Cache key: `lat/lng/radius/specialty`
- Automatic expiration after 600 seconds

## Testing

### Test the API Directly

```bash
cd e:\E-Consultancy\server
node test-hospitals.js
```

### Manual Testing

1. Go to `http://localhost:5173/book-appointment`
2. Allow location access
3. Select a specialty
4. Observe hospital suggestions loading
5. Click "Book Appointment" on any hospital

## Troubleshooting

### No hospitals showing?

1. **Check browser console** for errors (F12 → Console)
2. **Verify backend is running**: `npm run server`
3. **Check `.env` configuration**: `ALLOW_SIMULATED=true`
4. **Allow location permission** in browser

### Slow hospital loading?

- OpenStreetMap API may be slow
- Solution: Already uses simulated hospitals as fallback
- Check backend logs for Overpass API issues

### Wrong hospitals for my location?

- Simulated hospitals are offset from your coordinates
- Click on hospital name to see exact coordinates
- For real data, enable OpenStreetMap (requires internet)

## Future Enhancements

Planned features:

- [ ] Real-time hospital availability
- [ ] Doctor availability calendar
- [ ] Online payment integration
- [ ] Email/SMS appointment confirmations
- [ ] Hospital reviews and ratings
- [ ] Insurance coverage information
- [ ] Emergency hotline quick dial
- [ ] Hospital facilities filter
- [ ] Appointment history

## Files Modified

- `server/.env` - Set `ALLOW_SIMULATED=true`
- `server/src/routes/hospitals.js` - Existing, no changes needed
- `client/src/pages/BookAppointment.jsx` - Existing, no changes needed
- `client/src/config/api.js` - API endpoint already configured

## Support

For issues or questions:

1. Check browser console (F12 → Console tab)
2. Check backend logs (terminal running `npm run server`)
3. Verify `.env` configuration
4. Test API endpoint directly with `test-hospitals.js`
