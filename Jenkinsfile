pipeline {
    agent any

    options {
        skipDefaultCheckout()
        disableConcurrentBuilds()
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        SSH_OPTIONS = '-i /lab/deploy_key -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/lab/known_hosts'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
                sh 'git log -1 --oneline && test -s index.html'
            }
        }

        stage('Deploy') {
            steps {
                sh 'scp $SSH_OPTIONS index.html "deploy@$EC2_HOST:/srv/jenkins-site/index.html"'
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    ssh $SSH_OPTIONS "deploy@$EC2_HOST" \
                      "curl -fsS --max-time 10 -H 'Host: $EC2_HOST' http://127.0.0.1/index.html" \
                      > served-index.html
                    cmp index.html served-index.html
                    echo "OK: Nginx is serving the deployed index.html"
                '''
            }
        }
    }
}
