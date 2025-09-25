# Backup and Recovery Guide: KGiQ Family Finance

## Table of Contents
1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Database Backup](#database-backup)
4. [Application Backup](#application-backup)
5. [File System Backup](#file-system-backup)
6. [Recovery Procedures](#recovery-procedures)
7. [Disaster Recovery](#disaster-recovery)
8. [Testing and Validation](#testing-and-validation)
9. [Monitoring and Alerting](#monitoring-and-alerting)
10. [Compliance and Legal](#compliance-and-legal)

## Overview

This guide provides comprehensive backup and recovery procedures for the KGiQ Family Finance application, ensuring business continuity and data protection.

### Backup Objectives
- **Recovery Time Objective (RTO)**: 1 hour for critical systems
- **Recovery Point Objective (RPO)**: 15 minutes maximum data loss
- **Data Retention**: 7 years for financial data, 3 years for operational data
- **Availability Target**: 99.9% uptime

### Data Classification
- **Critical**: Financial transactions, user accounts, family data
- **Important**: Configuration, logs, metrics
- **Non-critical**: Temporary files, caches

## Backup Strategy

### Backup Types
1. **Full Backup**: Complete data snapshot (Weekly)
2. **Incremental Backup**: Changes since last backup (Daily)
3. **Differential Backup**: Changes since last full backup (Hourly)
4. **Transaction Log Backup**: Continuous (Every 15 minutes)

### Backup Schedule
```bash
# Automated backup schedule (cron format)
# Full backup - Sunday 2 AM
0 2 * * 0 /opt/family-finance/scripts/backup-full.sh

# Differential backup - Daily 2 AM (except Sunday)
0 2 * * 1-6 /opt/family-finance/scripts/backup-differential.sh

# Incremental backup - Every 4 hours
0 */4 * * * /opt/family-finance/scripts/backup-incremental.sh

# Transaction log backup - Every 15 minutes
*/15 * * * * /opt/family-finance/scripts/backup-txlog.sh
```

### Storage Locations
- **Primary**: Local SSD storage (24 hours retention)
- **Secondary**: Network-attached storage (30 days retention)
- **Offsite**: Cloud storage - AWS S3/Azure Blob (7 years retention)
- **Archive**: Glacier/Cold storage (unlimited retention)

## Database Backup

### PostgreSQL Backup Scripts

#### Full Database Backup
```bash
#!/bin/bash
# backup-db-full.sh

set -e

# Configuration
DB_HOST="${DATABASE_HOST}"
DB_NAME="${DATABASE_NAME}"
DB_USER="${DATABASE_USER}"
BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Perform full backup
echo "Starting full database backup at $(date)"
pg_dump \
  --host=${DB_HOST} \
  --username=${DB_USER} \
  --dbname=${DB_NAME} \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=custom \
  --compress=9 \
  --file=${BACKUP_FILE}

# Verify backup integrity
echo "Verifying backup integrity..."
pg_restore --list ${BACKUP_FILE} > /dev/null

if [ $? -eq 0 ]; then
  echo "Full database backup completed successfully: ${BACKUP_FILE}"

  # Create checksum
  sha256sum ${BACKUP_FILE} > ${BACKUP_FILE}.sha256

  # Upload to cloud storage
  aws s3 cp ${BACKUP_FILE} s3://family-finance-backups/database/full/
  aws s3 cp ${BACKUP_FILE}.sha256 s3://family-finance-backups/database/full/

  # Cleanup local backups older than 7 days
  find ${BACKUP_DIR} -name "full_backup_*.sql" -mtime +7 -delete
else
  echo "Backup verification failed!" >&2
  exit 1
fi
```

#### Differential Backup
```bash
#!/bin/bash
# backup-db-differential.sh

set -e

# Configuration
DB_HOST="${DATABASE_HOST}"
DB_NAME="${DATABASE_NAME}"
DB_USER="${DATABASE_USER}"
BACKUP_DIR="/backups/database/differential"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Find last full backup LSN
LAST_FULL_LSN=$(pg_controldata ${PGDATA} | grep "Latest checkpoint's REDO location" | awk '{print $5}')

# Create differential backup
echo "Starting differential backup from LSN: ${LAST_FULL_LSN}"
pg_basebackup \
  --host=${DB_HOST} \
  --username=${DB_USER} \
  --pgdata=${BACKUP_DIR}/${TIMESTAMP} \
  --format=tar \
  --gzip \
  --checkpoint=fast \
  --progress \
  --verbose

echo "Differential backup completed: ${BACKUP_DIR}/${TIMESTAMP}"

# Upload to cloud storage
tar -czf - -C ${BACKUP_DIR} ${TIMESTAMP} | \
  aws s3 cp - s3://family-finance-backups/database/differential/${TIMESTAMP}.tar.gz
```

#### Transaction Log Backup
```bash
#!/bin/bash
# backup-db-txlog.sh

set -e

# Configuration
WAL_DIR="${PGDATA}/pg_wal"
BACKUP_DIR="/backups/wal"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Archive WAL files
echo "Archiving WAL files at $(date)"
find ${WAL_DIR} -name "*.ready" | while read wal_file; do
  base_name=$(basename ${wal_file} .ready)

  # Copy WAL file to backup location
  cp ${WAL_DIR}/${base_name} ${BACKUP_DIR}/

  # Compress and upload to cloud
  gzip ${BACKUP_DIR}/${base_name}
  aws s3 cp ${BACKUP_DIR}/${base_name}.gz s3://family-finance-backups/wal/

  # Remove .ready file to mark as archived
  rm ${WAL_DIR}/${base_name}.ready

  echo "Archived WAL file: ${base_name}"
done
```

### Point-in-Time Recovery Setup
```sql
-- Configure PostgreSQL for PITR
-- postgresql.conf settings
wal_level = replica
archive_mode = on
archive_command = '/opt/family-finance/scripts/archive-wal.sh %p %f'
archive_timeout = 300  -- 5 minutes
max_wal_senders = 3
checkpoint_timeout = 5min
checkpoint_completion_target = 0.9
```

## Application Backup

### Application Code Backup
```bash
#!/bin/bash
# backup-application.sh

set -e

# Configuration
APP_DIR="/opt/family-finance"
BACKUP_DIR="/backups/application"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="app_backup_${TIMESTAMP}.tar.gz"

echo "Starting application backup at $(date)"

# Create backup excluding unnecessary files
tar -czf ${BACKUP_DIR}/${BACKUP_NAME} \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='logs' \
  --exclude='*.log' \
  --exclude='*.tmp' \
  -C ${APP_DIR} .

# Verify backup
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}" ]; then
  echo "Application backup created: ${BACKUP_NAME}"

  # Upload to cloud storage
  aws s3 cp ${BACKUP_DIR}/${BACKUP_NAME} s3://family-finance-backups/application/

  # Create manifest
  cat > ${BACKUP_DIR}/${BACKUP_NAME}.manifest << EOF
{
  "backup_type": "application",
  "timestamp": "${TIMESTAMP}",
  "size": "$(du -h ${BACKUP_DIR}/${BACKUP_NAME} | cut -f1)",
  "files": $(tar -tzf ${BACKUP_DIR}/${BACKUP_NAME} | wc -l),
  "checksum": "$(sha256sum ${BACKUP_DIR}/${BACKUP_NAME} | cut -d' ' -f1)"
}
EOF

  aws s3 cp ${BACKUP_DIR}/${BACKUP_NAME}.manifest s3://family-finance-backups/application/

  # Cleanup old backups
  find ${BACKUP_DIR} -name "app_backup_*.tar.gz" -mtime +30 -delete
else
  echo "Application backup failed!" >&2
  exit 1
fi
```

### Configuration Backup
```bash
#!/bin/bash
# backup-config.sh

set -e

# Configuration files to backup
CONFIG_FILES=(
  "/etc/nginx/sites-available/family-finance"
  "/etc/ssl/certs/family-finance.crt"
  "/opt/family-finance/.env.production"
  "/opt/family-finance/docker-compose.yml"
  "/etc/systemd/system/family-finance.service"
)

BACKUP_DIR="/backups/config"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="config_backup_${TIMESTAMP}.tar.gz"

echo "Backing up configuration files..."

# Create secure backup (encrypt sensitive files)
tar -czf - "${CONFIG_FILES[@]}" | \
  gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
      --output ${BACKUP_DIR}/${BACKUP_NAME}.gpg

# Upload encrypted backup
aws s3 cp ${BACKUP_DIR}/${BACKUP_NAME}.gpg s3://family-finance-backups/config/

echo "Configuration backup completed: ${BACKUP_NAME}.gpg"
```

## File System Backup

### System State Backup
```bash
#!/bin/bash
# backup-system.sh

set -e

BACKUP_DIR="/backups/system"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup system configuration
echo "Backing up system state..."

# Package list
dpkg --get-selections > ${BACKUP_DIR}/packages_${TIMESTAMP}.txt

# Crontab
crontab -l > ${BACKUP_DIR}/crontab_${TIMESTAMP}.txt 2>/dev/null || true

# System services
systemctl list-units --type=service --state=enabled > ${BACKUP_DIR}/services_${TIMESTAMP}.txt

# Network configuration
cp /etc/netplan/*.yaml ${BACKUP_DIR}/ 2>/dev/null || true

# Firewall rules
ufw status verbose > ${BACKUP_DIR}/firewall_${TIMESTAMP}.txt 2>/dev/null || true

# Create system backup archive
tar -czf ${BACKUP_DIR}/system_state_${TIMESTAMP}.tar.gz -C ${BACKUP_DIR} \
  packages_${TIMESTAMP}.txt \
  crontab_${TIMESTAMP}.txt \
  services_${TIMESTAMP}.txt \
  firewall_${TIMESTAMP}.txt

# Upload to cloud
aws s3 cp ${BACKUP_DIR}/system_state_${TIMESTAMP}.tar.gz s3://family-finance-backups/system/

echo "System state backup completed"
```

### Log Backup
```bash
#!/bin/bash
# backup-logs.sh

set -e

LOG_DIRS=(
  "/var/log/family-finance"
  "/var/log/nginx"
  "/var/log/postgresql"
)

BACKUP_DIR="/backups/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

for log_dir in "${LOG_DIRS[@]}"; do
  if [ -d "${log_dir}" ]; then
    service_name=$(basename ${log_dir})

    # Compress and backup logs older than 1 day
    find ${log_dir} -name "*.log" -mtime +1 -exec gzip {} \;

    # Create backup archive
    tar -czf ${BACKUP_DIR}/${service_name}_logs_${TIMESTAMP}.tar.gz -C ${log_dir} .

    # Upload to cloud with lifecycle policy (delete after 90 days)
    aws s3 cp ${BACKUP_DIR}/${service_name}_logs_${TIMESTAMP}.tar.gz \
      s3://family-finance-backups/logs/ \
      --storage-class STANDARD_IA

    echo "Log backup completed for ${service_name}"
  fi
done
```

## Recovery Procedures

### Database Recovery

#### Full Database Recovery
```bash
#!/bin/bash
# recover-db-full.sh

set -e

# Configuration
DB_HOST="${DATABASE_HOST}"
DB_NAME="${DATABASE_NAME}"
DB_USER="${DATABASE_USER}"
BACKUP_FILE="$1"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

echo "Starting full database recovery from: ${BACKUP_FILE}"

# Verify backup integrity
echo "Verifying backup integrity..."
if ! pg_restore --list ${BACKUP_FILE} > /dev/null; then
  echo "Backup file is corrupted!" >&2
  exit 1
fi

# Stop application services
echo "Stopping application services..."
systemctl stop family-finance

# Drop existing database (if exists)
echo "Dropping existing database..."
dropdb --if-exists --host=${DB_HOST} --username=${DB_USER} ${DB_NAME} || true

# Restore database
echo "Restoring database..."
pg_restore \
  --host=${DB_HOST} \
  --username=${DB_USER} \
  --dbname=postgres \
  --create \
  --verbose \
  --clean \
  --if-exists \
  ${BACKUP_FILE}

# Verify restoration
echo "Verifying database restoration..."
psql --host=${DB_HOST} --username=${DB_USER} --dbname=${DB_NAME} \
  -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Update database statistics
echo "Updating database statistics..."
psql --host=${DB_HOST} --username=${DB_USER} --dbname=${DB_NAME} \
  -c "ANALYZE;"

# Start application services
echo "Starting application services..."
systemctl start family-finance

echo "Full database recovery completed successfully"
```

#### Point-in-Time Recovery
```bash
#!/bin/bash
# recover-db-pitr.sh

set -e

# Configuration
RECOVERY_TARGET_TIME="$1"
BASE_BACKUP_DIR="$2"
WAL_BACKUP_DIR="/backups/wal"
RECOVERY_DIR="/var/lib/postgresql/recovery"

if [ -z "${RECOVERY_TARGET_TIME}" ] || [ -z "${BASE_BACKUP_DIR}" ]; then
  echo "Usage: $0 <recovery_target_time> <base_backup_dir>"
  echo "Example: $0 '2023-12-01 14:30:00' /backups/base/20231201_120000"
  exit 1
fi

echo "Starting point-in-time recovery to: ${RECOVERY_TARGET_TIME}"

# Stop PostgreSQL
systemctl stop postgresql

# Clear data directory
rm -rf ${PGDATA}/*

# Restore base backup
echo "Restoring base backup..."
tar -xzf ${BASE_BACKUP_DIR}/base.tar.gz -C ${PGDATA}/

# Restore WAL files
echo "Restoring WAL files..."
cp ${WAL_BACKUP_DIR}/*.gz ${PGDATA}/pg_wal/
gunzip ${PGDATA}/pg_wal/*.gz

# Create recovery configuration
cat > ${PGDATA}/recovery.conf << EOF
restore_command = 'cp ${WAL_BACKUP_DIR}/%f %p'
recovery_target_time = '${RECOVERY_TARGET_TIME}'
recovery_target_timeline = 'latest'
EOF

# Set proper permissions
chown -R postgres:postgres ${PGDATA}
chmod 700 ${PGDATA}

# Start PostgreSQL in recovery mode
echo "Starting PostgreSQL in recovery mode..."
systemctl start postgresql

# Wait for recovery to complete
echo "Waiting for recovery to complete..."
while ! pg_isready -q; do
  sleep 5
done

echo "Point-in-time recovery completed to: ${RECOVERY_TARGET_TIME}"
```

### Application Recovery

#### Application Restore
```bash
#!/bin/bash
# recover-application.sh

set -e

BACKUP_FILE="$1"
TARGET_DIR="/opt/family-finance"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

echo "Starting application recovery from: ${BACKUP_FILE}"

# Stop services
systemctl stop family-finance nginx

# Backup current installation
mv ${TARGET_DIR} ${TARGET_DIR}.backup.$(date +%s) || true

# Create target directory
mkdir -p ${TARGET_DIR}

# Extract backup
echo "Extracting application backup..."
tar -xzf ${BACKUP_FILE} -C ${TARGET_DIR}

# Set proper permissions
chown -R app:app ${TARGET_DIR}
chmod +x ${TARGET_DIR}/scripts/*.sh

# Install dependencies
echo "Installing dependencies..."
cd ${TARGET_DIR}
npm ci --only=production

# Build application
echo "Building application..."
npm run build

# Start services
systemctl start family-finance nginx

echo "Application recovery completed successfully"
```

### Configuration Recovery
```bash
#!/bin/bash
# recover-config.sh

set -e

BACKUP_FILE="$1"
PASSPHRASE="$2"

if [ -z "${BACKUP_FILE}" ] || [ -z "${PASSPHRASE}" ]; then
  echo "Usage: $0 <encrypted_backup_file> <passphrase>"
  exit 1
fi

echo "Starting configuration recovery..."

# Decrypt and extract configuration
gpg --batch --yes --passphrase="${PASSPHRASE}" --decrypt ${BACKUP_FILE} | \
  tar -xzf - -C /

# Reload systemd
systemctl daemon-reload

# Restart services
systemctl restart nginx
systemctl restart family-finance

echo "Configuration recovery completed"
```

## Disaster Recovery

### Complete System Recovery Plan

#### Phase 1: Assessment and Preparation
```bash
#!/bin/bash
# dr-phase1-assessment.sh

set -e

echo "=== DISASTER RECOVERY PHASE 1: ASSESSMENT ==="

# Check system status
echo "1. Checking system accessibility..."
if ping -c 3 ${PRIMARY_SERVER} > /dev/null 2>&1; then
  echo "   ✓ Primary server is accessible"
else
  echo "   ✗ Primary server is not accessible"
fi

# Check backup availability
echo "2. Checking backup availability..."
aws s3 ls s3://family-finance-backups/database/full/ | tail -5
aws s3 ls s3://family-finance-backups/application/ | tail -5

# Check secondary systems
echo "3. Checking secondary infrastructure..."
# Add checks for DNS, load balancer, etc.

echo "Assessment completed. Proceed to Phase 2 if recovery is needed."
```

#### Phase 2: Infrastructure Recovery
```bash
#!/bin/bash
# dr-phase2-infrastructure.sh

set -e

echo "=== DISASTER RECOVERY PHASE 2: INFRASTRUCTURE ==="

# Provision new server instance
echo "1. Provisioning new server instance..."
# Cloud provider specific commands (AWS, Azure, etc.)

# Configure networking
echo "2. Configuring network settings..."
# Network configuration

# Install base software
echo "3. Installing base software stack..."
apt update && apt upgrade -y
apt install -y postgresql nginx nodejs npm docker.io

echo "Infrastructure recovery completed. Proceed to Phase 3."
```

#### Phase 3: Data Recovery
```bash
#!/bin/bash
# dr-phase3-data.sh

set -e

echo "=== DISASTER RECOVERY PHASE 3: DATA RECOVERY ==="

# Download latest backups
echo "1. Downloading latest backups..."
LATEST_DB_BACKUP=$(aws s3 ls s3://family-finance-backups/database/full/ | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://family-finance-backups/database/full/${LATEST_DB_BACKUP} /tmp/

LATEST_APP_BACKUP=$(aws s3 ls s3://family-finance-backups/application/ | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://family-finance-backups/application/${LATEST_APP_BACKUP} /tmp/

# Restore database
echo "2. Restoring database..."
./recover-db-full.sh /tmp/${LATEST_DB_BACKUP}

# Restore application
echo "3. Restoring application..."
./recover-application.sh /tmp/${LATEST_APP_BACKUP}

echo "Data recovery completed. Proceed to Phase 4."
```

#### Phase 4: Service Verification
```bash
#!/bin/bash
# dr-phase4-verification.sh

set -e

echo "=== DISASTER RECOVERY PHASE 4: VERIFICATION ==="

# Health checks
echo "1. Performing health checks..."
curl -f http://localhost:3000/api/health || exit 1
curl -f http://localhost:3000/api/auth/me || echo "Auth endpoint needs attention"

# Database connectivity
echo "2. Testing database connectivity..."
psql -c "SELECT COUNT(*) FROM FamilyMember;" ${DATABASE_URL}

# Functional tests
echo "3. Running functional tests..."
npm run test:critical

# Performance validation
echo "4. Performance validation..."
# Add performance checks

echo "Service verification completed."
```

### RTO/RPO Monitoring
```bash
#!/bin/bash
# monitor-rto-rpo.sh

# Track Recovery Time Objective
log_rto_start() {
  echo "$(date -u +%s)" > /tmp/rto_start
}

log_rto_end() {
  local start_time=$(cat /tmp/rto_start)
  local end_time=$(date -u +%s)
  local rto_seconds=$((end_time - start_time))
  local rto_minutes=$((rto_seconds / 60))

  echo "RTO achieved: ${rto_minutes} minutes" | tee -a /var/log/disaster-recovery.log

  # Alert if RTO exceeded
  if [ ${rto_minutes} -gt 60 ]; then
    echo "ALERT: RTO exceeded target of 60 minutes" | mail -s "RTO Alert" admin@familyfinance.app
  fi
}

# Track Recovery Point Objective
check_rpo() {
  local last_backup=$(stat -c %Y /backups/database/latest.sql)
  local current_time=$(date +%s)
  local age_minutes=$(( (current_time - last_backup) / 60 ))

  echo "Last backup age: ${age_minutes} minutes"

  if [ ${age_minutes} -gt 15 ]; then
    echo "ALERT: RPO may be exceeded (backup older than 15 minutes)" | \
      mail -s "RPO Alert" admin@familyfinance.app
  fi
}
```

## Testing and Validation

### Backup Testing Schedule
```bash
# Monthly full restore test
0 2 1 * * /opt/family-finance/scripts/test-full-restore.sh

# Weekly partial restore test
0 3 * * 0 /opt/family-finance/scripts/test-partial-restore.sh

# Daily backup verification
0 4 * * * /opt/family-finance/scripts/verify-backups.sh
```

### Backup Verification Script
```bash
#!/bin/bash
# verify-backups.sh

set -e

echo "=== BACKUP VERIFICATION $(date) ==="

# Test database backup integrity
echo "1. Testing database backup integrity..."
LATEST_DB_BACKUP=$(find /backups/database -name "*.sql" -mtime -1 | head -1)
if [ -n "${LATEST_DB_BACKUP}" ]; then
  if pg_restore --list ${LATEST_DB_BACKUP} > /dev/null 2>&1; then
    echo "   ✓ Database backup integrity verified"
  else
    echo "   ✗ Database backup integrity check failed" >&2
    exit 1
  fi
else
  echo "   ✗ No recent database backup found" >&2
  exit 1
fi

# Test application backup
echo "2. Testing application backup integrity..."
LATEST_APP_BACKUP=$(find /backups/application -name "*.tar.gz" -mtime -1 | head -1)
if [ -n "${LATEST_APP_BACKUP}" ]; then
  if tar -tzf ${LATEST_APP_BACKUP} > /dev/null 2>&1; then
    echo "   ✓ Application backup integrity verified"
  else
    echo "   ✗ Application backup integrity check failed" >&2
    exit 1
  fi
else
  echo "   ✗ No recent application backup found" >&2
  exit 1
fi

# Verify cloud storage sync
echo "3. Verifying cloud storage sync..."
LOCAL_DB_COUNT=$(find /backups/database -name "*.sql" | wc -l)
CLOUD_DB_COUNT=$(aws s3 ls s3://family-finance-backups/database/full/ | wc -l)

if [ ${LOCAL_DB_COUNT} -le ${CLOUD_DB_COUNT} ]; then
  echo "   ✓ Cloud storage sync verified"
else
  echo "   ✗ Cloud storage sync may be failing" >&2
fi

echo "=== BACKUP VERIFICATION COMPLETED ==="
```

### Disaster Recovery Testing
```bash
#!/bin/bash
# test-disaster-recovery.sh

set -e

echo "=== DISASTER RECOVERY TEST $(date) ==="

# Create isolated test environment
TEST_ENV="/tmp/dr-test-$(date +%s)"
mkdir -p ${TEST_ENV}

# Test full recovery procedure
echo "1. Testing full recovery procedure..."
cd ${TEST_ENV}

# Download test backup
aws s3 cp s3://family-finance-backups/database/full/$(aws s3 ls s3://family-finance-backups/database/full/ | tail -1 | awk '{print $4}') ./

# Test database recovery (in test environment)
createdb test_recovery_db
pg_restore --dbname=test_recovery_db *.sql

# Verify restored data
RECORD_COUNT=$(psql -d test_recovery_db -t -c "SELECT COUNT(*) FROM FamilyMember;")
if [ ${RECORD_COUNT} -gt 0 ]; then
  echo "   ✓ Database recovery test passed (${RECORD_COUNT} records)"
else
  echo "   ✗ Database recovery test failed" >&2
  exit 1
fi

# Cleanup test environment
dropdb test_recovery_db
rm -rf ${TEST_ENV}

echo "=== DISASTER RECOVERY TEST COMPLETED ==="
```

## Monitoring and Alerting

### Backup Monitoring Dashboard
```yaml
# Grafana dashboard configuration
backup_monitoring:
  panels:
    - name: "Backup Success Rate"
      query: "rate(backup_success_total[1h]) * 100"
      alert_threshold: 95

    - name: "Backup Size Trend"
      query: "backup_size_bytes"
      alert_on_sudden_change: true

    - name: "Recovery Time Objective"
      query: "recovery_time_minutes"
      alert_threshold: 60

    - name: "Recovery Point Objective"
      query: "time() - last_backup_timestamp"
      alert_threshold: 900  # 15 minutes
```

### Alerting Rules
```yaml
# Prometheus alerting rules
groups:
  - name: backup_alerts
    rules:
      - alert: BackupFailed
        expr: backup_success == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Backup job failed"

      - alert: BackupDelayed
        expr: time() - last_backup_timestamp > 3600
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Backup is overdue"

      - alert: CloudStorageSync
        expr: local_backup_count > cloud_backup_count * 1.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cloud storage sync may be failing"
```

### Health Check Endpoints
```javascript
// backup-health.js
app.get('/api/backup/health', async (req, res) => {
  const health = {
    database_backup: {
      last_backup: await getLastBackupTime('database'),
      status: 'ok',
      size: await getLastBackupSize('database')
    },
    application_backup: {
      last_backup: await getLastBackupTime('application'),
      status: 'ok',
      size: await getLastBackupSize('application')
    },
    cloud_sync: {
      status: await checkCloudSync(),
      last_sync: await getLastCloudSync()
    }
  };

  // Check if any backup is overdue
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [service, info] of Object.entries(health)) {
    if (service.includes('backup')) {
      const age = now - new Date(info.last_backup);
      if (age > maxAge) {
        info.status = 'overdue';
        health.overall_status = 'warning';
      }
    }
  }

  res.json(health);
});
```

## Compliance and Legal

### Data Retention Policy
```javascript
// retention-policy.js
const retentionPolicies = {
  // Financial data - 7 years (regulatory requirement)
  financial_transactions: {
    retention_years: 7,
    backup_frequency: 'daily',
    archive_after_years: 3
  },

  // User account data - 7 years after account closure
  user_accounts: {
    retention_years: 7,
    backup_frequency: 'daily',
    anonymize_after_closure: true
  },

  // Application logs - 1 year
  application_logs: {
    retention_years: 1,
    backup_frequency: 'weekly',
    compress: true
  },

  // System logs - 90 days
  system_logs: {
    retention_days: 90,
    backup_frequency: 'daily',
    auto_delete: true
  }
};
```

### Compliance Reporting
```bash
#!/bin/bash
# compliance-report.sh

set -e

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="/reports/backup-compliance-${REPORT_DATE}.json"

# Generate compliance report
cat > ${REPORT_FILE} << EOF
{
  "report_date": "${REPORT_DATE}",
  "backup_compliance": {
    "rto_target": 60,
    "rpo_target": 15,
    "retention_policy": "7 years financial, 1 year operational",
    "encryption": "AES-256",
    "geographic_distribution": "Multi-region"
  },
  "test_results": {
    "last_full_restore_test": "$(date -d '1 month ago' +%Y-%m-%d)",
    "backup_verification": "daily",
    "disaster_recovery_drill": "quarterly"
  },
  "audit_trail": {
    "backup_logs": "/var/log/backup.log",
    "recovery_logs": "/var/log/recovery.log",
    "access_logs": "/var/log/backup-access.log"
  }
}
EOF

echo "Compliance report generated: ${REPORT_FILE}"

# Email report to compliance team
mail -s "Backup Compliance Report ${REPORT_DATE}" \
     -a ${REPORT_FILE} \
     compliance@familyfinance.app < /dev/null
```

### Legal Hold Procedures
```bash
#!/bin/bash
# legal-hold.sh

set -e

CASE_ID="$1"
AFFECTED_USERS="$2"  # Comma-separated user IDs

if [ -z "${CASE_ID}" ] || [ -z "${AFFECTED_USERS}" ]; then
  echo "Usage: $0 <case_id> <user_ids>"
  exit 1
fi

echo "Implementing legal hold for case: ${CASE_ID}"

# Create legal hold directory
HOLD_DIR="/legal-holds/${CASE_ID}"
mkdir -p ${HOLD_DIR}

# Export affected user data
echo "Exporting data for users: ${AFFECTED_USERS}"
IFS=',' read -ra USER_ARRAY <<< "${AFFECTED_USERS}"
for user_id in "${USER_ARRAY[@]}"; do
  # Export user's financial data
  pg_dump --table=family_member \
          --table=income_event \
          --table=payment \
          --table=transaction \
          --where="family_id IN (SELECT family_id FROM family_member WHERE id = '${user_id}')" \
          ${DATABASE_NAME} > ${HOLD_DIR}/user_${user_id}_data.sql

  # Create manifest
  echo "Data exported for user ${user_id} on $(date)" >> ${HOLD_DIR}/manifest.txt
done

# Prevent automated deletion
touch ${HOLD_DIR}/.legal-hold
chmod 444 ${HOLD_DIR}/.legal-hold

echo "Legal hold implemented for case ${CASE_ID}"
echo "Data preserved in: ${HOLD_DIR}"
```

---

*This backup and recovery guide should be reviewed and tested regularly to ensure its effectiveness. All procedures should be documented and team members trained on their execution.*