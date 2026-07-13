# Unified Security Reports Viewer

Sentinel Reports is a secure, self-hostable dashboard for consolidating Trivy and Semgrep JSON scan reports from Jenkins pipelines or manual uploads. It uses role-scoped access, short-lived JWT sessions, one-time-revealed API keys, normalized findings, and live dashboard polling.

## Project structure

```text
.
├── backend/
│   └── src/
│       ├── config/          validated environment configuration
│       ├── controllers/     HTTP response coordination
│       ├── middleware/      authentication, validation, error handling
│       ├── models/          MongoDB schemas
│       ├── repositories/    database access layer
│       ├── routes/          API route declarations
│       ├── services/        auth, ingestion, parsers, business rules
│       └── validators/      Zod request contracts
├── frontend/
│   └── src/                 React dashboard and API client
├── k8s/                     Kubernetes namespace, config, application manifests
├── sample_outputs/          supplied Semgrep and Trivy reports
├── docker-compose.yml       local full-stack environment
└── Jenkinsfile              build, test, image publication, Kubernetes deployment
```

## Features

- Local username/password authentication with signed JWTs.
- Default administrator bootstrap on backend initialization.
- Administrator and normal-user roles with database-level ownership filtering.
- API keys stored only as SHA-256 hashes, with per-key expiry, revocation, and last-use tracking.
- Ingestion endpoint designed for Jenkins (`X-API-Key`), plus manual JSON uploads.
- Trivy container/filesystem report and Semgrep report normalization into a common finding model.
- Dashboard totals and pipeline summaries automatically refresh every 30 seconds.
- Responsive glassmorphism interface for overview, scan detail, uploads, keys, users, and profile settings.

## Local setup

1. Use Node.js 22 or newer and Docker Desktop. Copy the environment file and set a unique JWT secret and administrator password:

   ```bash
   cp .env.example .env
   ```

   `JWT_SECRET` must be at least 32 characters. `DEFAULT_ADMIN_PASSWORD` must be changed before any non-local deployment.

2. Install dependencies and run the application in development mode:

   ```bash
   npm install
   npm run dev
   ```

   Start MongoDB separately with `docker compose up mongo`, or use an accessible `MONGO_URI` in `.env`.

3. Open `http://localhost:5173`. The first backend startup creates the configured default administrator only when its email address does not already exist.

4. To run the full stack in containers:

   ```bash
   docker compose --env-file .env up --build
   ```

   The UI is served at `http://localhost:8080` and the health endpoint is `http://localhost:4000/health`.

## Tests and build

```bash
npm run lint
npm test
npm run build
```

The parser unit test validates normalisation of representative Trivy and Semgrep structures. To manually validate supplied outputs, log in, open **Upload**, choose the scanner, and upload one of the JSON files under `sample_outputs/`.

## Jenkins ingestion

Create an API key from **API keys** in the UI. Store the revealed value in Jenkins Credentials as a secret text credential called `security-reports-api-key`. A pipeline can submit a report as follows:

```groovy
withCredentials([string(credentialsId: 'security-reports-api-key', variable: 'REPORTS_API_KEY')]) {
  sh '''
    jq -n --slurpfile report trivy.json '{
      pipeline: env.JOB_NAME,
      buildNumber: env.BUILD_NUMBER,
      branch: env.BRANCH_NAME,
      commit: env.GIT_COMMIT,
      buildUrl: env.BUILD_URL,
      tool: "trivy",
      report: $report[0]
    }' | curl --fail-with-body --request POST "$SECURITY_REPORTS_URL/api/ingest" \
      --header "Content-Type: application/json" \
      --header "X-API-Key: $REPORTS_API_KEY" \
      --data-binary @-
  '''
}
```

Use `tool: "semgrep"` and a Semgrep JSON report for Semgrep. The ingest endpoint rejects expired/revoked keys and unsupported report formats.

## API summary

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | public | Obtain JWT session |
| GET/PATCH | `/api/auth/me` | authenticated | Read or update profile/password |
| GET/POST/DELETE | `/api/api-keys` | authenticated | Manage own API keys |
| POST | `/api/ingest` | API key | Jenkins scanner report ingestion |
| POST/GET | `/api/scans` | authenticated | Manual upload or list scoped reports |
| GET | `/api/scans/:id` | authenticated | Read a scoped report and findings |
| GET | `/api/dashboard/overview` | authenticated | Severity and report totals |
| GET | `/api/dashboard/pipelines` | authenticated | Pipeline aggregates |
| GET/POST | `/api/users` | administrator | List and create users |

## Jenkins and Kubernetes NodePort deployment

The deployment assets follow the numbered style used by the companion application:

```text
k8s/00-namespace.yaml  Kubernetes namespace
k8s/01-config.yaml     Non-secret backend configuration
k8s/02-mongo.yaml      Authenticated MongoDB, persistent storage, and service
k8s/03-backend.yaml    API deployment and internal service
k8s/04-frontend.yaml   UI deployment and NodePort service
```

The frontend is exposed at NodePort `30281`. It proxies `/api` internally to the backend Kubernetes service, so the production browser client can keep using the relative `/api` endpoint without an ingress. Configure your node-level reverse proxy or firewall to expose this port as appropriate.

Configure these Jenkins credentials before running the rebuilt `Jenkinsfile`:

| Credential ID | Type | Purpose |
| --- | --- | --- |
| `docker-hub-pat` | Username with password | Docker Hub publishing |
| `security-reports-ingest-api-key` | Secret text | Upload Semgrep and Trivy reports to this application |
| `security-reports-mongo-root-password` | Secret text | MongoDB root password |
| `security-reports-jwt-secret` | Secret text | Backend JWT signing key, at least 32 characters |
| `security-reports-default-admin-password` | Secret text | Initial platform administrator password |

The pipeline tests the workspace, generates and archives Semgrep/Trivy JSON reports, uploads them to the reports API, builds and pushes immutable Docker tags plus `latest`, creates the Kubernetes secrets from Jenkins credentials, and waits for MongoDB, backend, and frontend rollouts.

## Deployment checklist

- [ ] Create the Docker Hub repositories `invad3rsam/unified-security-reports-backend` and `invad3rsam/unified-security-reports-frontend`, or update their names in `Jenkinsfile`.
- [ ] Configure a Jenkins multibranch pipeline or SCM webhook for the `develop` branch of the GitHub repository.
- [ ] Install Semgrep, Trivy, Docker, Node.js 22, `kubectl`, and `envsubst` on the Jenkins agent.
- [ ] Add the five Jenkins credentials listed above and verify the reports API URL can be reached from Jenkins.
- [ ] Ensure every Kubernetes node that can schedule MongoDB has `/mnt/data/security-reports-mongo` available with persistent storage; replace the hostPath volume with a managed storage class for multi-node production clusters.
- [ ] Ensure NodePort `30281` is permitted through the cluster and network firewall, then verify the UI and `/api/health` through the selected node address.
- [ ] Confirm the bootstrap administrator can sign in, an API key can ingest a Jenkins report, and expired/revoked keys are rejected.
- [ ] Configure MongoDB backups, application log collection, image vulnerability scanning, and routine dependency updates.
