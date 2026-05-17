variable "aws_region" {
  description = "AWS region for deployment"
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t2.micro"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  default     = "secure_password_123!" # Change this in production
}
