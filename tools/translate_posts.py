import os
import sys
import re
import time
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

POSTS_DIR = Path("source/_posts")
DEFAULT_LANG = os.environ.get("DEFAULT_LANG", "zh-CN")
PIVOT_LANG = "en"
MAX_WORKERS = int(os.environ.get("MAX_WORKERS", "5"))
SIMILARITY_THRESHOLD = float(os.environ.get("SIMILARITY_THRESHOLD", "0.4"))

POPULAR_LANGS = "en,zh-TW,ja,ko,fr,de,es,ru,pt,ar,hi,it,th,vi,id,tr,uk,pl,nl,sv,da,fi,el,cs,ro,hu,sk,bg,hr,sl,sr,no,he,ms,fa,bn,ta,te,ur"
TARGET_LANGS = [l.strip() for l in os.environ.get("TARGET_LANGS", POPULAR_LANGS).split(",") if l.strip()]

ALL_GOOGLE_LANGS = {
    "af": "af", "sq": "sq", "am": "am", "ar": "ar", "hy": "hy", "as": "as",
    "ay": "ay", "az": "az", "bm": "bm", "eu": "eu", "be": "be", "bn": "bn",
    "bho": "bho", "bs": "bs", "bg": "bg", "ca": "ca", "ceb": "ceb", "ny": "ny",
    "zh-CN": "zh-CN", "zh-TW": "zh-TW", "co": "co", "hr": "hr", "cs": "cs",
    "da": "da", "dv": "dv", "doi": "doi", "nl": "nl", "en": "en", "eo": "eo",
    "et": "et", "ee": "ee", "tl": "tl", "fi": "fi", "fr": "fr", "fy": "fy",
    "gl": "gl", "ka": "ka", "de": "de", "el": "el", "gn": "gn", "gu": "gu",
    "ht": "ht", "ha": "ha", "haw": "haw", "iw": "iw", "hi": "hi", "hmn": "hmn",
    "hu": "hu", "is": "is", "ig": "ig", "ilo": "ilo", "id": "id", "ga": "ga",
    "it": "it", "ja": "ja", "jw": "jw", "kn": "kn", "kk": "kk", "km": "km",
    "rw": "rw", "gom": "gom", "ko": "ko", "kri": "kri", "ku": "ku", "ckb": "ckb",
    "ky": "ky", "lo": "lo", "la": "la", "lv": "lv", "ln": "ln", "lt": "lt",
    "lg": "lg", "lb": "lb", "mk": "mk", "mai": "mai", "mg": "mg", "ms": "ms",
    "ml": "ml", "mt": "mt", "mi": "mi", "mr": "mr", "mni-Mtei": "mni-Mtei",
    "lus": "lus", "mn": "mn", "my": "my", "ne": "ne", "no": "no", "or": "or",
    "om": "om", "ps": "ps", "fa": "fa", "pl": "pl", "pt": "pt", "pa": "pa",
    "qu": "qu", "ro": "ro", "ru": "ru", "sm": "sm", "sa": "sa", "gd": "gd",
    "nso": "nso", "sr": "sr", "st": "st", "sn": "sn", "sd": "sd", "si": "si",
    "sk": "sk", "sl": "sl", "so": "so", "es": "es", "su": "su", "sw": "sw",
    "sv": "sv", "tg": "tg", "ta": "ta", "tt": "tt", "te": "te", "th": "th",
    "ti": "ti", "ts": "ts", "tr": "tr", "tk": "tk", "ak": "ak", "uk": "uk",
    "ur": "ur", "ug": "ug", "uz": "uz", "vi": "vi", "cy": "cy", "xh": "xh",
    "yi": "yi", "yo": "yo", "zu": "zu",
}

CJK_LANGS = {"ja", "ko", "zh-TW"}

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
        all_lang_codes = set(ALL_GOOGLE_LANGS.keys())
        return [f for f in files if f.startswith("source/_posts/") and f.endswith(".md")
                and not (Path(f).relative_to(POSTS_DIR).parts[0] in all_lang_codes
                         if len(Path(f).relative_to(POSTS_DIR).parts) > 1 else False)]
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
    src = ALL_GOOGLE_LANGS.get(source_lang, source_lang)
    tgt = ALL_GOOGLE_LANGS.get(target_lang, target_lang)
    max_chars = 4500
    if len(text) <= max_chars:
        try:
            return GoogleTranslator(source=src, target=tgt).translate(text)
        except Exception as e:
            print(f"    Google Translate error ({src}->{tgt}): {e}")
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
            time.sleep(0.2)
        except Exception as e:
            print(f"    Google Translate error on chunk {i+1}/{len(chunks)} ({src}->{tgt}): {e}")
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


def compute_similarity(text_a, text_b):
    set_a = set(text_a.lower().split())
    set_b = set(text_b.lower().split())
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def translate_body_pivot(body, target_lang, en_body=None):
    protected, placeholders = protect_code_blocks(body)
    if target_lang == PIVOT_LANG:
        translated = google_translate(protected, DEFAULT_LANG, PIVOT_LANG)
        if translated is None:
            return None
        return restore_code_blocks(translated, placeholders)
    if target_lang in CJK_LANGS:
        direct = google_translate(protected, DEFAULT_LANG, target_lang)
        if direct is None and en_body:
            en_protected, en_placeholders = protect_code_blocks(en_body)
            pivot = google_translate(en_protected, PIVOT_LANG, target_lang)
            if pivot is None:
                return None
            return restore_code_blocks(pivot, en_placeholders)
        if direct is None:
            return None
        if en_body:
            en_protected, en_ph = protect_code_blocks(en_body)
            pivot = google_translate(en_protected, PIVOT_LANG, target_lang)
            if pivot is not None:
                direct_back = google_translate(direct, target_lang, DEFAULT_LANG)
                pivot_back = google_translate(pivot, target_lang, DEFAULT_LANG)
                if direct_back and pivot_back:
                    direct_sim = compute_similarity(direct_back, body)
                    pivot_sim = compute_similarity(pivot_back, body)
                    print(f"    Quality: direct={direct_sim:.2f} pivot={pivot_sim:.2f}")
                    if pivot_sim > direct_sim + 0.1:
                        return restore_code_blocks(pivot, en_ph)
        return restore_code_blocks(direct, placeholders)
    if en_body:
        en_protected, en_placeholders = protect_code_blocks(en_body)
        pivot = google_translate(en_protected, PIVOT_LANG, target_lang)
        if pivot is None:
            direct = google_translate(protected, DEFAULT_LANG, target_lang)
            if direct is None:
                return None
            return restore_code_blocks(direct, placeholders)
        return restore_code_blocks(pivot, en_placeholders)
    translated = google_translate(protected, DEFAULT_LANG, target_lang)
    if translated is None:
        return None
    return restore_code_blocks(translated, placeholders)


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
        if len(parts) > 1 and parts[0] in ALL_GOOGLE_LANGS:
            return True
    except ValueError:
        pass
    return False


def translate_lang(filepath, lang, fm, body, en_body):
    out_path = get_output_path(filepath, lang)
    if out_path.exists():
        return lang, None, f"  Skipping {lang}: already exists"
    translated_body = translate_body_pivot(body, lang, en_body)
    if translated_body is None:
        return lang, None, f"  Failed {lang}"
    new_fm = dict(fm)
    new_fm["lang"] = lang
    if "title" in new_fm and isinstance(new_fm["title"], str):
        src = PIVOT_LANG if en_body else DEFAULT_LANG
        t = google_translate(new_fm["title"], src, lang)
        if t:
            new_fm["title"] = t.strip().strip('"')
    if "description" in new_fm and isinstance(new_fm["description"], str):
        src = PIVOT_LANG if en_body else DEFAULT_LANG
        t = google_translate(new_fm["description"], src, lang)
        if t:
            new_fm["description"] = t.strip().strip('"')
    out_path.parent.mkdir(parents=True, exist_ok=True)
    output = build_front_matter(new_fm) + "\n\n" + translated_body + "\n"
    out_path.write_text(output, encoding="utf-8")
    return lang, out_path, f"  Saved {lang}"


def process_file(filepath):
    if is_translation_file(filepath):
        print(f"\nSkipping: {filepath} is already a translation file")
        return
    print(f"\nProcessing: {filepath}")
    content = Path(filepath).read_text(encoding="utf-8")
    fm, body = parse_front_matter(content)
    if fm.get("lang") and fm["lang"] in ALL_GOOGLE_LANGS:
        print(f"  Skipping: already a translation (lang={fm['lang']})")
        return
    if not body.strip():
        print(f"  Skipping: empty body")
        return
    langs = TARGET_LANGS if TARGET_LANGS else [k for k in ALL_GOOGLE_LANGS if k != DEFAULT_LANG]
    en_body = None
    en_out = get_output_path(filepath, PIVOT_LANG)
    if PIVOT_LANG in langs and not en_out.exists():
        print(f"  Step 1: Translating to {PIVOT_LANG} (pivot)...")
        en_translated = translate_body_pivot(body, PIVOT_LANG)
        if en_translated:
            en_body = en_translated
            new_fm = dict(fm)
            new_fm["lang"] = PIVOT_LANG
            if "title" in new_fm and isinstance(new_fm["title"], str):
                t = google_translate(new_fm["title"], DEFAULT_LANG, PIVOT_LANG)
                if t:
                    new_fm["title"] = t.strip().strip('"')
            if "description" in new_fm and isinstance(new_fm["description"], str):
                t = google_translate(new_fm["description"], DEFAULT_LANG, PIVOT_LANG)
                if t:
                    new_fm["description"] = t.strip().strip('"')
            en_out.parent.mkdir(parents=True, exist_ok=True)
            output = build_front_matter(new_fm) + "\n\n" + en_translated + "\n"
            en_out.write_text(output, encoding="utf-8")
            print(f"  Saved pivot: {en_out}")
        else:
            print(f"  Failed to translate pivot ({PIVOT_LANG}), continuing without pivot...")
    elif en_out.exists():
        en_content = en_out.read_text(encoding="utf-8")
        _, en_body = parse_front_matter(en_content)
        print(f"  Pivot ({PIVOT_LANG}) already exists, using it as source")
    other_langs = [l for l in langs if l and l != PIVOT_LANG]
    existing = [l for l in other_langs if get_output_path(filepath, l).exists()]
    to_translate = [l for l in other_langs if l not in existing]
    for l in existing:
        print(f"  Skipping {l}: already exists")
    if not to_translate:
        print(f"  All translations already exist.")
        return
    print(f"  Translating {len(to_translate)} languages with {MAX_WORKERS} workers...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(translate_lang, filepath, lang, fm, body, en_body): lang
            for lang in to_translate
        }
        for future in as_completed(futures):
            lang = futures[future]
            try:
                _, path, msg = future.result()
                print(msg)
            except Exception as e:
                print(f"  Error translating {lang}: {e}")


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
    print(f"Target languages ({len(TARGET_LANGS)}): {', '.join(TARGET_LANGS)}")
    print(f"Concurrency: {MAX_WORKERS} workers")
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
