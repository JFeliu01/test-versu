terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "ai_sg" {
  name        = "ai_dashboard_sg"
  description = "Allow ports for AI Dashboard"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Backend
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Grafana
  }

  ingress {
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Frontend
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "app_server" {
  ami           = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS us-east-1
  instance_type = "t2.micro"              # AWS Free Tier

  vpc_security_group_ids = [aws_security_group.ai_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y docker.io docker-compose git curl

              curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
              apt-get install -y nodejs

              git clone https://github.com/$${var.github_owner}/$${var.github_repo}.git /home/ubuntu/app
              cd /home/ubuntu/app

              echo "AI_API_KEY=$${var.ai_api_key}" > .env
              echo "JWT_SECRET=$${var.jwt_secret}" >> .env

              docker-compose up -d --build

              cd frontend
              npm install
              nohup npm run dev -- --host 0.0.0.0 &
              EOF

  tags = {
    Name = "AIDashboard-FreeTier-IaaS"
  }
}

output "public_ip" {
  value       = aws_instance.app_server.public_ip
  description = "IP publica para acceder al Frontend"
}