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
    MONGO_IMAGE = 'mongo:8.0'
    VERIFY_IMAGE = 'node:22-alpine'
    SEMGREP_BIN = '/var/lib/jenkins/.local/bin/semgrep'
    IMAGE_TAG = "build-${env.BUILD_NUMBER}"
    K8S_NAMESPACE = 'security-reports'
    DOCKER_CREDS_ID = 'docker-hub-pat'
    REPORTS_API_KEY_CREDENTIAL_ID = 'security-reports-ingest-api-key'
    REPORTS_API_URL = 'https://sentinel.invadersam.cloud/api'
    VAULT_URL = 'https://vault.invadersam.cloud'
    VAULT_CREDENTIAL_ID = 'jenkins-vault-approle'
    VAULT_SECRET_PATH = 'jenkins-secrets/unified-security-reports/production'
    recepientEmail = "sumit.shrivastava65@gmail.com"
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

    stage('Push Security Reports') {
      steps {
        withCredentials([string(credentialsId: "${env.REPORTS_API_KEY_CREDENTIAL_ID}", variable: 'REPORTS_API_KEY')]) {
          sh '''
            set -eu
            set +x
            report_endpoint="${REPORTS_API_URL%/}/ingest"
            pipeline_name="${JOB_NAME:-unified-security-reports}"
            branch_name="${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}"
            commit_sha="${GIT_COMMIT:-$(git rev-parse HEAD)}"
            build_url="${BUILD_URL:-}"

            upload_report() {
              tool="$1"
              report_file="$2"
              test -s "$report_file"
              jq -n \
                --arg pipeline "$pipeline_name" \
                --arg buildNumber "${BUILD_NUMBER:-}" \
                --arg branch "$branch_name" \
                --arg commit "$commit_sha" \
                --arg buildUrl "$build_url" \
                --arg tool "$tool" \
                --slurpfile report "$report_file" \
                '{ pipeline: $pipeline, buildNumber: $buildNumber, branch: $branch, commit: $commit, tool: $tool, report: $report[0] } + (if $buildUrl == "" then {} else { buildUrl: $buildUrl } end)' \
                | curl --fail-with-body --silent --show-error --connect-timeout 15 --max-time 120 --retry 3 --retry-delay 2 \
                  --request POST "$report_endpoint" \
                  --header 'Content-Type: application/json' \
                  --header "X-API-Key: $REPORTS_API_KEY" \
                  --data-binary @- \
                  --output /dev/null
              echo "Uploaded $tool report: $report_file"
            }

            upload_report semgrep semgrep-reports/semgrep.json
            upload_report trivy trivy-reports/backend.json
            upload_report trivy trivy-reports/frontend.json
          '''
        }
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
          withCredentials([usernamePassword(credentialsId: "${env.DOCKER_CREDS_ID}", usernameVariable: 'DOCKERHUB_USERNAME', passwordVariable: 'DOCKERHUB_TOKEN')]) {
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

              # Resolve the mutable Mongo tag to an immutable digest. The Deployment
              # is changed only when the registry serves a different image digest.
              for attempt in 1 2 3; do
                docker pull "$MONGO_IMAGE" && break
                if [ "$attempt" = 3 ]; then
                  echo "Unable to pull $MONGO_IMAGE after three attempts." >&2
                  exit 1
                fi
                sleep "$attempt"
              done
              resolved_mongo_image="$(docker image inspect "$MONGO_IMAGE" --format '{{index .RepoDigests 0}}')"
              if [ -z "$resolved_mongo_image" ]; then
                echo "Unable to resolve an immutable digest for $MONGO_IMAGE." >&2
                exit 1
              fi
              export MONGO_IMAGE="$resolved_mongo_image"
              resolved_mongo_digest="${MONGO_IMAGE##*@}"
              current_mongo_image_id="$(kubectl -n "$K8S_NAMESPACE" get pods -l app=mongo -o json 2>/dev/null | jq -r '[.items[] | select(.status.phase == "Running") | .status.containerStatuses[]? | select(.name == "mongo") | .imageID][0] // empty')"
              current_mongo_digest="$(printf '%s' "$current_mongo_image_id" | sed -n 's|.*@\(sha256:.*\)$|\1|p')"

              kubectl -n "$K8S_NAMESPACE" create secret docker-registry dockerhub-registry \
                --docker-server=https://index.docker.io/v1/ \
                --docker-username="$DOCKERHUB_USERNAME" \
                --docker-password="$DOCKERHUB_TOKEN" \
                --docker-email=unused@example.invalid \
                --dry-run=client -o yaml | kubectl apply -f -
              kubectl -n "$K8S_NAMESPACE" create secret generic security-reports-db-secrets \
                --from-file=MONGO_ROOT_PASSWORD="$secret_dir/MONGO_ROOT_PASSWORD" \
                --dry-run=client -o yaml | kubectl apply -f -
              kubectl -n "$K8S_NAMESPACE" create secret generic security-reports-secrets \
                --from-file=MONGO_URI="$secret_dir/MONGO_URI" \
                --from-file=JWT_SECRET="$secret_dir/JWT_SECRET" \
                --from-file=DEFAULT_ADMIN_PASSWORD="$secret_dir/DEFAULT_ADMIN_PASSWORD" \
                --dry-run=client -o yaml | kubectl apply -f -
              # Render image references only. Runtime variables in manifests must
              # remain intact so Kubernetes reads sensitive values from Secrets.
              envsubst '${BACKEND_IMAGE} ${FRONTEND_IMAGE} ${IMAGE_TAG} ${MONGO_IMAGE}' < k8s/01-config.yaml | kubectl apply -f - -n "$K8S_NAMESPACE"
              if [ -n "$current_mongo_digest" ] && [ "$current_mongo_digest" = "$resolved_mongo_digest" ]; then
                echo "Mongo image is unchanged; leaving the existing Mongo pod untouched."
                mongo_updated=false
              else
                envsubst '${BACKEND_IMAGE} ${FRONTEND_IMAGE} ${IMAGE_TAG} ${MONGO_IMAGE}' < k8s/02-mongo.yaml | kubectl apply -f - -n "$K8S_NAMESPACE"
                mongo_updated=true
              fi
              if [ "$mongo_updated" = true ]; then
                kubectl -n "$K8S_NAMESPACE" rollout status deployment/mongo --timeout=180s
              fi
              for file in k8s/03-backend.yaml k8s/04-frontend.yaml; do
                envsubst '${BACKEND_IMAGE} ${FRONTEND_IMAGE} ${IMAGE_TAG} ${MONGO_IMAGE}' < "$file" | kubectl apply -f - -n "$K8S_NAMESPACE"
              done
              kubectl -n "$K8S_NAMESPACE" set image deployment/backend backend="$BACKEND_IMAGE:$IMAGE_TAG"
              kubectl -n "$K8S_NAMESPACE" set image deployment/frontend frontend="$FRONTEND_IMAGE:$IMAGE_TAG"
              kubectl -n "$K8S_NAMESPACE" rollout status deployment/backend --timeout=180s
              kubectl -n "$K8S_NAMESPACE" rollout status deployment/frontend --timeout=180s

              # Once the new application replicas are ready, delete every prior
              # ReplicaSet so stale ImagePullBackOff/CrashLoopBackOff pods cannot linger.
              for application in backend frontend; do
                current_revision="$(kubectl -n "$K8S_NAMESPACE" get deployment "$application" -o jsonpath='{.metadata.annotations.deployment\\.kubernetes\\.io/revision}')"
                old_replicasets="$(kubectl -n "$K8S_NAMESPACE" get replicaset -l "app=$application" -o json | jq -r --arg revision "$current_revision" '.items[] | select(.metadata.annotations["deployment.kubernetes.io/revision"] != $revision) | .metadata.name')"
                if [ -n "$old_replicasets" ]; then
                  printf '%s\n' "$old_replicasets" | xargs -r kubectl -n "$K8S_NAMESPACE" delete replicaset --ignore-not-found
                fi
              done
            '''
          }
        }
      }
    }
  }
  post{
        always {
            emailext to: "${recepientEmail}",
            from: 'Jenkins (noreply.jenkins.sam@gmail.com)',
            subject: "Jenkins Build ${currentBuild.currentResult}: ${env.JOB_NAME}: #${currentBuild.number}",
            body: "${currentBuild.currentResult}: Job ${env.JOB_NAME}\nMore Info can be found here: ${env.BUILD_URL}",
            mimeType: 'text/html',
            attachLog: true // Attach the build log to the email
        }
        success {
            script {
                sh "curl -H \"Title: ${currentBuild.currentResult} - ${env.JOB_NAME} #${currentBuild.number}\" -H \"Tags: green_circle\" -d \"${currentBuild.currentResult} for jenkins job ${env.JOB_NAME} for build number ${currentBuild.number}. More info at ${env.BUILD_URL}.\" -k https://ntfy.invadersam.cloud/sam_alerts"
            }
        }
        failure {
            script {
                sh "curl -H \"Title: ${currentBuild.currentResult} - ${env.JOB_NAME} #${currentBuild.number}\" -H \"Tags: red_circle\" -d \"${currentBuild.currentResult} for jenkins job ${env.JOB_NAME} for build number ${currentBuild.number}. More info at ${env.BUILD_URL}.\" -k https://ntfy.invadersam.cloud/sam_alerts"
            }
        }
    }
}
