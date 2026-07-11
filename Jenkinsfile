pipeline {
  agent any
  environment {
    REGISTRY = credentials('dockerhub-credentials')
    IMAGE_PREFIX = 'your-dockerhub-namespace/unified-security-reports'
    KUBECONFIG_CREDENTIALS = 'kubeconfig'
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Verify') { steps { sh 'npm ci && npm run build && npm test' } }
    stage('Build and push images') {
      steps {
        script {
          def tag = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
          sh "docker build -t ${IMAGE_PREFIX}-backend:${tag} backend"
          sh "docker build -t ${IMAGE_PREFIX}-frontend:${tag} frontend"
          sh "echo $REGISTRY_PSW | docker login -u $REGISTRY_USR --password-stdin"
          sh "docker push ${IMAGE_PREFIX}-backend:${tag}"
          sh "docker push ${IMAGE_PREFIX}-frontend:${tag}"
          sh "sed -e 's|BACKEND_IMAGE|${IMAGE_PREFIX}-backend:${tag}|g' -e 's|FRONTEND_IMAGE|${IMAGE_PREFIX}-frontend:${tag}|g' k8s/app.yaml > k8s/rendered.yaml"
        }
      }
    }
    stage('Deploy') {
      steps {
        withCredentials([file(credentialsId: "$KUBECONFIG_CREDENTIALS", variable: 'KUBECONFIG')]) {
          sh 'kubectl apply -f k8s/namespace.yaml && kubectl apply -f k8s/config.example.yaml && kubectl apply -f k8s/rendered.yaml'
        }
      }
    }
  }
}
