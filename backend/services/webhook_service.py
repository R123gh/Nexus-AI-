import requests
import json

def send_webhook_payload(url, payload, method='POST', headers=None):
    """
    Send a payload to a webhook URL (e.g., Zapier, Make, custom).
    """
    if not headers:
        headers = {'Content-Type': 'application/json'}
    
    try:
        if method.upper() == 'POST':
            response = requests.post(url, json=payload, headers=headers, timeout=10)
        elif method.upper() == 'GET':
            response = requests.get(url, params=payload, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        response.raise_for_status()
        
        try:
            result = response.json()
        except:
            result = response.text
            
        return {
            'status_code': response.status_code,
            'response': result
        }
    except Exception as e:
        raise Exception(f"Webhook Delivery Failed: {str(e)}")
