import subprocess
import os
import sys
import time

def run_project():
    print("\n" + "="*60)
    print("  NexusAI Launcher")
    print("="*60)
    
    # Get the current directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, 'backend')
    
    print(f"[*] Starting backend from: {backend_dir}")
    
    try:
        # Check if requirements are installed (optional but helpful)
        # subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", os.path.join(backend_dir, "requirements.txt")])
        
        # Run app.py
        app_path = os.path.join(backend_dir, 'app.py')
        
        # Using subprocess.Popen to let it run
        process = subprocess.Popen([sys.executable, 'app.py'], cwd=backend_dir)
        
        print("[+] Backend process started.")
        print("[+] Access the dashboard at: http://127.0.0.1:5000")
        print("[!] Press Ctrl+C to stop.")
        
        # Keep the script alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n[!] Shutting down...")
        process.terminate()
    except Exception as e:
        print(f"[!] Error: {e}")

if __name__ == "__main__":
    run_project()
