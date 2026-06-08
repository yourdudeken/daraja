# Shared SDK Resources

This directory contains shared resources referenced by all SDK implementations.

## Contents

- `endpoints.json` - Unified endpoint definitions for all environments
- `error-codes.json` - Standard M-Pesa error codes and descriptions
- `result-codes.json` - Standard result codes per API type

## Purpose

These resources serve as a single source of truth for:
- API endpoint URLs across sandbox and production
- Error code mappings for structured error handling
- Result code interpretations for callback processing

SDK implementations should reference these files during code generation or testing.
