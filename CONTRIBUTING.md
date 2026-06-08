# Contributing

We love contributions! Here's how to help.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Run the validation scripts
5. Submit a PR

## Development Setup

```bash
# TypeScript
cd typescript && npm install && npm test

# Python
cd python && pip install -e ".[all]" && pytest

# Go
cd go && go test ./...
```

## Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep PRs focused on a single concern

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
