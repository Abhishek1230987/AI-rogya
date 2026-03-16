# Database Configuration Files

## Active Configuration
- **database.js** - Current database configuration (PostgreSQL connection pooling)

## Archived/Deprecated Configurations
The following are older configuration approaches. They are preserved for reference but should NOT be used.

- **database-flexible.js** - Flexible configuration approach (deprecated)
- **database-hybrid.js** - Hybrid configuration approach (deprecated)

Use `database.js` for all new development and deployment.

## Configuration Details

See `database.js` for:
- PostgreSQL connection pooling
- Database initialization on startup
- Schema creation
- Connection error handling

## Environment Variables Required

See `.env.example` or project documentation for required environment variables:
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
