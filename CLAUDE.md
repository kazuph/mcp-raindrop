# CLAUDE.md - Raindrop MCP Project Guidelines

## Commands
- Build/Run: `bun run start` (or `bun run src/index.ts`)
- Development: `bun run dev` (watch mode)
- Type checking: `bun run type-check`
- Tests: `bun run test`
- Run single test: `bun test src/services/__tests__/mcp.service.test.ts`
- Test with coverage: `bun run test:coverage`

## Code Style
- TypeScript with strict type checking
- ESM modules (`import/export`)
- Use Zod for validation and schema definitions
- Class-based services with dependency injection
- Functional controllers with try/catch error handling
- Use error objects with status codes and messages

## Conventions
- Imports: Group imports by type (external, internal)
- Naming: camelCase for variables/functions, PascalCase for classes/types
- Error handling: Use try/catch blocks with descriptive error messages
- Type definitions: Prefer interfaces for object types
- Async: Use async/await pattern consistently
- Testing: Use Vitest with mocks for dependencies