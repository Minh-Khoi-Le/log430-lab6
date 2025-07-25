# Database Seeder Container

This Docker container provides a reliable way to seed your retail management system database with demo data.

## Quick Reference

```bash
# Start database and seed with demo data
docker-compose up postgres -d
scripts/seed-database.bat normal    # Windows
./scripts/seed-database.sh normal   # Linux/macOS

# Force seed (clears existing data)
scripts/seed-database.bat force     # Windows  
./scripts/seed-database.sh force    # Linux/macOS
```

## What Gets Seeded

- **2 Users**: admin/admin123 (manager), client/client123 (client)
- **3 Stores**: Downtown, Mall, Airport locations
- **25+ Products**: Electronics, clothing, sports, kitchen, home items
- **30+ Inventory Items**: Stock levels across stores
- **4 Sales Records**: Sample transaction history
- **1 Refund Record**: Sample refund data

## Container Architecture

```
├── services/db-seeder/
│   ├── Dockerfile          # Container definition
│   ├── package.json        # Dependencies
│   ├── seed.js            # Main seeding logic
│   └── .env.example       # Environment template
├── docker-compose.seed.yml # Seeding compose file
└── scripts/
    ├── seed-database.bat   # Windows script
    └── seed-database.sh    # Unix script
```

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/log430_store
NODE_ENV=development
PRISMA_HIDE_UPDATE_MESSAGE=true
```

## Safety Features

1. **Existence Check**: Normal mode skips if data already exists
2. **Force Flag**: `--force` provides controlled data clearing
3. **Health Checks**: Waits for database readiness
4. **Transaction Safety**: Proper rollback on errors
5. **Logging**: Comprehensive progress and error reporting

## Integration with Main Stack

The seeder integrates seamlessly with your existing docker-compose setup:

- Depends on `postgres` service health check
- Uses same database connection as main services
- Isolated in separate profile to avoid conflicts
- Can run before or after main services

## Troubleshooting

**Container won't start:**
```bash
# Check database connectivity
docker-compose up postgres -d
docker-compose logs postgres

# Check seeder logs
docker-compose -f docker-compose.yml -f docker-compose.seed.yml logs db-seeder-standalone
```

**Permission issues:**
```bash
# Ensure scripts are executable (Linux/macOS)
chmod +x scripts/seed-database.sh
```

**Database connection issues:**
```bash
# Verify database is running and accessible
docker-compose exec postgres psql -U postgres -d log430_store -c "\dt"
```

This containerized approach ensures consistent seeding across development, testing, and demo environments!
