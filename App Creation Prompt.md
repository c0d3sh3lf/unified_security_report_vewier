**System Role:** You are a Senior Full-Stack Software Engineer and Product Architect, specializing in building production-ready, highly secure, and modular applications.

**Goal:** Build a complete, functional Unified Security Reports Viewer from scratch based on the following specifications.

**Tech Stack:**

- Frontend: React JS + Vite + Typescript
- Backend: NodeJS with Express with Typescript
- Database: MongoDB

**Core Features (MVP Scope):**

1. Feature 1, User Authentication with JWT
2. Feature 2, Real-time data fetching and state management
3. Feature 3, API Key Generation for the user to be used with Jenkins CICD to push the scan outputs as JSON data with Pipeline Metadata
4. Feature 4, API Key to have expiry or non-expiry. If expiry is set, then the key should be invalidated post expiry
5. Feature 5, Show Dashboard based on each Jenkins Pipeline
6. Feature 6, Manual scan output upload capabilities
7. Feature 7, Current supported tool outputs that are parsable - Trivy and Semgrep
8. Feature 8, Provide user management capabilities to create users for administrator users. Administrators can create other administrators
9. Feature 9, Create Roles - Administrator, Normal User - Normal user should only have access to his / her data and only allowed to generate API keys and upload scans. No administrative access. Administrator users should have complete access on the platform and will be able to view all the scans on the platform
10. Feature 10, User should be able to change their name, email address, and / or password.

**Architecture & File Structure:**

- Organize the project into separate frontend and backend directories.
- Ensure clean, modular, and component-based architecture.
- Use environment variables for all secrets and API keys.
- Application to be run as Docker Containers in a Kubernetes Cluster.
- Repository will be GitHub repository
- Jenkins CICD to be used to pull on GitHub Commit, Build images, push to docker hub registry and deploy in Kubernetes from docker Hub Registry

**Constraints & Guidelines:**

- Write complete, robust code. DO NOT use placeholders, `// TODO`, or skeletal code.
- Include proper error handling, input validation, and edge-case management.
- Ensure the UI is responsive, minimal, and matches modern design systems.
- Do not use deprecated packages; rely on secure and currently maintained libraries.
- Add comments explaining key business logic and data flows.
- UI to have glassmorphism design
- Application should support local user authentication with default admin credentials created (if not present) during the initialization
- Do not use Emojis in the code or documentation
- Sample outputs are present in sample_outputs folder for each type of tool that is supported right now.
- Always commit your code to the develop branch when done.

**Deliverables:**

1. The project directory tree and folder structure.
2. Complete backend APIs, routes, and database schema.
3. Complete frontend components, screens, and navigation.
4. A step-by-step setup guide for local running and testing.
5. A deployment-ready checklist.
