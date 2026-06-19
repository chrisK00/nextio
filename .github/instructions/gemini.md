---
applyTo: "*"
---

# GitHub Copilot Instructions - TV Show Tracker

## 1. Project Context & Philosophy

- **Product:** A TV show tracking application (managing watchlists, episode progress, and show details). There are 4 main pages. Unwatched, Upcoming, My Shows and Search. Unwatched shows are those that have aired but the user has not marked as watched meanwhile upcoming is shows that have not yet aired but are planned to release episodes on a specific future date. My shows is a list of all shows the user has added to their watchlist and search is a page to search for new shows to add to the watchlist.
- **Core Principle:** Mobile-first design. All layouts and user interfaces must be optimized for mobile screens first. Keep code readable and maintainable.
- **Pragmatic Engineering:** Prioritize clean, readable code and industry best practices. Do not over-engineer; do not introduce complex microarchitectures or redundant state management libraries unless necessary.
- **Preservation:** Always respect the existing codebase. When writing or refactoring, modify as little as possible to keep existing features intact and avoid introducing breaking changes.

## 2. Frontend Guidelines (React & TypeScript)

- **Component Design:** Use functional components with explicit TypeScript interfaces for props. Avoid using `any`.
- **State Management:** Use standard React Hooks (`useState`, `useEffect`, `useContext`) for local/global state. Do not introduce Redux/Zustand unless instructed.
- **Data Fetching:** Standardize on native `fetch` or a simple `Axios` wrapper utilizing `async/await`. Avoid promise chaining (`.then()`).
- **Styling:** Follow a strict mobile-first approach using responsive design primitives (e.g., if using Tailwind, write default utility classes for mobile, and prefix with `md:` or `lg:` for larger viewports).

## 3. Backend Guidelines (.NET C#)

- **Architecture:** Use a standard, clean ASP.NET Core Web API structure (Controllers -> Services -> Repository/Database Access).
- **Data Access:** Use Entity Framework Core (EF Core) with a code-first approach. Enforce proper migration patterns.
- **REST Best Practices:** Ensure endpoints follow standard REST conventions (`GET /api/shows`, `POST /api/watchlist`). Return explicit HTTP status codes (`Ok()`, `NotFound()`, `BadRequest()`).
- **DTOs:** Never expose raw database entities directly to the client. Always map entities to Data Transfer Objects (DTOs) before returning them via the API.
- **File Structure:** Organize code by domain (e.g., `Features/Shows`, `Features/Watchlist`) rather than by technical layer (e.g., `Controllers`, `Services`) to keep related code together and reduce unnecessary abstraction. Also use file scoped namespaces.

## 4. Operational Guardrails

- **Error Handling:** Always wrap API fetch calls and database transactions in clean `try/catch` blocks. Fail gracefully with readable logs.
- **Formatting:** Write self-documenting code. Use clear, intentional variable and function names over heavy code comments.
- **Testing:** Prioritize easily testable pure functions and isolated service logic.
- **Architecture** : Avoid introducing complex architectural patterns (e.g., microservices, event-driven) unless explicitly required. Focus on simplicity and maintainability. Structure things by domain (e.g., shows, watchlist) rather than by technical layer (e.g., controllers, services) to keep related code together and reduce unnecessary abstraction.
- **Code style:** Never oneline if statements, always use braces
