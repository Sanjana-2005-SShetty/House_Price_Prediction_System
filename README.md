# House Price Prediction System using CI/CD Automation and Cloud Deployment

This project demonstrates a complete end-to-end MLOps and DevOps lifecycle for a Machine Learning application. It features a house price prediction model served via a Flask REST API, with a modern frontend, integrated monitoring, automated CI/CD pipelines, and cloud infrastructure as code.

## Architecture & Workflow

### 1. MLOps Lifecycle
- **Data Preprocessing**: Data (`data/house_prices.csv`) is loaded, features and labels are separated, and data is split into training and testing sets.
- **Model Training**: A Random Forest Regressor is trained using `scikit-learn`. Features are scaled using `StandardScaler`.
- **Model Serialization**: The trained model and scaler are serialized using `joblib` and saved in the `models/` directory.
- **Automated Retraining**: A dedicated API endpoint (`/retrain`) triggers the `train.py` script to update the model dynamically when new data arrives.

### 2. Application Architecture
- **Backend (Flask API)**: Exposes endpoints for predictions (`/predict`), health checks (`/health`), and model retraining (`/retrain`).
- **Frontend (HTML/CSS/JS)**: A responsive, modern UI styled with vibrant colors and glassmorphism. It interacts dynamically with the backend.
- **Monitoring**: 
  - **Prometheus** scrapes metrics exposed by the Flask app (`app_request_count`, latency).
  - **Grafana** visualizes these metrics with pre-provisioned dashboards.

### 3. DevOps & CI/CD Pipeline
- **Jenkins Pipeline (`Jenkinsfile`)**:
  - Automatically triggered by GitHub pushes.
  - Installs dependencies and runs unit tests (`pytest`).
  - Trains the initial ML model.
  - Builds a Docker image.
  - Pushes the image to Docker Hub (`sanjanasshetty/house-price-prediction`).
  - Deploys locally via `docker-compose`. Includes a rollback step on failure.

### 4. Cloud Infrastructure (AWS + Terraform)
- **Terraform (`terraform/`)**:
  - Provisions an EC2 instance with Docker installed.
  - Configures Security Groups for ports 22, 5000, 9090, 3000.
  - Provisions an S3 bucket for backups and an RDS PostgreSQL instance.

---

## Step-by-Step Installation and Execution Instructions

### Prerequisites
- **Python 3.9+**
- **Git**
- **Docker Desktop**
- **Jenkins**
- **Terraform**
- **AWS CLI** (Configured with credentials)
- **VS Code**

### Local Development Setup (VS Code)

1. **Clone and Open**:
   Open the `Devops(new)` folder directly in VS Code.

2. **Set up Virtual Environment**:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Train the Initial Model**:
   ```bash
   python src/train.py
   ```
   *Expected Output*: "Model and scaler saved to ...\models"

5. **Run the Application Locally**:
   ```bash
   python app/app.py
   ```
   Open `http://localhost:5000` in your browser.

6. **Run Unit Tests**:
   ```bash
   pytest tests/
   ```

### Docker Setup and Deployment

1. **Run with Docker Compose**:
   Ensure Docker Desktop is running, then execute:
   ```bash
   docker-compose up -d --build
   ```
   
2. **Access Services**:
   - Web App: `http://localhost:5000`
   - Prometheus: `http://localhost:9090`
   - Grafana: `http://localhost:3000` (Login: `admin` / `admin`)

3. **Docker Hub Login and Push (Manual approach)**:
   ```bash
   docker login
   # Use username: sanjanasshetty
   
   docker build -t sanjanasshetty/house-price-prediction:latest .
   docker push sanjanasshetty/house-price-prediction:latest
   ```

### Jenkins CI/CD Configuration

1. **GitHub Integration**:
   - Create a GitHub repository and push this folder's contents.
   - Go to Repo Settings -> Webhooks -> Add webhook: `http://<YOUR_JENKINS_URL>/github-webhook/` (Select "Send me everything").

2. **Jenkins Setup**:
   - Create a new "Pipeline" job in Jenkins.
   - Under "Build Triggers", check "GitHub hook trigger for GITScm polling".
   - In "Pipeline", select "Pipeline script from SCM" -> Git -> Enter your repo URL.
   - Add your Docker Hub credentials in Jenkins: Manage Jenkins -> Credentials -> Add Credentials -> ID: `dockerhub-credentials`.

3. **Run Pipeline**: The pipeline will now trigger on every commit, testing, building, and pushing to `sanjanasshetty/house-price-prediction`.

### AWS Cloud Deployment using Terraform

1. **Initialize Terraform**:
   ```bash
   cd terraform
   terraform init
   ```

2. **Plan Infrastructure**:
   ```bash
   terraform plan
   ```

3. **Apply and Deploy**:
   ```bash
   terraform apply -auto-approve
   ```
   *Note: This will provision real AWS resources. Make sure to destroy them later.*

4. **SSH into EC2 (Optional)**:
   You can SSH into the created EC2 instance using the IP output by Terraform and clone your repo to run `docker-compose up -d` in the cloud.

5. **Destroy Infrastructure**:
   ```bash
   terraform destroy -auto-approve
   ```

## API Examples

**Health Check (GET /health)**
```bash
curl http://localhost:5000/health
# Response: {"status": "healthy", "model_loaded": true}
```

**Predict (POST /predict)**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"area": 3000, "bedrooms": 4, "age": 15}' http://localhost:5000/predict
# Response: {"predicted_price": 565000.0}
```

**Retrain Model (POST /retrain)**
```bash
curl -X POST http://localhost:5000/retrain
# Response: {"message": "Model retrained successfully", "logs": "..."}
```

## Environment Variables
- `FLASK_APP`: Defines the entry point for Flask (default: `app/app.py`).
- `PYTHONPATH`: Added to Docker to ensure relative imports work correctly (e.g., `/app`).
- `GF_SECURITY_ADMIN_PASSWORD`: Sets the Grafana admin password in `docker-compose.yml`.

## Important Notes
- This project is structured specifically to run within the `Devops(new)` folder.
- All Docker references strictly use the username `sanjanasshetty`.
- The frontend features premium CSS for a visually stunning UI experience.
