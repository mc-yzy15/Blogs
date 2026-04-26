#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SEO Optimization Script for Hexo Blog
- Analyzes and optimizes article meta tags
- Generates sitemap and robots.txt
- Submits URLs to search engines
- Generates SEO reports
"""

import os
import re
import json
import yaml
import hashlib
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime
from typing import Optional
from collections import defaultdict


SITE_URL = os.environ.get('SITE_URL', 'https://blogs.yzy15.dpdns.org')
SOURCE_DIR = Path('source/_posts')
PUBLIC_DIR = Path('public')
SITEMAP_PATH = PUBLIC_DIR / 'sitemap.xml'
ROBOTS_PATH = Path('source/robots.txt')

INDEXNOW_KEY = os.environ.get('INDEXNOW_KEY', '')
BING_API_KEY = os.environ.get('BING_API_KEY', '')
BAIDU_TOKEN = os.environ.get('BAIDU_TOKEN', '')
GOOGLE_SERVICE_ACCOUNT = os.environ.get('GOOGLE_SERVICE_ACCOUNT', '')


def extract_front_matter(content: str) -> tuple[dict, str]:
    """Extract YAML front matter from markdown content."""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)
    if not match:
        return {}, content
    
    try:
        front_matter = yaml.safe_load(match.group(1))
        body = match.group(2)
        return front_matter or {}, body
    except yaml.YAMLError:
        return {}, content


def calculate_reading_time(content: str) -> int:
    """Calculate estimated reading time in minutes."""
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', content))
    english_words = len(re.findall(r'[a-zA-Z]+', content))
    total_words = chinese_chars + english_words // 2
    return max(1, total_words // 400)


def extract_keywords_from_content(content: str, title: str = '') -> list[str]:
    """Extract potential keywords from content."""
    keywords = set()
    
    chinese_pattern = r'[\u4e00-\u9fff]{2,8}'
    chinese_words = re.findall(chinese_pattern, content)
    
    word_freq = defaultdict(int)
    for word in chinese_words:
        if len(word) >= 2 and word not in ['我们', '可以', '这个', '那个', '但是', '因为', '所以', '如果', '还是', '什么', '怎么', '如何', '一个', '一些', '这些', '那些', '这样', '那样', '这里', '那里', '现在', '然后', '或者', '而且', '以及', '不是', '没有', '已经', '可能', '应该', '需要', '进行', '通过', '使用', '包括', '关于', '对于', '之间', '之后', '之前', '之后', '之中']:
            word_freq[word] += 1
    
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    keywords = [word for word, freq in sorted_words[:10]]
    
    if title:
        title_words = re.findall(r'[\u4e00-\u9fff]{2,8}', title)
        for word in title_words:
            if word not in keywords:
                keywords.insert(0, word)
    
    return keywords[:8]


def generate_description(content: str, title: str = '') -> str:
    """Generate a description from content."""
    content = re.sub(r'^#+\s+.*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'```[\s\S]*?```', '', content)
    content = re.sub(r'`[^`]+`', '', content)
    content = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content)
    content = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', content)
    content = re.sub(r'<[^>]+>', '', content)
    content = re.sub(r'\s+', ' ', content).strip()
    
    if len(content) > 160:
        content = content[:157] + '...'
    
    return content


def analyze_seo(front_matter: dict, body: str, filepath: Path) -> dict:
    """Analyze SEO quality of an article."""
    issues = []
    score = 100
    
    title = front_matter.get('title', '')
    description = front_matter.get('description', '')
    keywords = front_matter.get('keywords', [])
    tags = front_matter.get('tags', [])
    
    if not title:
        issues.append('Missing title')
        score -= 20
    elif len(title) > 60:
        issues.append(f'Title too long ({len(title)} chars, recommended < 60)')
        score -= 5
    
    if not description:
        issues.append('Missing description')
        score -= 15
    elif len(description) > 160:
        issues.append(f'Description too long ({len(description)} chars, recommended < 160)')
        score -= 5
    elif len(description) < 50:
        issues.append(f'Description too short ({len(description)} chars, recommended > 50)')
        score -= 5
    
    if not keywords and not tags:
        issues.append('Missing keywords/tags')
        score -= 10
    
    if not tags:
        issues.append('Missing tags')
        score -= 5
    
    categories = front_matter.get('categories', [])
    if not categories:
        issues.append('Missing categories')
        score -= 5
    
    word_count = len(body)
    if word_count < 300:
        issues.append(f'Content too short ({word_count} chars)')
        score -= 10
    
    heading_count = len(re.findall(r'^#{1,6}\s+', body, re.MULTILINE))
    if heading_count == 0:
        issues.append('No headings found')
        score -= 10
    
    image_count = len(re.findall(r'!\[([^\]]*)\]\([^)]+\)', body))
    images_without_alt = len(re.findall(r'!\[\s*\]\([^)]+\)', body))
    if images_without_alt > 0:
        issues.append(f'{images_without_alt} images missing alt text')
        score -= 3 * images_without_alt
    
    internal_links = len(re.findall(r'\[([^\]]+)\]\(/[^)]+\)', body))
    external_links = len(re.findall(r'\[([^\]]+)\]\(https?://[^)]+\)', body))
    
    return {
        'filepath': str(filepath),
        'title': title,
        'score': max(0, score),
        'issues': issues,
        'stats': {
            'word_count': word_count,
            'heading_count': heading_count,
            'image_count': image_count,
            'internal_links': internal_links,
            'external_links': external_links,
            'reading_time': calculate_reading_time(body)
        }
    }


def optimize_article(filepath: Path) -> tuple[bool, list[str]]:
    """Optimize an article's SEO elements."""
    changes = []
    
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception as e:
        return False, [f'Error reading file: {e}']
    
    front_matter, body = extract_front_matter(content)
    if not front_matter:
        return False, ['No front matter found']
    
    modified = False
    
    if not front_matter.get('description'):
        generated_desc = generate_description(body, front_matter.get('title', ''))
        front_matter['description'] = generated_desc
        changes.append(f'Added description: {generated_desc[:50]}...')
        modified = True
    
    if not front_matter.get('keywords') and not front_matter.get('tags'):
        generated_keywords = extract_keywords_from_content(body, front_matter.get('title', ''))
        if generated_keywords:
            front_matter['keywords'] = generated_keywords
            changes.append(f'Added keywords: {", ".join(generated_keywords[:5])}')
            modified = True
    
    if modified:
        new_content = '---\n' + yaml.dump(front_matter, allow_unicode=True, sort_keys=False) + '---\n' + body
        filepath.write_text(new_content, encoding='utf-8')
    
    return modified, changes


def generate_sitemap(posts_dir: Path, output_path: Path, site_url: str) -> int:
    """Generate sitemap.xml from posts."""
    urls = []
    
    for md_file in posts_dir.rglob('*.md'):
        if md_file.parent.name in ['WordPress']:
            continue
        
        rel_path = md_file.relative_to(posts_dir)
        parts = list(rel_path.parts)
        
        if len(parts) > 1:
            lang_code = parts[0]
            slug = parts[-1].replace('.md', '')
            url = f"{site_url}/{lang_code}/{slug}/"
        else:
            slug = parts[-1].replace('.md', '')
            url = f"{site_url}/{slug}/"
        
        mtime = datetime.fromtimestamp(md_file.stat().st_mtime)
        
        content = md_file.read_text(encoding='utf-8')
        front_matter, _ = extract_front_matter(content)
        
        priority = '0.8'
        if front_matter.get('sticky'):
            priority = '1.0'
        elif front_matter.get('top'):
            priority = '0.9'
        
        urls.append({
            'url': url,
            'lastmod': mtime.strftime('%Y-%m-%d'),
            'priority': priority
        })
    
    static_pages = [
        {'url': f'{site_url}/', 'lastmod': datetime.now().strftime('%Y-%m-%d'), 'priority': '1.0'},
        {'url': f'{site_url}/archives/', 'lastmod': datetime.now().strftime('%Y-%m-%d'), 'priority': '0.6'},
        {'url': f'{site_url}/tags/', 'lastmod': datetime.now().strftime('%Y-%m-%d'), 'priority': '0.5'},
        {'url': f'{site_url}/categories/', 'lastmod': datetime.now().strftime('%Y-%m-%d'), 'priority': '0.5'},
        {'url': f'{site_url}/about/', 'lastmod': datetime.now().strftime('%Y-%m-%d'), 'priority': '0.4'},
        {'url': f'{site_url}/link/', 'lastmod': datetime.now().strftime('%Y-%m-%d'), 'priority': '0.4'},
        {'url': f'{site_url}/stats/', 'lastmod': datetime.now().strftime('%Y-%m-%d'), 'priority': '0.3'},
    ]
    urls.extend(static_pages)
    
    sitemap = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
'''
    
    for entry in urls:
        sitemap += f'''  <url>
    <loc>{entry['url']}</loc>
    <lastmod>{entry['lastmod']}</lastmod>
    <priority>{entry['priority']}</priority>
  </url>
'''
    
    sitemap += '</urlset>'
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(sitemap, encoding='utf-8')
    
    return len(urls)


def generate_robots_txt(output_path: Path, site_url: str) -> None:
    """Generate robots.txt file."""
    robots_content = f'''User-agent: *
Allow: /

Sitemap: {site_url}/sitemap.xml

Crawl-delay: 1

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: *
Disallow: /js/
Disallow: /css/
'''
    
    output_path.write_text(robots_content, encoding='utf-8')


def submit_to_indexnow(urls: list[str], key: str) -> tuple[bool, str]:
    """Submit URLs to search engines via IndexNow protocol."""
    if not key:
        return False, 'INDEXNOW_KEY not configured'
    
    key_file = Path('source') / f'{key}.txt'
    key_file.write_text(key, encoding='utf-8')
    
    endpoint = 'https://www.bing.com/indexnow'
    
    data = {
        'host': urllib.parse.urlparse(urls[0]).netloc,
        'key': key,
        'urlList': urls[:10000]
    }
    
    try:
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            if response.status == 200:
                return True, f'Successfully submitted {len(urls)} URLs via IndexNow'
            else:
                return False, f'IndexNow returned status {response.status}'
    except urllib.error.URLError as e:
        return False, f'IndexNow submission failed: {e}'
    except Exception as e:
        return False, f'IndexNow error: {e}'


def submit_to_bing(urls: list[str], api_key: str, site_url: str) -> tuple[bool, str]:
    """Submit URLs to Bing Webmaster API."""
    if not api_key:
        return False, 'BING_API_KEY not configured'
    
    endpoint = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch'
    
    params = {
        'apikey': api_key,
        'siteUrl': site_url
    }
    
    try:
        url = f"{endpoint}?{urllib.parse.urlencode(params)}"
        data = {'siteUrl': site_url, 'urlList': urls[:500]}
        
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            if response.status == 200:
                return True, f'Successfully submitted {len(urls)} URLs to Bing'
            else:
                return False, f'Bing API returned status {response.status}'
    except Exception as e:
        return False, f'Bing submission error: {e}'


def submit_to_baidu(urls: list[str], token: str, site_url: str) -> tuple[bool, str]:
    """Submit URLs to Baidu search engine."""
    if not token:
        return False, 'BAIDU_TOKEN not configured'
    
    domain = urllib.parse.urlparse(site_url).netloc
    endpoint = f'http://data.zz.baidu.com/urls?site={site_url}&token={token}'
    
    try:
        req = urllib.request.Request(
            endpoint,
            data='\n'.join(urls).encode('utf-8'),
            headers={'Content-Type': 'text/plain'}
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            if 'success' in result:
                return True, f'Baidu accepted {result["success"]} URLs'
            elif 'error' in result:
                return False, f'Baidu error: {result.get("message", result["error"])}'
            return True, f'Baidu response: {result}'
    except Exception as e:
        return False, f'Baidu submission error: {e}'


def generate_seo_report(results: list[dict], output_path: Path) -> None:
    """Generate SEO analysis report."""
    total_score = sum(r['score'] for r in results)
    avg_score = total_score / len(results) if results else 0
    
    issues_count = defaultdict(int)
    for r in results:
        for issue in r['issues']:
            issues_count[issue] += 1
    
    report = f'''# SEO Analysis Report

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary

- **Total Articles**: {len(results)}
- **Average SEO Score**: {avg_score:.1f}/100
- **High Score (>80)**: {len([r for r in results if r['score'] > 80])}
- **Medium Score (50-80)**: {len([r for r in results if 50 <= r['score'] <= 80])}
- **Low Score (<50)**: {len([r for r in results if r['score'] < 50])}

## Common Issues

| Issue | Count |
|-------|-------|
'''
    
    for issue, count in sorted(issues_count.items(), key=lambda x: x[1], reverse=True):
        report += f'| {issue} | {count} |\n'
    
    report += '''
## Detailed Results

| Article | Score | Issues |
|---------|-------|--------|
'''
    
    for r in sorted(results, key=lambda x: x['score']):
        issues_str = '; '.join(r['issues'][:3])
        if len(r['issues']) > 3:
            issues_str += f' (+{len(r["issues"])-3} more)'
        report += f'| [{r["title"][:40]}]({r["filepath"]}) | {r["score"]} | {issues_str or "None"} |\n'
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding='utf-8')


def main():
    """Main entry point."""
    print('🔍 Starting SEO optimization...')
    
    os.makedirs('source', exist_ok=True)
    
    print('\n📊 Analyzing articles...')
    results = []
    optimized_count = 0
    
    for md_file in SOURCE_DIR.rglob('*.md'):
        if md_file.parent.name in ['WordPress']:
            continue
        
        try:
            content = md_file.read_text(encoding='utf-8')
            front_matter, body = extract_front_matter(content)
            
            if not front_matter:
                continue
            
            result = analyze_seo(front_matter, body, md_file)
            results.append(result)
            
            if result['score'] < 80:
                modified, changes = optimize_article(md_file)
                if modified:
                    optimized_count += 1
                    print(f'  ✨ Optimized: {md_file.name}')
                    for change in changes:
                        print(f'     - {change}')
        except Exception as e:
            print(f'  ⚠️ Error processing {md_file}: {e}')
    
    print(f'\n📈 Analyzed {len(results)} articles')
    print(f'✨ Optimized {optimized_count} articles')
    
    print('\n🗺️ Generating sitemap...')
    url_count = generate_sitemap(SOURCE_DIR, SITEMAP_PATH, SITE_URL)
    print(f'  Generated sitemap with {url_count} URLs')
    
    print('\n🤖 Generating robots.txt...')
    generate_robots_txt(ROBOTS_PATH, SITE_URL)
    print('  Generated robots.txt')
    
    print('\n📝 Generating SEO report...')
    generate_seo_report(results, Path('seo-report.md'))
    print('  Generated seo-report.md')
    
    if INDEXNOW_KEY or BING_API_KEY or BAIDU_TOKEN:
        print('\n🚀 Submitting to search engines...')
        
        urls = []
        for md_file in SOURCE_DIR.rglob('*.md'):
            if md_file.parent.name in ['WordPress']:
                continue
            
            rel_path = md_file.relative_to(SOURCE_DIR)
            parts = list(rel_path.parts)
            
            if len(parts) > 1:
                lang_code = parts[0]
                slug = parts[-1].replace('.md', '')
                urls.append(f"{SITE_URL}/{lang_code}/{slug}/")
            else:
                slug = parts[-1].replace('.md', '')
                urls.append(f"{SITE_URL}/{slug}/")
        
        urls.extend([
            f'{SITE_URL}/',
            f'{SITE_URL}/archives/',
            f'{SITE_URL}/tags/',
            f'{SITE_URL}/categories/',
            f'{SITE_URL}/about/',
        ])
        
        if INDEXNOW_KEY:
            success, msg = submit_to_indexnow(urls, INDEXNOW_KEY)
            print(f'  IndexNow: {"✅" if success else "❌"} {msg}')
        
        if BING_API_KEY:
            success, msg = submit_to_bing(urls, BING_API_KEY, SITE_URL)
            print(f'  Bing: {"✅" if success else "❌"} {msg}')
        
        if BAIDU_TOKEN:
            success, msg = submit_to_baidu(urls, BAIDU_TOKEN, SITE_URL)
            print(f'  Baidu: {"✅" if success else "❌"} {msg}')
    
    avg_score = sum(r['score'] for r in results) / len(results) if results else 0
    print(f'\n✅ SEO optimization complete! Average score: {avg_score:.1f}/100')
    
    return 0


if __name__ == '__main__':
    exit(main())
