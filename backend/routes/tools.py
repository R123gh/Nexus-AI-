"""
NexusAI — AI Tools Route
POST /api/tools/<tool_name> — Execute AI-powered tools for real-life problem solving.
GET  /api/tools/list — Get available tools metadata.
"""

from flask import Blueprint, request, jsonify
from config import get_groq_key
from services.ai_tools import execute_tool, get_tool_list
from services.researcher import researcher
from services.doc_parser import doc_parser
from utils.validators import validate_model

tools_bp = Blueprint('tools', __name__)


@tools_bp.route('/list', methods=['GET'])
def list_tools():
    """Return metadata for all available AI tools."""
    return jsonify({'tools': get_tool_list()}), 200


@tools_bp.route('/deep-research', methods=['POST'])
def run_deep_research():
    """Perform exhaustive multi-step research."""
    try:
        data = request.json or {}
        topic = data.get('topic', '').strip()
        user_id = data.get('user_id')
        
        if not topic:
            return jsonify({'error': 'Research topic is required'}), 400
            
        api_key = get_groq_key(request)
        if not api_key:
            return jsonify({'error': 'Groq API key not configured'}), 401
            
        # Log analytics
        if user_id:
            from services.memory import memory
            memory.log_event(user_id, 'deep_research_started', {'topic': topic})
            
        report = researcher.perform_research(topic, api_key)
        
        return jsonify({
            'topic': topic,
            'report': report,
            'status': 'completed'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tools_bp.route('/pdf-to-csv', methods=['POST'])
def extract_pdf_tables():
    """Extract tables from PDF and return as CSV data."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No PDF file provided'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        import os
        from werkzeug.utils import secure_filename
        from config import UPLOAD_FOLDER
        
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        result = doc_parser.pdf_to_csv(file_path)
        
        # Clean up
        if os.path.exists(file_path):
            os.remove(file_path)
            
        if result['status'] == 'error':
            return jsonify(result), 500
            
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tools_bp.route('/<tool_name>', methods=['POST'])
def handle_tool(tool_name):
    """
    Execute a specific AI tool.

    Expects JSON with tool-specific fields.
    Returns JSON:
    {
        "tool": "tool-name",
        "result": "...markdown formatted result..."
    }
    or on error:
    {
        "tool": "tool-name",
        "error": "error message"
    }
    """
    try:
        if request.is_json:
            data = request.get_json(silent=True) or {}
        else:
            data = request.form.to_dict()
            
            # Handle resume file specifically for resume-analyzer
            if tool_name == 'resume-analyzer' and 'resume_file' in request.files:
                file = request.files['resume_file']
                if file.filename != '':
                    import os
                    from werkzeug.utils import secure_filename
                    from config import UPLOAD_FOLDER
                    from utils.file_parser import extract_text_from_file
                    
                    filename = secure_filename(file.filename)
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(file_path)
                    
                    extracted_text = extract_text_from_file(file_path)
                    data['resume_text'] = extracted_text
                    
                    # Clean up
                    if os.path.exists(file_path):
                        os.remove(file_path)

        if not data:
            return jsonify({'error': 'Invalid request body'}), 400

        # Get API key
        api_key = get_groq_key(request)
        if not api_key:
            return jsonify({
                'error': 'Groq API key not configured. Set it in Settings or as GROQ_API_KEY environment variable.'
            }), 401

        # Get optional model override
        model = validate_model(data.get('model', ''))

        # Execute the tool
        result = execute_tool(
            tool_name=tool_name,
            data=data,
            api_key=api_key,
            model=model,
        )

        if 'error' in result:
            return jsonify(result), 400

        # Log tool usage analytics
        user_id = data.get('user_id')
        if user_id:
            from services.memory import memory
            memory.log_event(user_id, 'tool_usage', {'tool': tool_name})

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'tool': tool_name, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'tool': tool_name, 'error': f'Tool execution failed: {str(e)}'}), 500
