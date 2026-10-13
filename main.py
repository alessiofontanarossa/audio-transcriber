import subprocess
import sys
import time
import os

def main():
    print("Starting Audio Transcriber WebApp...")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    # Determine Python executable (prefer .venv if present)
    venv_python = os.path.join(base_dir, ".venv", "bin", "python")
    if os.name == "nt":
        venv_python = os.path.join(base_dir, ".venv", "Scripts", "python.exe")
    
    python_cmd = venv_python if os.path.exists(venv_python) else sys.executable

    # Check for .env file
    if not os.path.exists(os.path.join(backend_dir, ".env")):
        print("WARNING: 'backend/.env' file not found. OpenAI API key might be missing!")

    print(f"Starting backend using: {python_cmd}...")
    backend_process = subprocess.Popen(
        [python_cmd, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir
    )

    # Give backend a moment to initialize
    time.sleep(2)

    print("Starting frontend...")
    npm_cmd = "npm" if os.name != "nt" else "npm.cmd"
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir
    )

    print("\n" + "="*55)
    print("🚀 WebApp is running!")
    print("Backend API is available at:  http://localhost:8000")
    print("Frontend is available at:     http://localhost:5173")
    print("\n👉 CLICK THE LINK ABOVE TO OPEN THE APPLICATION 👈")
    print("Press Ctrl+C to stop both servers gracefully.")
    print("="*55 + "\n")

    try:
        # Keep the main thread alive to monitor processes
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n\nStopping servers...")
        backend_process.terminate()
        frontend_process.terminate()
        
        # Wait for processes to exit
        backend_process.wait()
        frontend_process.wait()
        print("Servers stopped successfully. Goodbye!")

if __name__ == "__main__":
    main()
