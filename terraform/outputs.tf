output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.mlops_server.public_ip
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.mlops_bucket.bucket
}

output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.mlops_db.endpoint
}
