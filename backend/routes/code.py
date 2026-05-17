"""
NexusAI — Code Execution Route
Executes Python code in a safe, controlled environment.
"""

from flask import Blueprint, request, jsonify
import sys
import io
import contextlib
import subprocess
import tempfile
import os

code_bp = Blueprint('code', __name__)

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Filter to only show relevant files in the explorer
ALLOWED_EXTENSIONS = {'.py', '.js', '.go', '.html', '.css', '.json', '.md', '.txt', '.csv'}

@code_bp.route('/files', methods=['GET'])
def list_files():
    files = []
    # Only show files in the root for now to keep it simple, or recursive if needed
    for f in os.listdir(WORKSPACE_DIR):
        full_path = os.path.join(WORKSPACE_DIR, f)
        if os.path.isfile(full_path):
            ext = os.path.splitext(f)[1].lower()
            if ext in ALLOWED_EXTENSIONS:
                files.append({'name': f, 'path': full_path})
    return jsonify({'files': files})

@code_bp.route('/file', methods=['GET'])
def get_file():
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'No path provided'}), 400
    if not os.path.isabs(path):
        path = os.path.join(WORKSPACE_DIR, os.path.basename(path))
    if not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    return jsonify({'content': content})

@code_bp.route('/save', methods=['POST'])
def save_file():
    data = request.json
    path = data.get('path')
    content = data.get('content', '')
    if not path:
        return jsonify({'error': 'No path provided'}), 400
        
    # If it's just a filename, put it in the workspace
    if not os.path.isabs(path):
        path = os.path.join(WORKSPACE_DIR, os.path.basename(path))
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return jsonify({'status': 'success', 'path': path})

@code_bp.route('/packages', methods=['GET'])
def list_packages():
    try:
        proc = subprocess.run([sys.executable, '-m', 'pip', 'list', '--format=json'], capture_output=True, text=True)
        import json
        pkgs = json.loads(proc.stdout)
        return jsonify(pkgs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@code_bp.route('/packages/install', methods=['POST'])
def install_package():
    data = request.json
    pkg = data.get('package')
    if not pkg:
        return jsonify({'error': 'No package provided'}), 400
    try:
        proc = subprocess.run([sys.executable, '-m', 'pip', 'install', pkg], capture_output=True, text=True)
        if proc.returncode == 0:
            return jsonify({'status': 'success', 'output': proc.stdout})
        return jsonify({'error': proc.stderr}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@code_bp.route('/run', methods=['POST'])
def run_code():
    data = request.json
    path = data.get('path')
    if not path:
        return jsonify({'error': 'No path provided'}), 400
    if not os.path.isabs(path):
        path = os.path.join(WORKSPACE_DIR, os.path.basename(path))
    if not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404
        
    ext = os.path.splitext(path)[1].lower()
    
    try:
        if ext == '.py':
            proc = subprocess.run([sys.executable, path], capture_output=True, text=True, timeout=30)
        elif ext == '.js':
            proc = subprocess.run(['node', path], capture_output=True, text=True, timeout=30)
        elif ext == '.go':
            proc = subprocess.run(['go', 'run', path], capture_output=True, text=True, timeout=30)
        else:
            return jsonify({'error': f'Unsupported extension: {ext}'})
            
        return jsonify({'output': proc.stdout, 'error': proc.stderr, 'exit_code': proc.returncode})
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Execution timeout.'})
    except Exception as e:
        return jsonify({'error': str(e)})

@code_bp.route('/execute', methods=['POST'])
def execute_code():
    data = request.json
    code = data.get('code', '')
    language = data.get('language', 'python').lower()
    
    if not code.strip():
        return jsonify({'output': '', 'error': 'No code provided.'})
    
    print(f"Code execution request: language={language}")
    
    # Language configuration
    lang_config = {
        'python': {
            'extension': '.py',
            'command': [sys.executable]
        },
        'javascript': {
            'extension': '.js',
            'command': ['node']
        },
        'php': {
            'extension': '.php',
            'command': ['php']
        },
        'cpp': {
            'extension': '.cpp',
            'compile': True,
            'compile_cmd': ['g++'],
            'output_ext': '.exe'
        },
        'c': {
            'extension': '.c',
            'compile': True,
            'compile_cmd': ['gcc'],
            'output_ext': '.exe'
        },
        'java': {
            'extension': '.java',
            'compile': True,
            'compile_cmd': ['javac'],
            'run_cmd': ['java'],
            'output_ext': '.class'
        },
        'go': {
            'extension': '.go',
            'command': ['go', 'run']
        }
    }
    
    if language not in lang_config:
        return jsonify({'output': '', 'error': f'Language {language} is not supported yet.'})
    
    config = lang_config[language]
    temp_dir = tempfile.gettempdir()
    
    # Special handling for Java: filename must match public class name
    if language == 'java':
        import re
        match = re.search(r'public\s+class\s+(\w+)', code)
        class_name = match.group(1) if match else "Main"
        temp_file = os.path.join(temp_dir, f"{class_name}.java")
    else:
        temp_file = os.path.join(temp_dir, f"nexus_code_{os.getpid()}{config['extension']}")
    
    exe_file = None
    
    try:
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(code)
            
        # Compilation step for languages like C++, C, Java
        if config.get('compile'):
            if language == 'java':
                # javac compiles .java to .class
                compile_proc = subprocess.run(
                    config['compile_cmd'] + [temp_file],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if compile_proc.returncode != 0:
                    return jsonify({
                        'output': compile_proc.stdout,
                        'error': f"Compilation Error:\n{compile_proc.stderr}",
                        'exit_code': compile_proc.returncode
                    })
                # For Java, we run 'java -cp temp_dir ClassName'
                class_name = os.path.basename(temp_file).replace('.java', '')
                exec_command = config['run_cmd'] + ['-cp', temp_dir, class_name]
                # Keep track of .class file for cleanup
                exe_file = temp_file.replace('.java', '.class')
            else:
                exe_file = temp_file.replace(config['extension'], config['output_ext'])
                compile_proc = subprocess.run(
                    config['compile_cmd'] + [temp_file, '-o', exe_file],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if compile_proc.returncode != 0:
                    return jsonify({
                        'output': compile_proc.stdout,
                        'error': f"Compilation Error:\n{compile_proc.stderr}",
                        'exit_code': compile_proc.returncode
                    })
                exec_command = [exe_file]
        else:
            exec_command = config['command'] + [temp_file]
            
        # Execution
        process = subprocess.run(
            exec_command,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        return jsonify({
            'output': process.stdout,
            'error': process.stderr,
            'exit_code': process.returncode
        })
            
    except subprocess.TimeoutExpired:
        return jsonify({'output': '', 'error': 'Execution Timeout: Code took longer than 30 seconds to run.'})
    except FileNotFoundError as e:
        return jsonify({'output': '', 'error': f'Compiler/Interpreter not found: {str(e)}. Please ensure the language runtime is installed on the host system.'})
    except Exception as e:
        return jsonify({'output': '', 'error': str(e)})
    finally:
        # Cleanup
        for f_path in [temp_file, exe_file]:
            if f_path and os.path.exists(f_path):
                try:
                    os.remove(f_path)
                except:
                    pass

@code_bp.route('/terminal', methods=['POST'])
def run_terminal_command():
    data = request.json
    command = data.get('command')
    if not command:
        return jsonify({'error': 'No command provided'}), 400
        
    try:
        # Run arbitrary shell command inside WORKSPACE_DIR
        proc = subprocess.run(
            command,
            shell=True,
            cwd=WORKSPACE_DIR,
            capture_output=True,
            text=True,
            timeout=30
        )
        combined = ""
        if proc.stdout:
            combined += proc.stdout
        if proc.stderr:
            combined += proc.stderr
            
        if not combined:
            combined = f"Command exited with code {proc.returncode}"
            
        return jsonify({
            'output': combined,
            'exit_code': proc.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout expired.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
