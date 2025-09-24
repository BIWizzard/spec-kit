# API Rate Limiting Configuration

## Overview
The Family Finance web application implements comprehensive rate limiting that adapts based on environment, user tier, and IP reputation. This prevents abuse while providing a smooth experience for legitimate users.

## Environment-Specific Rate Limits

### Development Environment
- **General API**: 1000 requests per 15 minutes (very generous for testing)
- **Authentication**: 100 attempts per 15 minutes
- **Password Reset**: 20 attempts per hour
- **Bank Sync**: 50 requests per minute
- **File Upload**: 50 uploads per minute
- **Report Export**: 50 exports per minute

### Staging Environment
- **General API**: 200 requests per 15 minutes (moderate for testing)
- **Authentication**: 20 attempts per 15 minutes
- **Password Reset**: 10 attempts per hour
- **Bank Sync**: 10 requests per minute
- **File Upload**: 20 uploads per minute
- **Report Export**: 10 exports per minute

### Production Environment
- **General API**: 100 requests per 15 minutes (standard production)
- **Authentication**: 5 attempts per 15 minutes (strict security)
- **Password Reset**: 3 attempts per hour (very strict)
- **Bank Sync**: 3 requests per minute (prevents API abuse)
- **File Upload**: 10 uploads per minute
- **Report Export**: 5 exports per minute (resource management)

## User Tier-Based Limits

### Free Tier
- **Bank Sync**: 10 syncs per hour
- **Report Export**: 5 exports per 24 hours

### Premium Tier
- **Bank Sync**: 100 syncs per hour
- **Report Export**: 50 exports per 24 hours

### Family Tier
- **Bank Sync**: 200 syncs per hour
- **Report Export**: 100 exports per 24 hours

## IP-Based Adjustments

### Allowlisted IPs
- **Multiplier**: 10x higher limits
- **Includes**: localhost (127.0.0.1, ::1), monitoring services

### Suspicious IPs
- **Multiplier**: 0.1x lower limits (10x stricter)
- **Triggers**: Based on security event patterns

## Rate Limiting Implementation

### Configuration Files
- `/backend/src/config/rate-limits.ts` - Environment and tier configurations
- `/backend/src/middleware/rate-limit.ts` - Rate limiting middleware implementation

### Usage Examples

#### Basic Environment-Aware Rate Limiting
```typescript
import { rateLimitPresets } from '../middleware/rate-limit';

// Automatically uses environment-specific configuration
app.use('/api/auth', rateLimitPresets.auth());
app.use('/api/bank-sync', rateLimitPresets.bankSync());
```

#### User-Tier Rate Limiting
```typescript
import { userRateLimit } from '../middleware/rate-limit';

// Applies user tier limits with environment base
app.use('/api/bank-sync', userRateLimit('bankSync'));
app.use('/api/export', userRateLimit('reportExport'));
```

#### Family-Based Rate Limiting
```typescript
import { familyRateLimit } from '../middleware/rate-limit';

// Rate limit per family rather than per user
app.use('/api/family', familyRateLimit('general'));
```

## Headers and Response Format

### Standard Rate Limit Headers
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests in window
- `RateLimit-Reset`: Unix timestamp when limit resets

### Error Response (429 Too Many Requests)
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many authentication attempts, please try again later.",
  "retryAfter": 900
}
```

## Storage and Memory Management

### In-Memory Store
- **Cleanup**: Automatic cleanup every 60 seconds
- **Expiration**: Entries auto-expire based on window time
- **Scalability**: Suitable for single-instance deployments

### Redis Store (Future Enhancement)
For multi-instance deployments, a Redis-backed store should be implemented to share rate limit data across instances.

## Security Features

### Failed Attempt Tracking
- **Threshold**: 5 failed attempts triggers IP blocking
- **Block Duration**: 1 hour for repeated failures
- **Reset Period**: 15 minutes for attempt counters

### Suspicious Activity Detection
- **XSS Attempts**: Pattern detection with automatic blocking
- **SQL Injection**: Critical severity with 1-hour IP blocks
- **CSRF Violations**: High severity security event logging

## Monitoring and Alerting

### Sentry Integration
- **Critical Events**: SQL injection attempts trigger immediate alerts
- **Breadcrumbs**: All security events logged for context
- **Rate Limit Breaches**: Medium severity events tracked

### Logging
- **Structure**: JSON formatted logs with context
- **Fields**: IP, endpoint, severity, user context, timestamp
- **Retention**: Follows application log retention policy

## Environment Variables

### Configuration
```bash
# Rate limiting enabled (auto-detects production)
NODE_ENV=production

# Encryption key for sensitive data
ENCRYPTION_KEY=your-256-bit-encryption-key
```

## Performance Considerations

### Memory Usage
- **Base Store**: ~1KB per unique IP/user
- **Cleanup**: Automatic memory management
- **Growth**: Linear with active user count

### Response Time Impact
- **Overhead**: <1ms per request
- **Async Operations**: Non-blocking store operations
- **Graceful Degradation**: Continues on middleware failures

## Best Practices

1. **Environment Awareness**: Always use environment-specific presets
2. **User Context**: Apply user tier limits for premium features
3. **IP Reputation**: Monitor and adjust IP-based multipliers
4. **Graceful Degradation**: Rate limiting failures should not break functionality
5. **Monitoring**: Set up alerts for unusual rate limit patterns
6. **Testing**: Verify rate limits work correctly in staging environments

## Testing Rate Limits

### Development Testing
```bash
# Test authentication rate limit
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"test","password":"wrong"}' \
  -H "Content-Type: application/json"
# Repeat until 429 response
```

### Load Testing
```bash
# Use artillery or similar for load testing
artillery quick --count 200 --num 50 http://localhost:3000/api/health
```

## Troubleshooting

### Common Issues
1. **429 Errors in Development**: Check if using production environment variables
2. **Inconsistent Limits**: Verify environment detection is working correctly
3. **Memory Growth**: Monitor cleanup intervals and expired entry removal

### Debug Commands
```typescript
// Check current environment configuration
console.log(getCurrentEnvironment());
console.log(getRateLimitConfig(getCurrentEnvironment(), 'general'));
```