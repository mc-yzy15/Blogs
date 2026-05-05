import os
import re
from pathlib import Path

POSTS_DIR = Path("source/_posts")
CONFIG_PATH = Path("_config.yml")

POPULAR_LANGS = [
    "zh-CN", "en", "zh-TW", "ja", "ko", "fr", "de", "es", "ru", "pt",
    "ar", "hi", "it", "th", "vi", "id", "tr", "uk", "pl", "nl",
    "sv", "da", "fi", "el", "cs", "ro", "hu", "sk", "bg", "hr",
    "sl", "sr", "no", "he", "ms", "fa", "bn", "ta", "te", "ur",
]

ALL_GOOGLE_LANGS = {
    "af", "sq", "am", "ar", "hy", "as", "ay", "az", "bm", "eu", "be", "bn",
    "bho", "bs", "bg", "ca", "ceb", "ny", "zh-CN", "zh-TW", "co", "hr", "cs",
    "da", "dv", "doi", "nl", "en", "eo", "et", "ee", "tl", "fi", "fr", "fy",
    "gl", "ka", "de", "el", "gn", "gu", "ht", "ha", "haw", "iw", "hi", "hmn",
    "hu", "is", "ig", "ilo", "id", "ga", "it", "ja", "jw", "kn", "kk", "km",
    "rw", "gom", "ko", "kri", "ku", "ckb", "ky", "lo", "la", "lv", "ln", "lt",
    "lg", "lb", "mk", "mai", "mg", "ms", "ml", "mt", "mi", "mr", "mni-Mtei",
    "lus", "mn", "my", "ne", "no", "or", "om", "ps", "fa", "pl", "pt", "pa",
    "qu", "ro", "ru", "sm", "sa", "gd", "nso", "sr", "st", "sn", "sd", "si",
    "sk", "sl", "so", "es", "su", "sw", "sv", "tg", "ta", "tt", "te", "th",
    "ti", "ts", "tr", "tk", "ak", "uk", "ur", "ug", "uz", "vi", "cy", "xh",
    "yi", "yo", "zu",
}


def detect_lang_dirs():
    if not POSTS_DIR.exists():
        return []
    langs = []
    for item in POSTS_DIR.iterdir():
        if item.is_dir() and item.name in ALL_GOOGLE_LANGS:
            md_files = list(item.rglob("*.md"))
            if md_files:
                langs.append(item.name)
    return sorted(langs, key=lambda x: POPULAR_LANGS.index(x) if x in POPULAR_LANGS else 999)


def update_config(langs):
    content = CONFIG_PATH.read_text(encoding="utf-8")
    all_langs = ["zh-CN"] + [l for l in langs if l != "zh-CN"]
    new_value = ", ".join(all_langs)
    content = re.sub(
        r'^language:\s*\[.*?\]',
        f'language: [{new_value}]',
        content,
        count=1,
        flags=re.MULTILINE
    )
    CONFIG_PATH.write_text(content, encoding="utf-8")
    return all_langs


def main():
    langs = detect_lang_dirs()
    if not langs:
        print("No translation directories found. Keeping default language config.")
        return
    all_langs = update_config(langs)
    print(f"Updated language config: {all_langs}")
    print(f"Total languages: {len(all_langs)}")


if __name__ == "__main__":
    main()
