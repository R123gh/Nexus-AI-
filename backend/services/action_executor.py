"""
NexusAI — Action Executor
Executes whitelisted system actions (open URLs, apps, search).
No shell=True, no arbitrary command execution.
"""

import webbrowser
import subprocess
import platform
from utils.security import is_action_allowed, sanitize_url, is_command_safe
from services.scraper_service import scrape_webpage


def execute_action(action_type, params=None):
    """
    Execute a whitelisted action.

    Args:
        action_type: One of the allowed action types
        params: Dict with action parameters (url, query, app, etc.)

    Returns:
        Dict with status and message.
    """
    if not is_action_allowed(action_type):
        return {
            'status': 'blocked',
            'message': f'Action "{action_type}" is not in the whitelist.',
        }

    params = params or {}

    try:
        if action_type == 'open_youtube':
            url = params.get('url', 'https://www.youtube.com')
            webbrowser.open(sanitize_url(url) or 'https://www.youtube.com')
            return {'status': 'executed', 'message': 'YouTube opened in your browser.'}

        elif action_type == 'open_google':
            url = params.get('url', 'https://www.google.com')
            webbrowser.open(sanitize_url(url) or 'https://www.google.com')
            return {'status': 'executed', 'message': 'Google opened in your browser.'}

        elif action_type == 'open_url':
            raw_url = params.get('url', '')
            url = sanitize_url(raw_url)
            if not url:
                return {'status': 'error', 'message': f'Invalid or unsafe URL: {raw_url}'}
            webbrowser.open(url)
            return {'status': 'executed', 'message': f'Opened {raw_url} in your browser.'}

        elif action_type == 'search_web':
            query = params.get('query', '')
            if not query:
                return {'status': 'error', 'message': 'No search query provided.'}
            
            try:
                import requests
                from bs4 import BeautifulSoup
                
                # Use DuckDuckGo Lite (no JS) for scraping results
                url = f"https://html.duckduckgo.com/html/?q={query}"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
                response = requests.get(url, headers=headers, timeout=10)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                results = []
                for result in soup.find_all('div', class_='result'):
                    title_tag = result.find('a', class_='result__a')
                    snippet_tag = result.find('a', class_='result__snippet')
                    if title_tag and snippet_tag:
                        results.append({
                            'title': title_tag.get_text(),
                            'link': title_tag.get('href'),
                            'snippet': snippet_tag.get_text()
                        })
                
                if not results:
                    # Fallback to Wikipedia if DDG fails or has no results
                    wiki_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&utf8=&format=json"
                    wiki_res = requests.get(wiki_url, headers=headers, timeout=5)
                    wiki_data = wiki_res.json().get('query', {}).get('search', [])
                    
                    if not wiki_data:
                        return {'status': 'executed', 'message': f'No results found for "{query}".', 'data': ''}
                    
                    search_text = f"No live search results found. Here is what I found on Wikipedia for '{query}':\n\n"
                    for i, r in enumerate(wiki_data[:3]):
                        search_text += f"{i+1}. {r.get('title')}\nSnippet: {r.get('snippet')}\n\n"
                else:
                    search_text = f"Live Web Search Results for '{query}':\n\n"
                    for i, r in enumerate(results[:5]):
                        search_text += f"{i+1}. {r['title']}\nSource: {r['link']}\nSnippet: {r['snippet']}\n\n"
                
                return {'status': 'executed', 'message': f'Performed web search for "{query}".', 'data': search_text}
            except Exception as e:
                return {'status': 'error', 'message': f'Search failed: {str(e)}'}

        elif action_type == 'get_weather':
            location = params.get('location', '').strip()
            if not location:
                return {'status': 'error', 'message': 'No location provided for weather.'}
            
            try:
                import requests
                url = f"https://wttr.in/{location.replace(' ', '+')}?format=j1"
                response = requests.get(url, timeout=10)
                data = response.json()
                current = data['current_condition'][0]
                temp_c = current['temp_C']
                desc = current['weatherDesc'][0]['value']
                humidity = current['humidity']
                wind = current['windspeedKmph']
                
                weather_info = f"Current weather in {location}:\nTemperature: {temp_c}°C\nConditions: {desc}\nHumidity: {humidity}%\nWind: {wind} km/h"
                return {'status': 'executed', 'message': f'Checked weather for {location}.', 'data': weather_info}
            except Exception as e:
                return {'status': 'error', 'message': f'Could not fetch weather: {str(e)}'}

        elif action_type == 'scrape_url':
            url = params.get('url', '')
            if not url:
                return {'status': 'error', 'message': 'No URL provided to scrape.'}
            safe_url = sanitize_url(url)
            if not safe_url:
                return {'status': 'error', 'message': f'Invalid URL: {url}'}
            text = scrape_webpage(safe_url)
            return {'status': 'executed', 'message': f'Scraped content from {safe_url}', 'data': text}


        elif action_type == 'open_app':
            app_name = params.get('app', '').strip()
            if not app_name:
                return {'status': 'error', 'message': 'No application name provided.'}

            # Security check
            if not is_command_safe(app_name):
                return {'status': 'blocked', 'message': f'Application "{app_name}" is blocked for security reasons.'}

            system = platform.system().lower()
            if system == 'windows':
                # Try to open the app using 'start' via subprocess
                subprocess.Popen(
                    ['cmd', '/c', 'start', '', app_name],
                    shell=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            elif system == 'darwin':
                subprocess.Popen(
                    ['open', '-a', app_name],
                    shell=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                subprocess.Popen(
                    [app_name],
                    shell=False,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            return {'status': 'executed', 'message': f'Opened {app_name}.'}

        elif action_type == 'list_files':
            path = params.get('path', '.')
            if not os.path.exists(path):
                return {'status': 'error', 'message': f'Path not found: {path}'}
            files = os.listdir(path)
            return {'status': 'executed', 'message': f'Found {len(files)} items in {path}.', 'data': files}

        elif action_type == 'move_file':
            src = params.get('src', '')
            dst = params.get('dst', '')
            if not src or not dst:
                return {'status': 'error', 'message': 'Source and destination are required.'}
            import shutil
            shutil.move(src, dst)
            return {'status': 'executed', 'message': f'Moved {os.path.basename(src)} to {dst}.'}

        elif action_type == 'create_file':
            path = params.get('path', '')
            content = params.get('content', '')
            if not path:
                return {'status': 'error', 'message': 'File path is required.'}
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {'status': 'executed', 'message': f'Created file: {path}'}

        elif action_type == 'delete_file':
            path = params.get('path', '')
            if not path:
                return {'status': 'error', 'message': 'File path is required.'}
            if os.path.isdir(path):
                import shutil
                shutil.rmtree(path)
            else:
                os.remove(path)
            return {'status': 'executed', 'message': f'Deleted: {path}'}

        else:
            return {'status': 'error', 'message': f'Unknown action type: {action_type}'}

    except FileNotFoundError:
        return {'status': 'error', 'message': f'Application not found: {params.get("app", "unknown")}'}
    except Exception as e:
        return {'status': 'error', 'message': f'Action failed: {str(e)}'}
