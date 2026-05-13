import requests
import pandas as pd
import numpy as np

API_BASE = "http://127.0.0.1:5000/api/ds"
SESSION_ID = "test_error_repro_v3"

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
        res = requests.post(f"{API_BASE}/upload", files={"file": f}, data={"session_id": SESSION_ID})
    print("Upload Status:", res.status_code)
    
    # 2. Train
    print("\nTraining...")
    train_config = {
        "session_id": SESSION_ID,
        "target": "target",
        "features": ["age", "gender"],
        "task_type": "regression"
    }
    res = requests.post(f"{API_BASE}/train", json=train_config)
    print("Train Status:", res.status_code)
    
    # 3. Predict
    print("\nPredicting...")
    predict_config = {
        "session_id": SESSION_ID,
        "inputs": {
            "age": "25",
            "gender": "M"
        }
    }
    res = requests.post(f"{API_BASE}/predict-data", json=predict_config)
    print("Predict Status:", res.status_code)
    try: print("Predict JSON:", res.json())
    except: print("Predict Text:", res.text[:200])

if __name__ == "__main__":
    reproduce_error()
