import os
import sys
import json
import re
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

POSTS_DIR = Path("source/_posts")
DEFAULT_LANG = os.environ.get("DEFAULT_LANG", "zh-CN")
TARGET_LANGS = [l.strip() for l in os.environ.get("TARGET_LANGS", "en,zh-TW,ja").split(",") if l.strip()]
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
LANG_NAMES = {
    "en": "English",
    "zh-TW": "Traditional Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "ru": "Russian",
}


def get_changed_files():
    try:
        before = os.environ.get("BEFORE_SHA", "")
        after = os.environ.get("AFTER_SHA", "HEAD")
        if before:
            result = subprocess.run(
                ["git", "diff", "--name-only", "--diff-filter=AM", before, after],
                capture_output=True, text=True, check=True
            )
        else:
            result = subprocess.run(
                ["git", "diff", "--name-only", "--diff-filter=AM", "HEAD~1", "HEAD"],
                capture_output=True, text=True, check=True
            )
        files = result.stdout.strip().split("\n")
        lang_dirs = [f"source/_posts/{lang}/" for lang in TARGET_LANGS]
        return [f for f in files if f.startswith("source/_posts/") and f.endswith(".md") and not any(f.startswith(d) for d in lang_dirs)]
    except Exception as e:
        print(f"Warning: Could not get changed files from git: {e}")
        return []


def parse_front_matter(content):
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return {}, content
    fm_text = match.group(1)
    body = content[match.end():]
    fm = {}
    current_key = None
    current_list = []
    for line in fm_text.split("\n"):
        list_match = re.match(r'^  - (.+)$', line)
        if list_match and current_key:
            current_list.append(list_match.group(1).strip())
            continue
        kv_match = re.match(r'^(\w+):\s*(.*)$', line)
        if kv_match:
            if current_key and current_list:
                fm[current_key] = current_list
                current_list = []
            current_key = kv_match.group(1)
            val = kv_match.group(2).strip()
            if val:
                fm[current_key] = val
                current_key = None
                current_list = []
    if current_key and current_list:
        fm[current_key] = current_list
    return fm, body


def build_front_matter(fm):
    lines = ["---"]
    for key, val in fm.items():
        if isinstance(val, list):
            lines.append(f"{key}:")
            for item in val:
                lines.append(f"  - {item}")
        else:
            lines.append(f"{key}: {val}")
    lines.append("---")
    return "\n".join(lines)


def translate_text(text, target_lang):
    if not OPENAI_API_KEY:
        print(f"Error: OPENAI_API_KEY not set, skipping translation to {target_lang}")
        return None
    lang_name = LANG_NAMES.get(target_lang, target_lang)
    prompt = (
        f"You are a professional translator for a technical blog. "
        f"Translate the following Markdown content to {lang_name}. "
        f"Rules:\n"
        f"1. Keep ALL Markdown formatting exactly as-is (headings, links, images, code blocks, tables, etc.)\n"
        f"2. Keep ALL URLs, image paths, and link targets unchanged\n"
        f"3. Keep code blocks and inline code unchanged (do not translate code)\n"
        f"4. Keep HTML tags unchanged\n"
        f"5. Translate naturally and fluently, maintaining the original tone and style\n"
        f"6. Do NOT add any extra content, explanations, or notes\n"
        f"7. Output ONLY the translated Markdown, nothing else\n"
        f"8. For emoji, keep them as-is\n"
        f"9. For proper nouns (product names, company names, etc.), keep the original unless there is a well-known translation\n"
    )
    body = [{"role": "system", "content": prompt}, {"role": "user", "content": text}]
    payload = json.dumps({"model": OPENAI_MODEL, "messages": body, "temperature": 0.3}).encode("utf-8")
    url = OPENAI_BASE_URL.rstrip("/") + "/chat/completions"
    req = Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {OPENAI_API_KEY}")
    try:
        with urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"API Error {e.code}: {err_body[:500]}")
        return None
    except URLError as e:
        print(f"Network Error: {e}")
        return None
    except Exception as e:
        print(f"Unexpected Error: {e}")
        return None


def get_output_path(original_path, target_lang):
    p = Path(original_path)
    try:
        rel = p.relative_to(POSTS_DIR)
    except ValueError:
        rel = Path(p.name)
    return POSTS_DIR / target_lang / rel


def is_translation_file(filepath):
    p = Path(filepath)
    try:
        rel = p.relative_to(POSTS_DIR)
        parts = rel.parts
        if len(parts) > 1 and parts[0] in TARGET_LANGS:
            return True
    except ValueError:
        pass
    return False


def process_file(filepath):
    if is_translation_file(filepath):
        print(f"\nSkipping: {filepath} is already a translation file")
        return
    print(f"\nProcessing: {filepath}")
    content = Path(filepath).read_text(encoding="utf-8")
    fm, body = parse_front_matter(content)
    if fm.get("lang") and fm["lang"] in TARGET_LANGS:
        print(f"  Skipping: already a translation (lang={fm['lang']})")
        return
    if not body.strip():
        print(f"  Skipping: empty body")
        return
    for lang in TARGET_LANGS:
        if not lang:
            continue
        out_path = get_output_path(filepath, lang)
        if out_path.exists():
            print(f"  Skipping {lang}: translation already exists at {out_path}")
            continue
        print(f"  Translating to {lang}...")
        translated_body = translate_text(body, lang)
        if translated_body is None:
            print(f"  Failed to translate to {lang}, skipping")
            continue
        new_fm = dict(fm)
        new_fm["lang"] = lang
        if "title" in new_fm and isinstance(new_fm["title"], str):
            print(f"  Translating title to {lang}...")
            translated_title = translate_text(new_fm["title"], lang)
            if translated_title:
                new_fm["title"] = translated_title.strip().strip('"')
        if "description" in new_fm and isinstance(new_fm["description"], str):
            print(f"  Translating description to {lang}...")
            translated_desc = translate_text(new_fm["description"], lang)
            if translated_desc:
                new_fm["description"] = translated_desc.strip().strip('"')
        out_path.parent.mkdir(parents=True, exist_ok=True)
        output = build_front_matter(new_fm) + "\n\n" + translated_body + "\n"
        out_path.write_text(output, encoding="utf-8")
        print(f"  Saved: {out_path}")


def main():
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY environment variable is not set.")
        print("Please set it in your GitHub repository secrets.")
        sys.exit(1)
    files_to_process = []
    if len(sys.argv) > 1:
        files_to_process = [a for a in sys.argv[1:] if a.endswith(".md")]
    else:
        files_to_process = get_changed_files()
    if not files_to_process:
        print("No new or modified post files detected.")
        return
    print(f"Found {len(files_to_process)} post(s) to translate:")
    for f in files_to_process:
        print(f"  - {f}")
    for filepath in files_to_process:
        if not Path(filepath).exists():
            print(f"  File not found: {filepath}, skipping")
            continue
        process_file(filepath)
    print("\nTranslation complete!")


if __name__ == "__main__":
    main()
