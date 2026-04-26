import json, os, math, random, urllib.request
from datetime import datetime

views_fpath = 'source/stats/views.json'
offset_fpath = 'source/stats/offset.json'
SITE_URL = 'https://blogs.yzy15.dpdns.org'

with open(views_fpath, 'r', encoding='utf-8') as f:
    views = json.load(f)

if views['total']['pv'] == 0 and views['total']['uv'] == 0:
    try:
        req = urllib.request.Request(
            SITE_URL + '/stats/views.json',
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            live = json.loads(resp.read().decode('utf-8'))
            if live['total']['pv'] > 0:
                views = live
                print(f'Using live views data: PV={live["total"]["pv"]}, UV={live["total"]["uv"]}')
                with open(views_fpath, 'w', encoding='utf-8') as f:
                    json.dump(views, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f'Live fetch failed: {e}')

with open(offset_fpath, 'r', encoding='utf-8') as f:
    offset = json.load(f)

for key in ['total_pv', 'total_uv', 'categories', 'tags', 'posts']:
    if key not in offset:
        if key in ('total_pv', 'total_uv'):
            offset[key] = 0
        else:
            offset[key] = {}

target = os.environ.get('TARGET', '')
mode = os.environ.get('MODE', 'set')
multiplier = os.environ.get('MULTIPLIER', '')
value_str = os.environ.get('VALUE', '')

def get_display_pv(slug):
    real = 0
    for p in views['posts']:
        if p['slug'] == slug:
            real = p['pv']
            break
    return real + offset['posts'].get(slug, 0)

def get_total_display():
    return sum(get_display_pv(p['slug']) for p in views['posts'])

def smart_alloc(posts, total_delta):
    if not posts or total_delta == 0:
        return {}

    current_total = sum(get_display_pv(p['slug']) for p in posts)
    weights = {}
    if current_total == 0:
        for p in posts:
            weights[p['slug']] = 1.0
    else:
        for p in posts:
            dp = get_display_pv(p['slug'])
            base = dp / current_total
            weights[p['slug']] = math.pow(base, 0.7)

    wsum = sum(weights.values())
    norm = {s: w / wsum for s, w in weights.items()}

    raw = {s: total_delta * n for s, n in norm.items()}

    rng = random.Random()
    jittered = {}
    for s, v in raw.items():
        noise = 1.0 + rng.uniform(-0.15, 0.15)
        jittered[s] = v * noise

    jsum = sum(jittered.values())
    scaled = {s: round(v / jsum * total_delta) for s, v in jittered.items()}

    diff = total_delta - sum(scaled.values())
    if diff != 0:
        slugs = list(scaled.keys())
        rng.shuffle(slugs)
        for i in range(abs(diff)):
            s = slugs[i % len(slugs)]
            scaled[s] += 1 if diff > 0 else -1

    return scaled

def recalculate():
    cat_off = {}
    tag_off = {}
    for p in views['posts']:
        p_off = offset['posts'].get(p['slug'], 0)
        cat = p.get('category', '')
        if cat:
            cat_off[cat] = cat_off.get(cat, 0) + p_off
        for t in p.get('tags', []):
            tag_off[t] = tag_off.get(t, 0) + p_off
    offset['categories'] = cat_off
    offset['tags'] = tag_off
    offset['total_pv'] = sum(offset['posts'].get(p['slug'], 0) for p in views['posts'])

if multiplier:
    try:
        mul = float(multiplier)
        for p in views['posts']:
            rp = p['pv']
            op = offset['posts'].get(p['slug'], 0)
            offset['posts'][p['slug']] = int(rp * (mul - 1) + op * mul)
        real_uv = views['total']['uv']
        off_uv = offset.get('total_uv', 0)
        offset['total_uv'] = int(real_uv * (mul - 1) + off_uv * mul)
        recalculate()
    except ValueError:
        pass
elif target:
    try:
        val = int(value_str)
    except ValueError:
        val = 0

    if target == 'total':
        if mode == 'add':
            delta = val
        else:
            current = get_total_display()
            delta = val - current
        alloc = smart_alloc(views['posts'], delta)
        for slug, amount in alloc.items():
            offset['posts'][slug] = offset['posts'].get(slug, 0) + amount
        recalculate()

    elif target == 'total_uv':
        if mode == 'add':
            offset['total_uv'] += val
        else:
            offset['total_uv'] = val - views['total']['uv']

    elif target.startswith('category:'):
        cat = target[9:]
        cat_posts = [p for p in views['posts'] if p.get('category', '') == cat]
        if mode == 'add':
            delta = val
        else:
            current_cat = sum(get_display_pv(p['slug']) for p in cat_posts)
            delta = val - current_cat
        alloc = smart_alloc(cat_posts, delta)
        for slug, amount in alloc.items():
            offset['posts'][slug] = offset['posts'].get(slug, 0) + amount
        recalculate()

    elif target.startswith('tag:'):
        tag = target[4:]
        tag_posts = [p for p in views['posts'] if tag in p.get('tags', [])]
        if mode == 'add':
            delta = val
        else:
            current_tag = sum(get_display_pv(p['slug']) for p in tag_posts)
            delta = val - current_tag
        alloc = smart_alloc(tag_posts, delta)
        for slug, amount in alloc.items():
            offset['posts'][slug] = offset['posts'].get(slug, 0) + amount
        recalculate()

    elif target.startswith('post:'):
        slug = target[5:]
        if mode == 'add':
            offset['posts'][slug] = offset['posts'].get(slug, 0) + val
        else:
            real = 0
            for p in views['posts']:
                if p['slug'] == slug:
                    real = p['pv']
                    break
            offset['posts'][slug] = val - real
        recalculate()

with open(offset_fpath, 'w', encoding='utf-8') as f:
    json.dump(offset, f, ensure_ascii=False, indent=2)
