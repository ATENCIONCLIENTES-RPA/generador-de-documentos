# Agent Instructions

This project uses opencode with a comprehensive skill system. The agent should automatically load and use relevant skills for each task to achieve the best results.

## Auto-Load Skills

When starting any task, automatically determine which skills are relevant and load them. The following skills are available:

### Design & UX

- **ui-ux-pro-max** - Comprehensive design guide for web/mobile apps
- **frontend-design** - Distinctive, production-grade frontend interfaces
- **impeccable** - Award-winning design director approach for UI
- **design-system-engineer** - Token architecture, typography, motion systems
- **nielsen-heuristics** - Usability evaluation framework
- **web-design-guidelines** - Vercel's 100+ UI/UX audit rules

### Frontend Development

- **react-best-practices** - Vercel's 45 performance optimization rules
- **nextjs-best-practices** - App Router principles
- **vercel-react-best-practices** - React/Next.js optimization
- **component-patterns** - Modern React component patterns
- **senior-frontend** - React/Next.js/TypeScript/Tailwind patterns
- **cc-skill-frontend-patterns** - Frontend patterns for React/Next.js

### Fullstack & Architecture

- **senior-fullstack** - Complete fullstack toolkit
- **api-architect** - REST/GraphQL API design
- **schema-architect** - Database schema design
- **convex-design** - Convex backend design

### Code Quality

- **test-driven-development** - TDD red-green-refactor cycle
- **code-review** - Systematic code review checklist
- **refactor-master** - Clean code, SOLID principles
- **perf-hunter** - Performance bottleneck identification
- **building-pydantic-ai-agents** - Pydantic AI agent patterns

### Testing

- **webapp-testing** - Playwright browser automation

### AI & Automation

- **superpowers** - Advanced AI agent capabilities

## Skill Selection Rules

1. **Always load at least one relevant skill** before starting substantive work
2. **Prefer multiple complementary skills** for complex tasks
3. **Load skills proactively** based on task keywords:
   - UI/design tasks → ui-ux-pro-max, frontend-design, impeccable, design-system-engineer
   - React/Next.js → react-best-practices, nextjs-best-practices, component-patterns
   - API/backend → api-architect, schema-architect, senior-fullstack
   - Testing → test-driven-development, webapp-testing
   - Code quality → code-review, refactor-master, perf-hunter
   - UX review → nielsen-heuristics, impeccable (critique/audit commands)

## Workflow

1. Analyze the user's request
2. Identify 1-3 most relevant skills
3. Load those skills using the skill tool
4. Follow the skill's guidance for the task
5. If new aspects emerge, load additional skills as needed

## Example Skill Combinations

| Task                   | Skills to Load                                                |
| ---------------------- | ------------------------------------------------------------- |
| Build landing page     | ui-ux-pro-max + frontend-design + react-best-practices        |
| API design             | api-architect + schema-architect + senior-fullstack           |
| Code audit             | code-review + refactor-master + perf-hunter                   |
| UX review              | nielsen-heuristics + impeccable + design-system-engineer      |
| New feature with tests | test-driven-development + component-patterns + webapp-testing |

The goal is to always leverage the collective expertise encoded in these skills rather than working from first principles alone.
