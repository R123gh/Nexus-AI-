"""
NexusAI — Web Scraper Service
Fetches and extracts text from web pages for summarization.
"""

import requests
from bs4 import BeautifulSoup

def scrape_webpage(url, max_chars=4000):
    """
    Fetches the content of a URL and extracts the main text.
    
    Args:
        url (str): The URL to scrape.
        max_chars (int): Max number of characters to return to avoid overwhelming the LLM.
        
    Returns:
        str: The extracted text.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
            script.extract()
            
        text = soup.get_text(separator=' ', strip=True)
        
        # Collapse whitespace
        text = ' '.join(text.split())
        
        if len(text) > max_chars:
            text = text[:max_chars] + "... [Content truncated]"
            
        return text
    except Exception as e:
        return f"Error scraping {url}: {str(e)}"
