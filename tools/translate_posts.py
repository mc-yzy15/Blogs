import os
import sys
import re
import time
import subprocess
from pathlib import Path

POSTS_DIR = Path("source/_posts")
DEFAULT_LANG = os.environ.get("DEFAULT_LANG", "zh-CN")
TARGET_LANGS = [l.strip() for l in os.environ.get("TARGET_LANGS", "en,zh-TW,ja").split(",") if l.strip()]

GOOGLE_LANG_MAP = {
    "en": "en",
    "zh-TW": "zh-TW",
    "ja": "ja",
    "ko": "ko",
    "fr": "fr",
    "de": "de",
    "es": "es",
    "ru": "ru",
    "zh-CN": "zh-CN",
}

CODE_BLOCK_RE = re.compile(r'(```[\s\S]*?```|`[^`\n]+`)', re.DOTALL)
PLACEHOLDER_TMPL = "__CODE_BLOCK_{}__"


def get_changed_files():
    try:
        before = os.environ.get("BEFORE_SHA", "")
        after = os.environ.get("AFTER_SHA", "HEAD")
        if before and before != "0000000000000000000000000000000000000000":
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


def protect_code_blocks(text):
    placeholders = {}
    counter = [0]

    def replacer(m):
        key = PLACEHOLDER_TMPL.format(counter[0])
        placeholders[key] = m.group(0)
        counter[0] += 1
        return key

    protected = CODE_BLOCK_RE.sub(replacer, text)
    return protected, placeholders


def restore_code_blocks(text, placeholders):
    for key, val in placeholders.items():
        text = text.replace(key, val)
    return text


def google_translate(text, source_lang, target_lang):
    from deep_translator import GoogleTranslator
    src = GOOGLE_LANG_MAP.get(source_lang, "auto")
    tgt = GOOGLE_LANG_MAP.get(target_lang, target_lang)
    max_chars = 4500
    if len(text) <= max_chars:
        try:
            return GoogleTranslator(source=src, target=tgt).translate(text)
        except Exception as e:
            print(f"    Google Translate error: {e}")
            return None
    chunks = split_into_chunks(text, max_chars)
    translated_parts = []
    for i, chunk in enumerate(chunks):
        try:
            result = GoogleTranslator(source=src, target=tgt).translate(chunk)
            if result:
                translated_parts.append(result)
            else:
                translated_parts.append(chunk)
            time.sleep(0.5)
        except Exception as e:
            print(f"    Google Translate error on chunk {i+1}/{len(chunks)}: {e}")
            translated_parts.append(chunk)
    return "".join(translated_parts)


def split_into_chunks(text, max_chars):
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 > max_chars:
            if current_chunk:
                chunks.append(current_chunk)
            if len(para) > max_chars:
                lines = para.split("\n")
                current_chunk = ""
                for line in lines:
                    if len(current_chunk) + len(line) + 1 > max_chars:
                        if current_chunk:
                            chunks.append(current_chunk)
                        current_chunk = line + "\n"
                    else:
                        current_chunk += line + "\n"
            else:
                current_chunk = para + "\n\n"
        else:
            current_chunk += para + "\n\n"
    if current_chunk.strip():
        chunks.append(current_chunk)
    return chunks


def translate_body(body, target_lang):
    protected, placeholders = protect_code_blocks(body)
    translated = google_translate(protected, DEFAULT_LANG, target_lang)
    if translated is None:
        return None
    translated = restore_code_blocks(translated, placeholders)
    return translated


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
        print(f"  Translating to {lang} via Google Translate...")
        translated_body = translate_body(body, lang)
        if translated_body is None:
            print(f"  Failed to translate to {lang}, skipping")
            continue
        new_fm = dict(fm)
        new_fm["lang"] = lang
        if "title" in new_fm and isinstance(new_fm["title"], str):
            print(f"  Translating title to {lang}...")
            translated_title = google_translate(new_fm["title"], DEFAULT_LANG, lang)
            if translated_title:
                new_fm["title"] = translated_title.strip().strip('"')
        if "description" in new_fm and isinstance(new_fm["description"], str):
            print(f"  Translating description to {lang}...")
            translated_desc = google_translate(new_fm["description"], DEFAULT_LANG, lang)
            if translated_desc:
                new_fm["description"] = translated_desc.strip().strip('"')
        out_path.parent.mkdir(parents=True, exist_ok=True)
        output = build_front_matter(new_fm) + "\n\n" + translated_body + "\n"
        out_path.write_text(output, encoding="utf-8")
        print(f"  Saved: {out_path}")


def main():
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
