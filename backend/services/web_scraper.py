import requests
from bs4 import BeautifulSoup

def scrape_website_content(url):
    """
    Scrape text content from a website URL.
    Returns the title and the main text content.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for element in soup(["script", "style"]):
            element.decompose()
            
        # Get title
        title = soup.title.string if soup.title else "No Title Found"
        
        # Get text
        text = soup.get_text(separator='\n')
        
        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return {
            'title': title,
            'content': text
        }
    except Exception as e:
        raise Exception(f"Failed to scrape website: {str(e)}")
