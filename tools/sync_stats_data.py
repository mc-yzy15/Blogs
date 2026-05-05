import json, os, urllib.request, base64

repo = os.environ.get('GITHUB_REPOSITORY', '')
token = os.environ.get('GITHUB_TOKEN', '')
SITE = 'https://blogs.yzy15.dpdns.org'

defaults = {
    'views.json': {'total': {'pv': 0, 'uv': 0}, 'categories': {}, 'tags': {}, 'posts': [], 'updated_at': ''},
    'offset.json': {'total_pv': 0, 'total_uv': 0, 'categories': {}, 'tags': {}, 'posts': {}}
}

os.makedirs('source/stats', exist_ok=True)

for fname, default in defaults.items():
    fpath = f'source/stats/{fname}'
    content = None

    if repo and token:
        try:
            url = f'https://api.github.com/repos/{repo}/contents/source/stats/{fname}?ref=master'
            req = urllib.request.Request(url, headers={
                'Authorization': f'token {token}',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Mozilla/5.0'
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                content = base64.b64decode(data['content']).decode('utf-8')
                json.loads(content)
            print(f'Fetched {fname} from GitHub API (master branch, {len(content)} bytes)')
        except Exception as e:
            print(f'GitHub API fetch failed for {fname}: {e}')

    if not content:
        try:
            url = f'{SITE}/stats/{fname}'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode('utf-8')
                json.loads(raw)
                content = raw
            print(f'Fetched {fname} from live site ({len(raw)} bytes)')
        except Exception as e:
            print(f'Live site fetch failed for {fname}: {e}')

    if not content and os.path.exists(fpath) and os.path.getsize(fpath) > 0:
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                json.load(f)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            print(f'Using local file for {fname}')
        except Exception:
            pass

    if not content:
        content = json.dumps(default, ensure_ascii=False, indent=2)
        print(f'Using default for {fname}')

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
