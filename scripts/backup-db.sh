#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

usage() {
    cat << EOF
Database Backup Strategy Script

Usage: $0 [OPTIONS]

OPTIONS:
    -t, --type      Backup type (full|incremental|schema-only) [default: full]
    -o, --output    Output directory for backups [default: ./backups]
    -r, --retention Retention days for backups [default: 30]
    -c, --compress  Enable compression (true|false) [default: true]
    -f, --format    Backup format (sql|custom|directory) [default: custom]
    --cron          Show example cron configuration
    --restore       Restore from backup file
    --list          List available backups
    --cleanup       Remove old backups based on retention policy
    -h, --help      Show this help message

EXAMPLES:
    $0 --type full --output /backups/family-finance
    $0 --restore /backups/family-finance/backup-2024-01-15-120000.custom
    $0 --cleanup --retention 7
    $0 --list
    $0 --cron

ENVIRONMENT VARIABLES:
    DATABASE_URL            Full database connection string (required)
    BACKUP_ENCRYPTION_KEY   Key for backup encryption (optional)
    BACKUP_S3_BUCKET        S3 bucket for remote backup storage (optional)
    AWS_ACCESS_KEY_ID       AWS credentials for S3 upload (optional)
    AWS_SECRET_ACCESS_KEY   AWS credentials for S3 upload (optional)
EOF
}

show_cron_config() {
    cat << EOF
Example Cron Configuration:

# Daily full backup at 2 AM
0 2 * * * $SCRIPT_DIR/backup-db.sh --type full --output /var/backups/family-finance

# Hourly incremental backups during business hours (9 AM - 5 PM)
0 9-17 * * 1-5 $SCRIPT_DIR/backup-db.sh --type incremental --output /var/backups/family-finance

# Weekly cleanup (remove backups older than 30 days)
0 3 * * 0 $SCRIPT_DIR/backup-db.sh --cleanup --retention 30

# Schema-only backup before deployments
# (run manually or via CI/CD)
$SCRIPT_DIR/backup-db.sh --type schema-only --output /var/backups/schema

Add to crontab with: crontab -e
EOF
}

check_dependencies() {
    local missing_deps=()

    if ! command -v pg_dump >/dev/null 2>&1; then
        missing_deps+=("pg_dump")
    fi

    if ! command -v pg_restore >/dev/null 2>&1; then
        missing_deps+=("pg_restore")
    fi

    if [[ "$COMPRESS" == "true" ]] && ! command -v gzip >/dev/null 2>&1; then
        missing_deps+=("gzip")
    fi

    if [[ -n "$BACKUP_S3_BUCKET" ]] && ! command -v aws >/dev/null 2>&1; then
        missing_deps+=("aws-cli")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "Missing required dependencies: ${missing_deps[*]}"
    fi
}

parse_database_url() {
    if [[ -z "${DATABASE_URL:-}" ]]; then
        error "DATABASE_URL environment variable is required"
    fi

    # Parse Neon connection string format
    # postgresql://user:password@host:port/database?options
    if [[ $DATABASE_URL =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        error "Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database"
    fi
}

create_backup_dir() {
    if [[ ! -d "$OUTPUT_DIR" ]]; then
        log "Creating backup directory: $OUTPUT_DIR"
        mkdir -p "$OUTPUT_DIR"
    fi
}

generate_backup_filename() {
    local timestamp=$(date '+%Y%m%d-%H%M%S')
    local suffix=""

    case "$FORMAT" in
        "sql")
            suffix=".sql"
            ;;
        "custom")
            suffix=".custom"
            ;;
        "directory")
            suffix=""
            ;;
    esac

    if [[ "$COMPRESS" == "true" && "$FORMAT" == "sql" ]]; then
        suffix="${suffix}.gz"
    fi

    echo "backup-${BACKUP_TYPE}-${timestamp}${suffix}"
}

perform_full_backup() {
    local filename="$1"
    local filepath="$OUTPUT_DIR/$filename"

    log "Starting full backup: $filename"

    case "$FORMAT" in
        "sql")
            if [[ "$COMPRESS" == "true" ]]; then
                PGPASSWORD="$DB_PASSWORD" pg_dump \
                    --host="$DB_HOST" \
                    --port="$DB_PORT" \
                    --username="$DB_USER" \
                    --dbname="$DB_NAME" \
                    --verbose \
                    --no-password \
                    --format=plain \
                    --no-owner \
                    --no-privileges | gzip > "$filepath"
            else
                PGPASSWORD="$DB_PASSWORD" pg_dump \
                    --host="$DB_HOST" \
                    --port="$DB_PORT" \
                    --username="$DB_USER" \
                    --dbname="$DB_NAME" \
                    --verbose \
                    --no-password \
                    --format=plain \
                    --no-owner \
                    --no-privileges \
                    --file="$filepath"
            fi
            ;;
        "custom")
            PGPASSWORD="$DB_PASSWORD" pg_dump \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --verbose \
                --no-password \
                --format=custom \
                --compress=9 \
                --no-owner \
                --no-privileges \
                --file="$filepath"
            ;;
        "directory")
            mkdir -p "$filepath"
            PGPASSWORD="$DB_PASSWORD" pg_dump \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --verbose \
                --no-password \
                --format=directory \
                --compress=9 \
                --no-owner \
                --no-privileges \
                --file="$filepath"
            ;;
    esac

    log "Full backup completed: $filepath"
}

perform_schema_backup() {
    local filename="$1"
    local filepath="$OUTPUT_DIR/$filename"

    log "Starting schema-only backup: $filename"

    case "$FORMAT" in
        "sql")
            if [[ "$COMPRESS" == "true" ]]; then
                PGPASSWORD="$DB_PASSWORD" pg_dump \
                    --host="$DB_HOST" \
                    --port="$DB_PORT" \
                    --username="$DB_USER" \
                    --dbname="$DB_NAME" \
                    --verbose \
                    --no-password \
                    --format=plain \
                    --schema-only \
                    --no-owner \
                    --no-privileges | gzip > "$filepath"
            else
                PGPASSWORD="$DB_PASSWORD" pg_dump \
                    --host="$DB_HOST" \
                    --port="$DB_PORT" \
                    --username="$DB_USER" \
                    --dbname="$DB_NAME" \
                    --verbose \
                    --no-password \
                    --format=plain \
                    --schema-only \
                    --no-owner \
                    --no-privileges \
                    --file="$filepath"
            fi
            ;;
        "custom")
            PGPASSWORD="$DB_PASSWORD" pg_dump \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --verbose \
                --no-password \
                --format=custom \
                --schema-only \
                --compress=9 \
                --no-owner \
                --no-privileges \
                --file="$filepath"
            ;;
    esac

    log "Schema backup completed: $filepath"
}

perform_incremental_backup() {
    log "Incremental backups require WAL-E or similar tool for PostgreSQL"
    log "For Neon database, consider using their continuous backup features"
    log "Falling back to full backup for now..."

    perform_full_backup "$1"
}

encrypt_backup() {
    local filepath="$1"

    if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
        log "Encrypting backup: $filepath"

        if command -v openssl >/dev/null 2>&1; then
            openssl enc -aes-256-cbc -salt -in "$filepath" -out "${filepath}.enc" -k "$BACKUP_ENCRYPTION_KEY"
            rm "$filepath"
            echo "${filepath}.enc"
        else
            log "WARNING: openssl not available, backup not encrypted"
            echo "$filepath"
        fi
    else
        echo "$filepath"
    fi
}

upload_to_s3() {
    local filepath="$1"
    local filename=$(basename "$filepath")

    if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
        log "Uploading backup to S3: s3://$BACKUP_S3_BUCKET/$filename"

        if aws s3 cp "$filepath" "s3://$BACKUP_S3_BUCKET/$filename"; then
            log "S3 upload completed successfully"
        else
            log "WARNING: S3 upload failed"
        fi
    fi
}

create_backup_metadata() {
    local filepath="$1"
    local metadata_file="${filepath}.metadata"

    cat > "$metadata_file" << EOF
{
    "backup_type": "$BACKUP_TYPE",
    "format": "$FORMAT",
    "compressed": $COMPRESS,
    "database": "$DB_NAME",
    "host": "$DB_HOST",
    "timestamp": "$(date -Iseconds)",
    "size_bytes": $(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null || echo "0"),
    "checksum": "$(shasum -a 256 "$filepath" | cut -d' ' -f1)"
}
EOF

    log "Created metadata file: $metadata_file"
}

restore_backup() {
    local backup_file="$1"

    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi

    log "Restoring from backup: $backup_file"

    # Decrypt if needed
    local restore_file="$backup_file"
    if [[ "$backup_file" == *.enc ]]; then
        if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            error "BACKUP_ENCRYPTION_KEY required to decrypt backup"
        fi

        restore_file="${backup_file%.enc}"
        log "Decrypting backup..."
        openssl enc -aes-256-cbc -d -in "$backup_file" -out "$restore_file" -k "$BACKUP_ENCRYPTION_KEY"
    fi

    # Determine restore method based on file extension
    case "$restore_file" in
        *.sql.gz)
            log "Restoring from compressed SQL backup..."
            gunzip -c "$restore_file" | PGPASSWORD="$DB_PASSWORD" psql \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME"
            ;;
        *.sql)
            log "Restoring from SQL backup..."
            PGPASSWORD="$DB_PASSWORD" psql \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --file="$restore_file"
            ;;
        *.custom)
            log "Restoring from custom format backup..."
            PGPASSWORD="$DB_PASSWORD" pg_restore \
                --host="$DB_HOST" \
                --port="$DB_PORT" \
                --username="$DB_USER" \
                --dbname="$DB_NAME" \
                --verbose \
                --no-password \
                --clean \
                --if-exists \
                "$restore_file"
            ;;
        *)
            if [[ -d "$restore_file" ]]; then
                log "Restoring from directory format backup..."
                PGPASSWORD="$DB_PASSWORD" pg_restore \
                    --host="$DB_HOST" \
                    --port="$DB_PORT" \
                    --username="$DB_USER" \
                    --dbname="$DB_NAME" \
                    --verbose \
                    --no-password \
                    --clean \
                    --if-exists \
                    "$restore_file"
            else
                error "Unknown backup format: $restore_file"
            fi
            ;;
    esac

    # Clean up decrypted file if we created one
    if [[ "$backup_file" == *.enc && -f "$restore_file" ]]; then
        rm "$restore_file"
    fi

    log "Restore completed successfully"
}

list_backups() {
    if [[ ! -d "$OUTPUT_DIR" ]]; then
        log "Backup directory does not exist: $OUTPUT_DIR"
        return 0
    fi

    log "Available backups in $OUTPUT_DIR:"

    find "$OUTPUT_DIR" -name "backup-*" -type f | sort | while read -r backup_file; do
        local metadata_file="${backup_file}.metadata"
        local size="unknown"
        local date="unknown"

        if [[ -f "$metadata_file" ]]; then
            size=$(grep '"size_bytes"' "$metadata_file" | sed 's/.*: *\([0-9]*\).*/\1/' | numfmt --to=iec 2>/dev/null || echo "unknown")
            date=$(grep '"timestamp"' "$metadata_file" | sed 's/.*: *"\([^"]*\)".*/\1/')
        else
            if command -v stat >/dev/null 2>&1; then
                size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
                if [[ -n "$size" ]]; then
                    size=$(echo "$size" | numfmt --to=iec 2>/dev/null || echo "$size bytes")
                fi
            fi
            date=$(stat -f%Sm -t "%Y-%m-%d %H:%M:%S" "$backup_file" 2>/dev/null || stat -c%y "$backup_file" 2>/dev/null | cut -d. -f1 || echo "unknown")
        fi

        printf "%-50s %10s %s\n" "$(basename "$backup_file")" "$size" "$date"
    done
}

cleanup_old_backups() {
    if [[ ! -d "$OUTPUT_DIR" ]]; then
        log "Backup directory does not exist: $OUTPUT_DIR"
        return 0
    fi

    log "Cleaning up backups older than $RETENTION_DAYS days in $OUTPUT_DIR"

    find "$OUTPUT_DIR" -name "backup-*" -type f -mtime +$RETENTION_DAYS | while read -r old_backup; do
        log "Removing old backup: $(basename "$old_backup")"
        rm -f "$old_backup"
        rm -f "${old_backup}.metadata"
    done

    log "Cleanup completed"
}

main() {
    # Default values
    BACKUP_TYPE="full"
    OUTPUT_DIR="./backups"
    RETENTION_DAYS=30
    COMPRESS="true"
    FORMAT="custom"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -t|--type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -c|--compress)
                COMPRESS="$2"
                shift 2
                ;;
            -f|--format)
                FORMAT="$2"
                shift 2
                ;;
            --cron)
                show_cron_config
                exit 0
                ;;
            --restore)
                if [[ -z "${2:-}" ]]; then
                    error "--restore requires a backup file path"
                fi
                parse_database_url
                check_dependencies
                restore_backup "$2"
                exit 0
                ;;
            --list)
                list_backups
                exit 0
                ;;
            --cleanup)
                cleanup_old_backups
                exit 0
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    # Validate arguments
    case "$BACKUP_TYPE" in
        "full"|"incremental"|"schema-only")
            ;;
        *)
            error "Invalid backup type: $BACKUP_TYPE. Must be full, incremental, or schema-only"
            ;;
    esac

    case "$FORMAT" in
        "sql"|"custom"|"directory")
            ;;
        *)
            error "Invalid format: $FORMAT. Must be sql, custom, or directory"
            ;;
    esac

    case "$COMPRESS" in
        "true"|"false")
            ;;
        *)
            error "Invalid compress value: $COMPRESS. Must be true or false"
            ;;
    esac

    # Perform backup
    parse_database_url
    check_dependencies
    create_backup_dir

    local filename=$(generate_backup_filename)

    case "$BACKUP_TYPE" in
        "full")
            perform_full_backup "$filename"
            ;;
        "schema-only")
            perform_schema_backup "$filename"
            ;;
        "incremental")
            perform_incremental_backup "$filename"
            ;;
    esac

    local filepath="$OUTPUT_DIR/$filename"

    # Encrypt if requested
    filepath=$(encrypt_backup "$filepath")

    # Create metadata
    create_backup_metadata "$filepath"

    # Upload to S3 if configured
    upload_to_s3 "$filepath"

    log "Backup process completed successfully: $filepath"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi