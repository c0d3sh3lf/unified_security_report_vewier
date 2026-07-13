pipeline {
  agent any

  options {
    // A shared workspace must not be modified by two npm installations at once.
    disableConcurrentBuilds()
  }

  environment {
    DOCKER_USER = 'invad3rsam'
    BACKEND_IMAGE = 'invad3rsam/unified-security-reports-backend'
    FRONTEND_IMAGE = 'invad3rsam/unified-security-reports-frontend'
    VERIFY_IMAGE = 'node:22-alpine'
    SEMGREP_BIN = '/var/lib/jenkins/.local/bin/semgrep'
    IMAGE_TAG = "build-${env.BUILD_NUMBER}"
    K8S_NAMESPACE = 'security-reports'
    DOCKER_CREDS_ID = 'docker-hub-pat'
    // REPORTS_API_KEY_CREDENTIAL_ID = 'security-reports-ingest-api-key'
    // REPORTS_API_URL = 'https://ci-reports.invadersam.cloud/api'
    VAULT_URL = 'https://vault.invadersam.cloud'
    VAULT_CREDENTIAL_ID = 'jenkins-vault-approle'
    VAULT_SECRET_PATH = 'jenkins-secrets/unified-security-reports/production'
  }

  stages {
    stage('Checkout Source') {
      steps { checkout scm }
    }

    stage('Verify Application') {
      steps {
        script {
          // Keep npm's generated files out of the deployment workspace.
          ws("${env.WORKSPACE}@verify") {
            try {
              deleteDir()
              checkout scm
              retry(3) {
                docker.image(env.VERIFY_IMAGE).pull()
              }
              docker.image(env.VERIFY_IMAGE).inside {
                sh '''
                  set -eu
                  export NPM_CONFIG_CACHE=/tmp/npm-cache
                  mkdir -p "$NPM_CONFIG_CACHE"
                  npm ci --cache "$NPM_CONFIG_CACHE"
                  npm run lint
                  npm test
                  npm run build
                '''
              }
            } finally {
              deleteDir()
            }
          }
        }
      }
    }

    stage('Semgrep Code Review') {
      steps {
        sh '''
          set -eu
          semgrep_bin="$SEMGREP_BIN"
          if [ ! -x "$semgrep_bin" ]; then
            semgrep_bin="$(command -v semgrep || true)"
          fi
          if [ -z "$semgrep_bin" ] || [ ! -x "$semgrep_bin" ]; then
            echo "Semgrep was not found. Install it for the Jenkins service user or set SEMGREP_BIN to its executable path." >&2
            exit 127
          fi
          "$semgrep_bin" --version
          mkdir -p semgrep-reports
          "$semgrep_bin" scan --metrics=off --jobs 4 --timeout 300 \
            --config p/default --config p/owasp-top-ten --config p/javascript --config p/typescript --config p/dockerfile --config p/secrets \
            --exclude frontend/dist --exclude backend/dist --exclude node_modules --exclude semgrep-reports \
            --json --output semgrep-reports/semgrep.json .
        '''
      }
      post {
        always { archiveArtifacts artifacts: 'semgrep-reports/**/*', allowEmptyArchive: false }
      }
    }

    stage('Build Images') {
      parallel {
        stage('Build Backend Image') {
          steps {
            script {
              retry(3) {
                docker.build("${env.BACKEND_IMAGE}:${env.IMAGE_TAG}", '-f backend/Dockerfile backend')
              }
              sh "docker tag ${env.BACKEND_IMAGE}:${env.IMAGE_TAG} ${env.BACKEND_IMAGE}:latest"
            }
          }
        }
        stage('Build Frontend Image') {
          steps {
            script {
              retry(3) {
                docker.build("${env.FRONTEND_IMAGE}:${env.IMAGE_TAG}", '-f frontend/Dockerfile frontend')
              }
              sh "docker tag ${env.FRONTEND_IMAGE}:${env.IMAGE_TAG} ${env.FRONTEND_IMAGE}:latest"
            }
          }
        }
      }
    }

    stage('Trivy Image Scan') {
      steps {
        script {
          def images = [backend: env.BACKEND_IMAGE, frontend: env.FRONTEND_IMAGE]
          sh 'mkdir -p trivy-reports'
          parallel images.collectEntries { serviceName, imageName ->
            [("Scan ${serviceName}"): {
              sh """
                set -eu
                trivy image --no-progress --scanners vuln,misconfig,secret,license --image-config-scanners misconfig,secret \\
                  --detection-priority comprehensive --include-non-failures --license-full --dependency-tree \\
                  --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL --format json --output trivy-reports/${serviceName}.json \\
                  --exit-code 0 ${imageName}:${env.IMAGE_TAG}
              """
            }]
          }
        }
      }
      post {
        always { archiveArtifacts artifacts: 'trivy-reports/**/*', allowEmptyArchive: false }
      }
    }

    stage('Push Images') {
      steps {
        withCredentials([usernamePassword(credentialsId: "${env.DOCKER_CREDS_ID}", usernameVariable: 'DOCKERHUB_USERNAME', passwordVariable: 'DOCKERHUB_TOKEN')]) {
          sh '''
            set -eu
            set +x
            printf '%s' "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
            docker push "$BACKEND_IMAGE:$IMAGE_TAG"
            docker push "$BACKEND_IMAGE:latest"
            docker push "$FRONTEND_IMAGE:$IMAGE_TAG"
            docker push "$FRONTEND_IMAGE:latest"
            docker logout || true
          '''
        }
      }
    }

    stage('Cleanup Local Images') {
      steps {
        sh '''
          docker rmi "$BACKEND_IMAGE:$IMAGE_TAG" "$BACKEND_IMAGE:latest" || true
          docker rmi "$FRONTEND_IMAGE:$IMAGE_TAG" "$FRONTEND_IMAGE:latest" || true
        '''
      }
    }

    stage('Kubernetes Deployment') {
      steps {
        withVault([configuration: [
          vaultUrl: env.VAULT_URL,
          vaultCredentialId: env.VAULT_CREDENTIAL_ID,
          engineVersion: 2
        ], vaultSecrets: [[
          path: env.VAULT_SECRET_PATH,
          engineVersion: 2,
          secretValues: [
            [envVar: 'MONGO_ROOT_PASSWORD', vaultKey: 'mongo_root_password'],
            [envVar: 'JWT_SECRET', vaultKey: 'jwt_secret'],
            [envVar: 'DEFAULT_ADMIN_PASSWORD', vaultKey: 'default_admin_password']
          ]
        ]]]) {
          sh '''
            set -eu
            set +x
            umask 077
            secret_dir="$(mktemp -d)"
            trap 'rm -rf "$secret_dir"' EXIT
            printf '%s' "$MONGO_ROOT_PASSWORD" > "$secret_dir/MONGO_ROOT_PASSWORD"
            printf '%s' "$JWT_SECRET" > "$secret_dir/JWT_SECRET"
            printf '%s' "$DEFAULT_ADMIN_PASSWORD" > "$secret_dir/DEFAULT_ADMIN_PASSWORD"
            encoded_mongo_password="$(printf '%s' "$MONGO_ROOT_PASSWORD" | jq -sRr '@uri')"
            MONGO_URI="mongodb://securityreports:$encoded_mongo_password@mongo:27017/security_reports?authSource=admin"
            printf '%s' "$MONGO_URI" > "$secret_dir/MONGO_URI"
            kubectl apply -f k8s/00-namespace.yaml
            kubectl -n "$K8S_NAMESPACE" create secret generic security-reports-db-secrets \
              --from-file=MONGO_ROOT_PASSWORD="$secret_dir/MONGO_ROOT_PASSWORD" \
              --dry-run=client -o yaml | kubectl apply -f -
            kubectl -n "$K8S_NAMESPACE" create secret generic security-reports-secrets \
              --from-file=MONGO_URI="$secret_dir/MONGO_URI" \
              --from-file=JWT_SECRET="$secret_dir/JWT_SECRET" \
              --from-file=DEFAULT_ADMIN_PASSWORD="$secret_dir/DEFAULT_ADMIN_PASSWORD" \
              --dry-run=client -o yaml | kubectl apply -f -
            for file in k8s/01-config.yaml k8s/02-mongo.yaml k8s/03-backend.yaml k8s/04-frontend.yaml; do
              envsubst < "$file" | kubectl apply -f - -n "$K8S_NAMESPACE"
            done
            kubectl -n "$K8S_NAMESPACE" set image deployment/backend backend="$BACKEND_IMAGE:$IMAGE_TAG"
            kubectl -n "$K8S_NAMESPACE" set image deployment/frontend frontend="$FRONTEND_IMAGE:$IMAGE_TAG"
            kubectl -n "$K8S_NAMESPACE" rollout status deployment/mongo --timeout=180s
            kubectl -n "$K8S_NAMESPACE" rollout status deployment/backend --timeout=180s
            kubectl -n "$K8S_NAMESPACE" rollout status deployment/frontend --timeout=180s
          '''
        }
      }
    }
  }
}
