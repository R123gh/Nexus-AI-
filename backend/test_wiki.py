import requests

def test_wiki():
    url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=python&utf8=&format=json"
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)
    results = response.json().get('query', {}).get('search', [])
    for r in results[:2]:
        print(r['title'])
        print(r['snippet'])

if __name__ == '__main__':
    test_wiki()
