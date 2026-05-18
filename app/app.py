import os
import sys
import time
import subprocess
import joblib
import random
from flask import Flask, request, jsonify, render_template
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

app = Flask(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('app_request_count', 'Total API requests', ['method', 'endpoint', 'http_status'])
REQUEST_LATENCY = Histogram('app_request_latency_seconds', 'Request latency in seconds', ['endpoint'])

# Load Model
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(base_dir, 'models', 'model.joblib')
scaler_path = os.path.join(base_dir, 'models', 'scaler.joblib')

model = None
scaler = None
prediction_history = []  # In-memory history

def load_model():
    global model, scaler
    try:
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            model = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
            print("Model and scaler loaded successfully.")
        else:
            print("Model files not found. Please train the model.")
    except Exception as e:
        print(f"Error loading model: {e}")

load_model()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/health', methods=['GET'])
def health_check():
    REQUEST_COUNT.labels('GET', '/health', 200).inc()
    return jsonify({'status': 'healthy', 'model_loaded': model is not None}), 200

@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()
    try:
        if model is None or scaler is None:
            return jsonify({'error': 'Model not loaded'}), 500

        data = request.json
        area = data.get('area')
        bedrooms = data.get('bedrooms')
        age = data.get('age')

        if area is None or bedrooms is None or age is None:
            return jsonify({'error': 'Missing required fields'}), 400

        features = [[area, bedrooms, age]]
        scaled_features = scaler.transform(features)
        prediction = model.predict(scaled_features)[0]
        
        latency = time.time() - start_time
        REQUEST_LATENCY.labels('/predict').observe(latency)
        REQUEST_COUNT.labels('POST', '/predict', 200).inc()
        
        # Save to history
        history_entry = {
            'id': len(prediction_history) + 1,
            'area': area,
            'bedrooms': bedrooms,
            'age': age,
            'predicted_price': round(prediction, 2),
            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
        }
        prediction_history.append(history_entry)
        
        return jsonify({'predicted_price': round(prediction, 2), 'history': history_entry})
    except Exception as e:
        REQUEST_COUNT.labels('POST', '/predict', 500).inc()
        return jsonify({'error': str(e)}), 400

@app.route('/retrain', methods=['POST'])
def retrain():
    try:
        train_script = os.path.join(base_dir, 'src', 'train.py')
        result = subprocess.run([sys.executable, train_script], capture_output=True, text=True)
        
        if result.returncode == 0:
            load_model()  # Reload the new model
            REQUEST_COUNT.labels('POST', '/retrain', 200).inc()
            return jsonify({'message': 'Model retrained successfully', 'logs': result.stdout})
        else:
            REQUEST_COUNT.labels('POST', '/retrain', 500).inc()
            return jsonify({'error': 'Model retraining failed', 'logs': result.stderr}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Returns analytics data for the dashboard charts"""
    total_predictions = len(prediction_history)
    avg_price = sum([h['predicted_price'] for h in prediction_history]) / total_predictions if total_predictions > 0 else 0
    
    # Mock some data for Jenkins/AWS
    stats = {
        'total_predictions': total_predictions,
        'average_price': round(avg_price, 2),
        'model_accuracy': '92.5%', # Mock accuracy
        'active_deployments': 3,
        'history': prediction_history[-10:], # Last 10
        'chart_data': {
            'labels': [h['timestamp'].split(' ')[1] for h in prediction_history[-5:]] if prediction_history else ['10:00', '11:00', '12:00', '13:00', '14:00'],
            'prices': [h['predicted_price'] for h in prediction_history[-5:]] if prediction_history else [500000, 520000, 510000, 540000, 530000]
        },
        'system_health': {
            'cpu': random.randint(20, 60),
            'memory': random.randint(40, 80),
            'jenkins_status': 'Success',
            'docker_status': 'Healthy'
        }
    }
    return jsonify(stats)

@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
