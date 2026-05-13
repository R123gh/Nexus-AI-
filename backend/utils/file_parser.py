import os
import requests
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import docx
except ImportError:
    docx = None

def extract_text_from_file(file_path, ocr_api_key=None):
    """
    Extract text from a PDF, DOCX, TXT, or Image file.
    """
    ext = file_path.rsplit('.', 1)[-1].lower() if '.' in file_path else ''
    
    if ext == 'pdf':
        if not PyPDF2:
            return "PyPDF2 is not installed. Cannot read PDF."
        try:
            text = ""
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            return text.strip()
        except Exception as e:
            return f"Error reading PDF: {str(e)}"
            
    elif ext in ['docx', 'doc']:
        if not docx:
            return "python-docx is not installed. Cannot read DOCX."
        try:
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return text.strip()
        except Exception as e:
            return f"Error reading DOCX: {str(e)}"
            
    elif ext == 'txt':
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception as e:
            return f"Error reading TXT: {str(e)}"
            
    elif ext in ['png', 'jpg', 'jpeg', 'webp']:
        if not ocr_api_key:
            return "Error: OCR API key is required to process images. Please add it in Settings."
        try:
            with open(file_path, 'rb') as f:
                r = requests.post(
                    'https://api.ocr.space/parse/image',
                    files={'filename': f},
                    data={'apikey': ocr_api_key, 'language': 'eng'}
                )
            result = r.json()
            if result.get('IsErroredOnProcessing'):
                err_msg = result.get('ErrorMessage', ['Unknown error'])
                if isinstance(err_msg, list): err_msg = err_msg[0]
                return f"OCR Error: {err_msg}"
            
            parsed_text = result.get('ParsedResults', [{}])[0].get('ParsedText', '')
            if not parsed_text.strip():
                return "No text could be extracted from this image."
            return parsed_text.strip()
        except Exception as e:
            return f"Error processing OCR: {str(e)}"
            
    else:
        return f"Unsupported file type: {ext}"
