import requests
import pandas as pd
import numpy as np

API_BASE = "http://127.0.0.1:5000/api/ds"
SESSION_ID = "test_error_repro"

def reproduce_error():
    # 1. Upload
    print("Uploading...")
    df = pd.DataFrame({
        'age': [20, 30, 40, 50, 60, 70],
        'gender': ['M', 'F', 'M', 'F', 'M', 'F'],
        'target': [100, 200, 300, 400, 500, 600]
    })
    df.to_csv("repro_data.csv", index=False)
    with open("repro_data.csv", "rb") as f:
        requests.post(f"{API_BASE}/upload", files={"file": f}, data={"session_id": SESSION_ID})
    
    # 2. Train
    print("Training...")
    train_config = {
        "session_id": SESSION_ID,
        "target": "target",
        "features": ["age", "gender"],
        "task_type": "regression"
    }
    requests.post(f"{API_BASE}/train", json=train_config)
    
    # 3. Predict with strings (what the user is doing)
    print("Predicting...")
    predict_config = {
        "session_id": SESSION_ID,
        "inputs": {
            "age": "25", # String representation of number
            "gender": "M"
        }
    }
    res = requests.post(f"{API_BASE}/predict", json=predict_config)
    print("Status Code:", res.status_code)
    print("Response:", res.json())

if __name__ == "__main__":
    reproduce_error()
