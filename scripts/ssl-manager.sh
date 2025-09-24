#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERT_DIR="${CERT_DIR:-$PROJECT_ROOT/certs}"
CONFIG_FILE="${CONFIG_FILE:-$PROJECT_ROOT/ssl-config.json}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

error() {
    log "ERROR: $*" >&2
    exit 1
}

usage() {
    cat << EOF
SSL Certificate Manager

Usage: $0 [OPTIONS] COMMAND

COMMANDS:
    generate-dev        Generate self-signed certificates for development
    request-cert        Request SSL certificate from Let's Encrypt
    renew-cert          Renew SSL certificate
    check-expiry        Check certificate expiration
    backup-certs        Backup SSL certificates
    restore-certs       Restore SSL certificates from backup
    validate-config     Validate SSL configuration
    test-ssl            Test SSL configuration
    monitor             Monitor SSL certificate status
    rotate-keys         Rotate SSL keys

OPTIONS:
    -d, --domain        Domain name for certificate
    -e, --email         Email for Let's Encrypt registration
    --staging           Use Let's Encrypt staging environment
    --dry-run           Show what would be done without executing
    --backup-dir        Directory for certificate backups
    --config            SSL configuration file
    -v, --verbose       Verbose output
    -h, --help          Show this help message

EXAMPLES:
    $0 generate-dev
    $0 request-cert -d familyfinance.app -e admin@familyfinance.app
    $0 renew-cert -d familyfinance.app
    $0 check-expiry -d familyfinance.app
    $0 backup-certs --backup-dir /backups/ssl
    $0 test-ssl -d familyfinance.app

ENVIRONMENT VARIABLES:
    CERT_DIR                Certificate directory (default: ./certs)
    LETSENCRYPT_EMAIL       Email for Let's Encrypt
    CLOUDFLARE_API_TOKEN    Cloudflare API token for DNS challenge
    CERT_BACKUP_KEY         Encryption key for certificate backups
EOF
}

check_dependencies() {
    local missing_deps=()

    if ! command -v openssl >/dev/null 2>&1; then
        missing_deps+=("openssl")
    fi

    if ! command -v certbot >/dev/null 2>&1 && [[ "$1" == "letsencrypt" ]]; then
        missing_deps+=("certbot")
    fi

    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "Missing required dependencies: ${missing_deps[*]}"
    fi
}

ensure_cert_dir() {
    if [[ ! -d "$CERT_DIR" ]]; then
        log "Creating certificate directory: $CERT_DIR"
        mkdir -p "$CERT_DIR"
        chmod 700 "$CERT_DIR"
    fi
}

generate_dev_certs() {
    local domain="${1:-localhost}"

    log "Generating self-signed certificate for development: $domain"
    ensure_cert_dir

    # Generate private key
    openssl genpkey -algorithm RSA -out "$CERT_DIR/dev-key.pem" -pkcs8 -aes256 \
        -pass pass:"${DEV_CERT_PASSWORD:-development}"

    # Generate certificate signing request
    openssl req -new -key "$CERT_DIR/dev-key.pem" -out "$CERT_DIR/dev-csr.pem" \
        -passin pass:"${DEV_CERT_PASSWORD:-development}" \
        -subj "/C=US/ST=Development/L=Local/O=Family Finance/CN=$domain"

    # Generate self-signed certificate
    openssl x509 -req -in "$CERT_DIR/dev-csr.pem" -signkey "$CERT_DIR/dev-key.pem" \
        -out "$CERT_DIR/dev-cert.pem" -days 365 \
        -passin pass:"${DEV_CERT_PASSWORD:-development}" \
        -extensions v3_req -extfile <(cat << EOF
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $domain
DNS.2 = localhost
DNS.3 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
)

    # Create unencrypted key for development
    openssl rsa -in "$CERT_DIR/dev-key.pem" -out "$CERT_DIR/dev-key-unencrypted.pem" \
        -passin pass:"${DEV_CERT_PASSWORD:-development}"

    # Set appropriate permissions
    chmod 600 "$CERT_DIR"/*.pem

    log "Development certificates generated successfully"
    log "Certificate: $CERT_DIR/dev-cert.pem"
    log "Private key: $CERT_DIR/dev-key-unencrypted.pem"

    # Cleanup
    rm -f "$CERT_DIR/dev-csr.pem"
}

request_letsencrypt_cert() {
    local domain="$1"
    local email="${2:-$LETSENCRYPT_EMAIL}"
    local staging="${3:-false}"

    if [[ -z "$email" ]]; then
        error "Email is required for Let's Encrypt certificate request"
    fi

    log "Requesting Let's Encrypt certificate for: $domain"
    check_dependencies "letsencrypt"
    ensure_cert_dir

    local server_arg=""
    if [[ "$staging" == "true" ]]; then
        server_arg="--staging"
        log "Using Let's Encrypt staging environment"
    fi

    # Request certificate using webroot challenge
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$email" \
        --agree-tos \
        --non-interactive \
        $server_arg \
        -d "$domain" \
        --cert-path "$CERT_DIR/${domain}-cert.pem" \
        --key-path "$CERT_DIR/${domain}-key.pem" \
        --fullchain-path "$CERT_DIR/${domain}-fullchain.pem" \
        --chain-path "$CERT_DIR/${domain}-chain.pem"

    log "Certificate requested successfully for $domain"
}

request_cloudflare_cert() {
    local domain="$1"
    local email="${2:-$LETSENCRYPT_EMAIL}"

    if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
        error "CLOUDFLARE_API_TOKEN is required for Cloudflare DNS challenge"
    fi

    log "Requesting Let's Encrypt certificate for $domain using Cloudflare DNS challenge"
    check_dependencies "letsencrypt"
    ensure_cert_dir

    # Request certificate using DNS challenge with Cloudflare
    certbot certonly \
        --dns-cloudflare \
        --dns-cloudflare-credentials <(cat << EOF
dns_cloudflare_api_token = $CLOUDFLARE_API_TOKEN
EOF
) \
        --email "$email" \
        --agree-tos \
        --non-interactive \
        -d "$domain" \
        -d "*.$domain" \
        --cert-path "$CERT_DIR/${domain}-cert.pem" \
        --key-path "$CERT_DIR/${domain}-key.pem" \
        --fullchain-path "$CERT_DIR/${domain}-fullchain.pem" \
        --chain-path "$CERT_DIR/${domain}-chain.pem"

    log "Wildcard certificate requested successfully for $domain"
}

renew_certificate() {
    local domain="$1"

    log "Renewing certificate for: $domain"
    check_dependencies "letsencrypt"

    certbot renew --cert-name "$domain" --deploy-hook "systemctl reload nginx || true"

    log "Certificate renewed successfully for $domain"
}

check_certificate_expiry() {
    local domain="$1"
    local cert_file="$CERT_DIR/${domain}-cert.pem"

    if [[ ! -f "$cert_file" ]]; then
        error "Certificate file not found: $cert_file"
    fi

    log "Checking certificate expiry for: $domain"

    local expiry_date
    expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
    local expiry_epoch
    expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch
    current_epoch=$(date +%s)
    local days_remaining
    days_remaining=$(( (expiry_epoch - current_epoch) / 86400 ))

    log "Certificate for $domain expires on: $expiry_date"
    log "Days remaining: $days_remaining"

    if [[ $days_remaining -lt 30 ]]; then
        log "WARNING: Certificate expires in less than 30 days!"
        return 1
    elif [[ $days_remaining -lt 7 ]]; then
        log "CRITICAL: Certificate expires in less than 7 days!"
        return 2
    fi

    return 0
}

backup_certificates() {
    local backup_dir="${1:-./backups/certs}"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$backup_dir/certs-backup-$timestamp.tar.gz"

    log "Backing up certificates to: $backup_file"

    mkdir -p "$backup_dir"

    # Create encrypted backup if encryption key is provided
    if [[ -n "${CERT_BACKUP_KEY:-}" ]]; then
        tar -czf - -C "$CERT_DIR" . | \
        openssl enc -aes-256-cbc -salt -k "$CERT_BACKUP_KEY" > "$backup_file.enc"
        log "Encrypted backup created: $backup_file.enc"
    else
        tar -czf "$backup_file" -C "$CERT_DIR" .
        log "Backup created: $backup_file"
    fi

    # Set secure permissions
    chmod 600 "$backup_file"* 2>/dev/null || true
}

restore_certificates() {
    local backup_file="$1"
    local restore_dir="${2:-$CERT_DIR}"

    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi

    log "Restoring certificates from: $backup_file"

    mkdir -p "$restore_dir"

    # Restore encrypted backup if it's encrypted
    if [[ "$backup_file" == *.enc ]]; then
        if [[ -z "${CERT_BACKUP_KEY:-}" ]]; then
            error "CERT_BACKUP_KEY is required to restore encrypted backup"
        fi

        openssl enc -aes-256-cbc -d -salt -k "$CERT_BACKUP_KEY" -in "$backup_file" | \
        tar -xzf - -C "$restore_dir"
    else
        tar -xzf "$backup_file" -C "$restore_dir"
    fi

    # Set secure permissions
    chmod 600 "$restore_dir"/*.pem 2>/dev/null || true

    log "Certificates restored to: $restore_dir"
}

validate_ssl_config() {
    local domain="$1"
    local cert_file="$CERT_DIR/${domain}-cert.pem"
    local key_file="$CERT_DIR/${domain}-key.pem"

    log "Validating SSL configuration for: $domain"

    if [[ ! -f "$cert_file" ]]; then
        error "Certificate file not found: $cert_file"
    fi

    if [[ ! -f "$key_file" ]]; then
        error "Private key file not found: $key_file"
    fi

    # Validate certificate
    if ! openssl x509 -in "$cert_file" -noout -text >/dev/null 2>&1; then
        error "Invalid certificate file: $cert_file"
    fi

    # Validate private key
    if ! openssl rsa -in "$key_file" -check -noout >/dev/null 2>&1; then
        error "Invalid private key file: $key_file"
    fi

    # Check if certificate and key match
    local cert_modulus
    cert_modulus=$(openssl x509 -in "$cert_file" -noout -modulus | openssl md5)
    local key_modulus
    key_modulus=$(openssl rsa -in "$key_file" -noout -modulus | openssl md5)

    if [[ "$cert_modulus" != "$key_modulus" ]]; then
        error "Certificate and private key do not match"
    fi

    log "SSL configuration is valid for $domain"
}

test_ssl_connection() {
    local domain="$1"
    local port="${2:-443}"

    log "Testing SSL connection to: $domain:$port"

    if ! openssl s_client -connect "$domain:$port" -servername "$domain" \
         -verify_return_error -brief </dev/null; then
        error "SSL connection test failed for $domain:$port"
    fi

    log "SSL connection test successful for $domain:$port"
}

monitor_certificates() {
    local domains=("$@")

    if [[ ${#domains[@]} -eq 0 ]]; then
        domains=("localhost")
    fi

    log "Monitoring SSL certificates for: ${domains[*]}"

    for domain in "${domains[@]}"; do
        log "Checking certificate for: $domain"

        if check_certificate_expiry "$domain"; then
            log "✓ Certificate for $domain is valid"
        else
            local exit_code=$?
            if [[ $exit_code -eq 1 ]]; then
                log "⚠ Certificate for $domain expires soon"
            elif [[ $exit_code -eq 2 ]]; then
                log "🚨 Certificate for $domain expires very soon!"
            fi
        fi
    done
}

rotate_ssl_keys() {
    local domain="$1"
    local email="${2:-$LETSENCRYPT_EMAIL}"

    log "Rotating SSL keys for: $domain"

    # Backup current certificates
    backup_certificates "./backups/certs/rotation-$(date +%Y%m%d-%H%M%S)"

    # Generate new private key
    openssl genpkey -algorithm RSA -out "$CERT_DIR/${domain}-new-key.pem" -pkcs8

    # Generate new certificate signing request
    openssl req -new -key "$CERT_DIR/${domain}-new-key.pem" \
        -out "$CERT_DIR/${domain}-new-csr.pem" \
        -subj "/C=US/ST=State/L=City/O=Family Finance/CN=$domain"

    # Request new certificate with new key
    request_letsencrypt_cert "$domain" "$email"

    # Replace old keys after successful renewal
    mv "$CERT_DIR/${domain}-key.pem" "$CERT_DIR/${domain}-old-key.pem"
    mv "$CERT_DIR/${domain}-new-key.pem" "$CERT_DIR/${domain}-key.pem"

    # Cleanup
    rm -f "$CERT_DIR/${domain}-new-csr.pem"

    log "SSL keys rotated successfully for $domain"
}

main() {
    local command=""
    local domain=""
    local email=""
    local staging=false
    local dry_run=false
    local backup_dir=""
    local verbose=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--domain)
                domain="$2"
                shift 2
                ;;
            -e|--email)
                email="$2"
                shift 2
                ;;
            --staging)
                staging=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --backup-dir)
                backup_dir="$2"
                shift 2
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            generate-dev|request-cert|renew-cert|check-expiry|backup-certs|restore-certs|validate-config|test-ssl|monitor|rotate-keys)
                command="$1"
                shift
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    if [[ -z "$command" ]]; then
        error "Command is required. Use -h for help."
    fi

    if [[ "$verbose" == "true" ]]; then
        set -x
    fi

    case "$command" in
        generate-dev)
            generate_dev_certs "${domain:-localhost}"
            ;;
        request-cert)
            [[ -z "$domain" ]] && error "Domain is required for certificate request"
            request_letsencrypt_cert "$domain" "$email" "$staging"
            ;;
        renew-cert)
            [[ -z "$domain" ]] && error "Domain is required for certificate renewal"
            renew_certificate "$domain"
            ;;
        check-expiry)
            [[ -z "$domain" ]] && error "Domain is required for expiry check"
            check_certificate_expiry "$domain"
            ;;
        backup-certs)
            backup_certificates "${backup_dir:-./backups/certs}"
            ;;
        restore-certs)
            [[ $# -eq 0 ]] && error "Backup file is required for certificate restoration"
            restore_certificates "$1" "${2:-$CERT_DIR}"
            ;;
        validate-config)
            [[ -z "$domain" ]] && error "Domain is required for configuration validation"
            validate_ssl_config "$domain"
            ;;
        test-ssl)
            [[ -z "$domain" ]] && error "Domain is required for SSL test"
            test_ssl_connection "$domain"
            ;;
        monitor)
            if [[ -z "$domain" ]]; then
                monitor_certificates
            else
                monitor_certificates "$domain"
            fi
            ;;
        rotate-keys)
            [[ -z "$domain" ]] && error "Domain is required for key rotation"
            rotate_ssl_keys "$domain" "$email"
            ;;
        *)
            error "Unknown command: $command"
            ;;
    esac

    log "SSL management operation completed successfully"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi