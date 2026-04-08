# Security Model & Mitigations

## Overview

This document describes the security model of the Job Application CRM, identifies potential threats, and documents implemented mitigations.

## Threat Model

### Authentication & Authorization
- **Threat:** Unauthorized access to user data
- **Mitigation:**
  - MS Graph OAuth2 PKCE for Outlook authentication
  - Token stored securely in local config
  - No persistent session tokens in database
  - Device flow login (user approval required)

### Input Validation
- **Threat:** SQL injection, XSS, command injection
- **Mitigations:**
  - All user inputs sanitized (text fields stripped, length limited)
  - Non-printable characters rejected
  - Required fields validated before processing
  - Status enums restricted to allowed values
  - URLs validated to start with http:// or https://

### Network Security
- **Threat:** Man-in-the-middle attacks, CSRF
- **Mitigations:**
  - CORS restricted to localhost:3000/3001 (dev only)
  - Content-Security-Policy headers prevent inline scripts
  - X-Frame-Options: DENY prevents clickjacking
  - X-Content-Type-Options: nosniff prevents MIME sniffing
  - X-XSS-Protection enabled
  - Request size limit: 16MB max

### Data Storage
- **Threat:** Sensitive data exposure
- **Mitigations:**
  - SQLite database (local, no cloud storage)
  - MS Graph tokens stored locally in `.config.json` (gitignored)
  - Gemini API key in `.env` (gitignored)
  - No plaintext storage of sensitive data
  - WAL mode for concurrent access

### API Security
- **Threat:** Rate limiting bypass, resource exhaustion
- **Mitigations:**
  - Request size limit (16MB)
  - Background scheduler limits API calls (1 req/sec to Gemini)
  - Input validation prevents large payloads
  - Error responses don't leak sensitive info

## Security Checklist

- [x] CORS restricted to localhost
- [x] Input validation on all API endpoints
- [x] Status/enum fields restricted to allowed values
- [x] Security headers added (CSP, X-Frame-Options, etc.)
- [x] No SQL injection vulnerabilities (parameterized queries)
- [x] No XSS vulnerabilities (input sanitization, CSP headers)
- [x] API errors don't leak sensitive info
- [x] Request size limits enforced
- [x] MS Graph tokens stored securely (local, gitignored)
- [x] Gemini API key stored securely (env, gitignored)

## Production Considerations

For production deployment:

1. **HTTPS:** Enable `force_https=True` in production, configure HSTS
2. **CORS:** Whitelist production domain instead of localhost
3. **Secrets:** Use environment variables for all API keys, never hardcode
4. **Database:** Consider encrypted SQLite or move to managed database
5. **Rate Limiting:** Implement IP-based rate limiting on sensitive endpoints
6. **Logging:** Log security-relevant events (failed auth, validation errors)
7. **Monitoring:** Set up alerts for unusual API patterns
8. **Updates:** Keep Flask, dependencies patched for security vulnerabilities

## Known Limitations

- No two-factor authentication (Outlook handles this)
- No audit log of user actions
- No data encryption at rest (local SQLite assumed secure)
- CORS permissive for localhost (adequate for personal app, restrict in multi-user setup)

## Reporting Security Issues

For security vulnerabilities, please report privately rather than opening a public issue.
