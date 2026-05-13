import requests
import base64

def get_repo_details(repo_url):
    """
    Fetch repository details from GitHub API.
    Expected format: https://github.com/owner/repo
    """
    # Clean and parse URL
    url = repo_url.rstrip('/')
    if url.endswith('.git'):
        url = url[:-4]
        
    parts = url.split('/')
    
    try:
        # Find github.com in the parts
        github_idx = -1
        for i, p in enumerate(parts):
            if 'github.com' in p:
                github_idx = i
                break
        
        if github_idx == -1 or len(parts) < github_idx + 3:
            raise ValueError("Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo)")

        owner = parts[github_idx + 1]
        repo = parts[github_idx + 2]
        
        # Check for reserved keywords that aren't users/orgs
        reserved = {'topics', 'search', 'marketplace', 'trending', 'explore', 'codespaces', 'features', 'pricing'}
        if owner.lower() in reserved:
            raise ValueError(f"The URL provided is a GitHub {owner.capitalize()} page. Please provide a direct link to a specific repository.")
            
    except Exception as e:
        if isinstance(e, ValueError): raise e
        raise ValueError("Could not parse GitHub URL. Please ensure it follows the format: https://github.com/owner/repo")

    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        repo_data = response.json()
        
        # Fetch README
        readme_url = f"{api_url}/readme"
        readme_content = ""
        try:
            readme_res = requests.get(readme_url)
            if readme_res.status_code == 200:
                readme_data = readme_res.json()
                readme_content = base64.b64decode(readme_data['content']).decode('utf-8')
        except:
            readme_content = "README not found or could not be decoded."
            
        # Fetch file structure (top-level)
        contents_url = f"{api_url}/contents"
        structure = []
        try:
            contents_res = requests.get(contents_url)
            if contents_res.status_code == 200:
                contents_data = contents_res.json()
                structure = [item['name'] for item in contents_data]
        except:
            structure = ["Could not fetch file structure."]
            
        return {
            'name': repo_data.get('name'),
            'description': repo_data.get('description'),
            'stars': repo_data.get('stargazers_count'),
            'forks': repo_data.get('forks_count'),
            'language': repo_data.get('language'),
            'topics': repo_data.get('topics', []),
            'readme': readme_content,
            'structure': structure
        }
    except Exception as e:
        raise Exception(f"GitHub API Error: {str(e)}")
