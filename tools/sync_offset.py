import json, os, urllib.request
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

def get_real(t):
    if t == 'total':
        return views['total']['pv']
    elif t == 'total_uv':
        return views['total']['uv']
    elif t.startswith('category:'):
        cat = t[9:]
        return views['categories'].get(cat, {}).get('pv', 0)
    elif t.startswith('tag:'):
        tag = t[4:]
        return views['tags'].get(tag, {}).get('pv', 0)
    elif t.startswith('post:'):
        slug = t[5:]
        for p in views['posts']:
            if p['slug'] == slug:
                return p['pv']
    return 0

def add_off(t, delta):
    if t == 'total':
        offset['total_pv'] += delta
    elif t == 'total_uv':
        offset['total_uv'] += delta
    elif t.startswith('category:'):
        cat = t[9:]
        offset['categories'][cat] = offset['categories'].get(cat, 0) + delta
    elif t.startswith('tag:'):
        tag = t[4:]
        offset['tags'][tag] = offset['tags'].get(tag, 0) + delta
    elif t.startswith('post:'):
        slug = t[5:]
        offset['posts'][slug] = offset['posts'].get(slug, 0) + delta

def set_off(t, val):
    if t == 'total':
        offset['total_pv'] = val
    elif t == 'total_uv':
        offset['total_uv'] = val
    elif t.startswith('category:'):
        cat = t[9:]
        offset['categories'][cat] = val
    elif t.startswith('tag:'):
        tag = t[4:]
        offset['tags'][tag] = val
    elif t.startswith('post:'):
        slug = t[5:]
        offset['posts'][slug] = val

if multiplier:
    try:
        mul = float(multiplier)
        real_pv = views['total']['pv']
        off_pv = offset.get('total_pv', 0)
        offset['total_pv'] = int(real_pv * (mul - 1) + off_pv * mul)
        real_uv = views['total']['uv']
        off_uv = offset.get('total_uv', 0)
        offset['total_uv'] = int(real_uv * (mul - 1) + off_uv * mul)
        for cat in views['categories']:
            rc = views['categories'][cat]['pv']
            oc = offset['categories'].get(cat, 0)
            offset['categories'][cat] = int(rc * (mul - 1) + oc * mul)
        for tag in views.get('tags', {}):
            rt = views['tags'][tag]['pv']
            ot = offset['tags'].get(tag, 0)
            offset['tags'][tag] = int(rt * (mul - 1) + ot * mul)
        for p in views['posts']:
            rp = p['pv']
            op = offset['posts'].get(p['slug'], 0)
            offset['posts'][p['slug']] = int(rp * (mul - 1) + op * mul)
    except ValueError:
        pass
elif target:
    try:
        val = int(value_str)
    except ValueError:
        val = 0
    if mode == 'add':
        add_off(target, val)
    else:
        real_val = get_real(target)
        new_off = val - real_val
        set_off(target, new_off)

with open(offset_fpath, 'w', encoding='utf-8') as f:
    json.dump(offset, f, ensure_ascii=False, indent=2)
