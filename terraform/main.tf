# Security Group for EC2
resource "aws_security_group" "mlops_sg" {
  name        = "mlops_sg"
  description = "Allow inbound traffic for Flask app, Prometheus, and Grafana"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# IAM Role for EC2 to access S3
resource "aws_iam_role" "mlops_ec2_role" {
  name = "mlops_ec2_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# EC2 Instance
resource "aws_instance" "mlops_server" {
  ami           = "ami-0c7217cdde317cfec" # Ubuntu 22.04 LTS for us-east-1 (check latest)
  instance_type = var.instance_type
  security_groups = [aws_security_group.mlops_sg.name]

  user_data = <<-EOF
              #!/bin/bash
              # Update and install Docker
              apt-get update -y
              apt-get install -y docker.io docker-compose git
              systemctl start docker
              systemctl enable docker
              
              # Optional: Clone repo and run
              # git clone https://github.com/your-username/Devops_new.git
              # cd Devops_new
              # docker-compose up -d
              EOF

  tags = {
    Name = "MLOps-HousePrice-Prediction-Server"
  }
}

# S3 Bucket for storing models/datasets backups
resource "aws_s3_bucket" "mlops_bucket" {
  bucket = "sanjanasshetty-mlops-bucket-${random_id.bucket_id.hex}"
}

resource "random_id" "bucket_id" {
  byte_length = 4
}

# RDS instance (if needed for storing application logs or metadata)
resource "aws_db_instance" "mlops_db" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.micro"
  username             = "postgres"
  password             = var.db_password
  skip_final_snapshot  = true
  publicly_accessible  = false
}
