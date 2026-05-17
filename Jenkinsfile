pipeline {
    agent any

    environment {
        DOCKER_USERNAME = 'sanjanasshetty'
        IMAGE_NAME = 'house-price-prediction'
        DOCKER_IMAGE = "${DOCKER_USERNAME}/${IMAGE_NAME}:${env.BUILD_ID}"
        LATEST_IMAGE = "${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
        DOCKER_CREDENTIALS_ID = 'dockerhub-credentials'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Environment') {
            steps {
                sh '''
                python -m venv venv
                . venv/bin/activate
                pip install -r requirements.txt
                '''
            }
        }

        stage('Model Training') {
            steps {
                sh '''
                . venv/bin/activate
                python src/train.py
                '''
            }
        }

        stage('Unit Testing') {
            steps {
                sh '''
                . venv/bin/activate
                pytest tests/
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build("${DOCKER_IMAGE}")
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    docker.withRegistry('', DOCKER_CREDENTIALS_ID) {
                        dockerImage.push()
                        dockerImage.push('latest')
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                docker-compose down
                docker-compose pull
                docker-compose up -d
                '''
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully! Application deployed."
        }
        failure {
            echo "Pipeline failed. Triggering rollback..."
            sh '''
            docker-compose down
            # Assuming previous tag is BUILD_ID - 1
            export PREV_BUILD=$((BUILD_ID-1))
            sed -i "s|image: sanjanasshetty/house-price-prediction:latest|image: sanjanasshetty/house-price-prediction:${PREV_BUILD}|" docker-compose.yml || true
            docker-compose up -d || echo "Rollback failed."
            '''
        }
    }
}
