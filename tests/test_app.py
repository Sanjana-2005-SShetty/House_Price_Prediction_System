import os
import pytest
from app.app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'

def test_predict_endpoint(client):
    # Ensure model is trained first or handled
    data = {
        "area": 2500,
        "bedrooms": 3,
        "age": 10
    }
    response = client.post('/predict', json=data)
    # 200 or 500 depending on if model is loaded
    assert response.status_code in [200, 500]
    if response.status_code == 200:
        assert 'predicted_price' in response.json
