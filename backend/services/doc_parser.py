import pdfplumber
import pandas as pd
import io
import os

class DocumentParser:
    """Intelligent Document Parsing for table extraction."""
    
    def pdf_to_csv(self, file_path):
        """Extract all tables from a PDF and return as a dictionary of CSVs."""
        csv_results = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    tables = page.extract_tables()
                    for j, table in enumerate(tables):
                        # Convert to DataFrame
                        if not table:
                            continue
                            
                        # Basic cleanup: remove None values and replace with empty string
                        clean_table = [[str(cell) if cell is not None else "" for cell in row] for row in table]
                        
                        df = pd.DataFrame(clean_table)
                        
                        # Use first row as header if it looks like one
                        if len(df) > 1:
                            df.columns = df.iloc[0]
                            df = df[1:]
                        
                        # Convert to CSV string
                        output = io.StringIO()
                        df.to_csv(output, index=False)
                        csv_results.append({
                            'page': i + 1,
                            'table_index': j + 1,
                            'csv_content': output.getvalue()
                        })
            
            return {
                'status': 'success',
                'tables': csv_results,
                'count': len(csv_results)
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

# Global instance
doc_parser = DocumentParser()
