# HashiCorp Vault secrets for Jenkins

The deployment pipeline reads all confidential application values from HashiCorp Vault through the Jenkins HashiCorp Vault plugin. It authenticates with the existing Jenkins credential ID `jenkins-vault-approle`, which must contain the AppRole Role ID and Secret ID.

## Secret engine and path

Use the KV version 2 engine mounted at `secrets` and create exactly one secret at this logical path:

```text
secrets/jenkins-secrets
```

The `Jenkinsfile` explicitly sets `engineVersion: 2`; do not include `/data/` in the Jenkins secret path. Vault's ACL policy does use `/data/`, because that is the KV v2 API path.

## Required secret values

Every value must be stored as a string. The key names are case-sensitive and must match this table exactly.

| Vault key | Required value specification | Used by |
|---|---|---|
| `dockerhub_username` | Docker Hub account name with permission to push both configured application repositories. | Push Images |
| `dockerhub_token` | Docker Hub personal access token with read and write repository access. Use a dedicated automation token and rotate it regularly. | Push Images |
| `reports_ingest_api_key` | The plaintext application API key revealed when it is created in the Security Reports UI. Create it for the intended pipeline owner; do not store its displayed hash. Use a non-expiring key only when rotation is operationally managed. | Upload Security Reports |
| `mongo_root_password` | A unique, randomly generated password of at least 32 characters for the `securityreports` MongoDB root user. It is URI-encoded by the pipeline before use. | Kubernetes Deployment |
| `jwt_secret` | A cryptographically random JWT signing key of at least 48 bytes. Treat a change as a session invalidation event, because existing JWTs will no longer verify. | Kubernetes Deployment |
| `default_admin_password` | Initial administrator password that satisfies the backend password policy: at least 12 characters with uppercase, lowercase, and numeric characters. Changing it after first bootstrap does not change an existing administrator account. | Kubernetes Deployment |

Generate the high-entropy values outside command history. For example, use `openssl rand -base64 48` for `jwt_secret` and a password manager or `openssl rand -base64 36` for `mongo_root_password`. Set the values in secure shell variables, then write the one KV v2 secret:

```sh
vault kv put secrets/jenkins-secrets \
  dockerhub_username="$DOCKERHUB_USERNAME" \
  dockerhub_token="$DOCKERHUB_TOKEN" \
  reports_ingest_api_key="$REPORTS_INGEST_API_KEY" \
  mongo_root_password="$MONGO_ROOT_PASSWORD" \
  jwt_secret="$JWT_SECRET" \
  default_admin_password="$DEFAULT_ADMIN_PASSWORD"
```

Updating this command replaces the values at the path, so include all six keys on every update. Do not put `MONGO_URI` in Vault: the pipeline derives it from `mongo_root_password` and URL-encodes the password before creating the Kubernetes secret.

## Least-privilege policy and AppRole

Create a policy file named `jenkins-unified-security-reports.hcl` with only read access to the one KV v2 data path:

```hcl
path "secrets/data/jenkins-secrets" {
  capabilities = ["read"]
}
```

Apply the policy and attach it to the AppRole used by Jenkins:

```sh
vault policy write jenkins-unified-security-reports jenkins-unified-security-reports.hcl
vault auth enable approle
vault write auth/approle/role/jenkins-unified-security-reports \
  token_policies="jenkins-unified-security-reports" \
  secret_id_ttl="10m" \
  secret_id_num_uses=1 \
  token_ttl="1h" \
  token_max_ttl="2h"
```

If AppRole authentication is already enabled, the `vault auth enable approle` command is not needed. Store the resulting Role ID and a newly generated Secret ID in Jenkins as a HashiCorp Vault AppRole credential with the exact ID `jenkins-vault-approle`. The AppRole's mount path is `approle` unless it was enabled at a different mount.

## Jenkins configuration and validation

Configure the Jenkins HashiCorp Vault plugin to use the AppRole credential and permit Jenkins to trust the TLS certificate for `https://vault.invadersam.cloud`. Keep TLS certificate verification enabled; install the Vault issuing CA certificate in the Jenkins controller's Java trust store if the certificate is privately issued.

Before enabling deployment, verify the AppRole can read only the required secret:

```sh
vault read auth/approle/role/jenkins-unified-security-reports/role-id
vault kv get secrets/jenkins-secrets
```

Run the Jenkins pipeline once and confirm that report upload, Docker Hub publication, and Kubernetes rollout succeed. Jenkins console output must not display any of the six secret values; revoke and replace a value immediately if one is exposed.
