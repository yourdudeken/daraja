# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.10] - 2026-06-02

### Changed

- Docusaurus docs: fixed ProgressPlugin build error (pinned webpack 5.94.0)
- Docusaurus docs: fixed broken links with root redirect page
- Added missing docs: typescript/README.md, go/README.md, CHANGELOG.md
- All version badges in README and docs now auto-fetch from registry
- Python SDK refactored into package-per-module structure
- Expanded interactive examples for all APIs across all three SDKs
- CI/CD: Fixed npm publish access for scoped packages, Go tag push permissions

## [1.0.0] - 2026-05-12

### Added

- **TypeScript SDK** (`@yourdudeken/mpesa-sdk`)
  - OAuth authentication with automatic token management
  - STK Push (M-Pesa Express) with password generation
  - STK Query
  - C2B API (Register URL & Simulate)
  - B2C API (Business to Customer payments)
  - B2B API (Business to Business payments)
  - Transaction Reversal
  - Transaction Status Query
  - Account Balance Query
  - Dynamic QR Code generation
  - Webhook handling with event-driven architecture
  - Structured error hierarchy (AuthenticationError, ValidationError, etc.)
  - Retry with exponential backoff
  - Express middleware integration
  - Fastify plugin integration
  - Request logging hooks
  - Credential masking in logs
  - Tree-shakeable ESM + CJS builds

- **Python SDK** (`yourdudeken-mpesa-sdk`)
  - Full sync client with httpx
  - Pydantic v2 models for all request/response types
  - All M-Pesa API endpoints (STK Push, C2B, B2C, B2B, Reversal, etc.)
  - Webhook manager with STK callback parsing
  - Structured error hierarchy
  - Retry with exponential backoff
  - Context manager support
  - FastAPI, Flask, Django integration examples

- **Go SDK** (`github.com/yourdudeken/mpesa-sdk/go`)
  - Context-aware HTTP client
  - Thread-safe token management
  - All M-Pesa API endpoints
  - Structured error types
  - Webhook event system
  - Service layer with typed input/output types
  - Gin framework example

- **Documentation**
  - Docusaurus documentation site
  - OpenAPI 3.1 specification as single source of truth
  - Getting started, authentication, error handling guides
  - Security best practices
  - Production deployment guide

- **Infrastructure**
  - GitHub Actions CI/CD pipelines
  - npm, PyPI, and Go module publishing workflows
  - GitHub Pages deployment for documentation
  - Shared endpoint and error code definitions
