# Data Import Directory

Place your SQL files here for manual import into the database.

## Usage

Import all files:
```bash
docker-compose --profile manual run --rm data-importer
```

Import specific category (if filename contains the keyword):
```bash
docker-compose --profile manual run --rm -e IMPORT_MODE=customers data-importer
docker-compose --profile manual run --rm -e IMPORT_MODE=repairs data-importer
```

Force re-import (overwrite existing):
```bash
docker-compose --profile manual run --rm -e FORCE_IMPORT=true data-importer
```

## Database Connection

The importer connects using the DATABASE_URL environment variable. For docker-compose:
```bash
# In your .env file:
DATABASE_URL=postgres://handyshop:handyshop_password@postgres:5432/handyshop
```

**Important**: Use `postgres` as the hostname (not `localhost`) when using the bundled PostgreSQL service.

## File Naming Convention

Files are processed in alphabetical order:
- `001-customers.sql` - Customer data
- `002-repairs.sql` - Repair records  
- `003-devices.sql` - Device information
- `999-cleanup.sql` - Post-import cleanup

## Creating Your Import Files

**The importer supports both dump files and INSERT statements:**

### Option 1: Standard pg_dump (Recommended)
```bash
# Export specific tables
pg_dump -t customers your_database > 001-customers.sql
pg_dump -t repairs your_database > 002-repairs.sql

# Export all data
pg_dump --data-only --no-owner --no-acl your_database > full-data-export.sql
```
*These files contain COPY FROM STDIN blocks and are imported using psql automatically.*

### Option 2: INSERT statements
```bash
# For INSERT-based files
pg_dump -t customers --inserts your_database > 001-customers.sql
```
*These files are imported using node-postgres with transaction safety.*

**The importer automatically detects the file format and uses the appropriate method.**

## Important Notes

- Files are processed in a transaction - if one fails, it rolls back
- Already imported files are skipped (unless FORCE_IMPORT=true)
- Large files should be split into smaller chunks
- Both pg_dump COPY format and INSERT statements are supported
- The system automatically detects which import method to use