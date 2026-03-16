# Scripts Directory

This directory contains utility scripts for setup, testing, and diagnostics.

## Directory Structure

### `/setup` - Setup and Initialization Scripts

- **init-sos.js** - Initialize SOS system
- **setup-sos-system.js** - Complete SOS system setup
- **check-schema.js** - Verify database schema

### `/tests` - Testing Scripts

- **test-upload.js** - Test file upload functionality
- **test-endpoints.js** - Test all API endpoints
- **test-full-flow.js** - Test complete application flow
- **test-direct-upload.js** - Test direct upload mechanism
- **test-express-fileupload.js** - Test express-fileupload integration
- **test-native-formdata.js** - Test native FormData API
- **test-upload-final.js** - Final upload testing
- **test-with-valid-token.js** - Test with authentication token

### `/diagnostics` - Debugging and Diagnostics

- **check_duplicate_contacts.sql** - SQL script to check for duplicate emergency contacts
- **DIAGNOSTIC.sh** - Diagnostic shell script for system issues
- **show_fix_summary.sh** - Display summary of fixes applied

## Running Scripts

### From setup/

```bash
node scripts/setup/init-sos.js
node scripts/setup/setup-sos-system.js
node scripts/setup/check-schema.js
```

### From tests/

```bash
node scripts/tests/test-endpoints.js
node scripts/tests/test-upload.js
```

### From diagnostics/

```bash
bash scripts/diagnostics/DIAGNOSTIC.sh
```

## Notes

- Never run these in production without understanding what they do
- Always backup database before running setup scripts
- Test scripts should only be run in development/staging environments
