#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sys
import time
from pathlib import Path
from openai import OpenAI

BLOG_URL = "https://blogs.yzy15.dpdns.org"
POSTS_DIR = Path("source/_posts")
LLMS_TXT_PATH = Path("source/llms.txt")
API_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://ai.yzy15.dpdns.org/v1")
API_KEY = os.environ.get("OPENAI_API_KEY", "")
MODEL = "gpt-4o"
MAX_RETRIES = 3

client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)


def call_gpt4o(prompt: str, system: str = "You are a helpful assistant.") -> str:
    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt
                print(f"  API error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise


def get_root_posts():
    posts = []
    for f in POSTS_DIR.iterdir():
        if not f.is_file():
            continue
        if f.suffix != ".md":
            continue
        if f.name.startswith("_"):
            continue
        posts.append(f)
    return sorted(posts)


def parse_content(content: str):
    match = re.match(r"^---\s*\r?\n(.*?)\r?\n---\s*\r?\n(.*)$", content, re.DOTALL)
    if not match:
        return None, None
    return match.group(1), match.group(2)


def get_fm_value(fm_text: str, key: str):
    pattern_inline = rf"^{re.escape(key)}:\s*(.+)$"
    m = re.search(pattern_inline, fm_text, re.MULTILINE)
    if m:
        val = m.group(1).strip()
        if val.startswith("[") and val.endswith("]"):
            return [v.strip().strip("'\"") for v in val[1:-1].split(",")]
        return val
    pattern_list = rf"^{re.escape(key)}:\s*\r?\n((?:\s+-\s+.+\r?\n?)+)"
    m = re.search(pattern_list, fm_text, re.MULTILINE)
    if m:
        items = re.findall(r"-\s+(.+)$", m.group(1), re.MULTILINE)
        return [item.strip() for item in items]
    return None


def has_fm_key(fm_text: str, key: str) -> bool:
    return bool(re.search(rf"^{re.escape(key)}:\s*", fm_text, re.MULTILINE))


def add_fm_field(content: str, key: str, value: str) -> str:
    match = re.match(r"^(---\s*\r?\n)(.*?)(\r?\n---\s*\r?\n)(.*)$", content, re.DOTALL)
    if not match:
        return content
    prefix = match.group(1)
    fm = match.group(2)
    sep = match.group(3)
    body = match.group(4)
    le = "\r\n" if "\r\n" in sep else "\n"
    return prefix + fm + le + key + ": " + value + sep + body


def update_llms_txt():
    print("=" * 50)
    print("Updating llms.txt...")
    print("=" * 50)

    posts = get_root_posts()
    if not posts:
        print("No posts found.")
        return

    post_data = []
    for post_path in posts:
        content = post_path.read_text(encoding="utf-8")
        fm_text, body = parse_content(content)
        if fm_text is None:
            continue
        title = get_fm_value(fm_text, "title") or post_path.stem
        description = get_fm_value(fm_text, "description") or ""
        categories = get_fm_value(fm_text, "categories")
        date = get_fm_value(fm_text, "date") or ""
        if isinstance(categories, str):
            categories = [categories]
        elif categories is None:
            categories = ["Uncategorized"]
        slug = post_path.stem
        url = f"{BLOG_URL}/{slug}/"
        post_data.append(
            {
                "title": title,
                "description": description,
                "categories": categories,
                "date": date,
                "url": url,
            }
        )

    post_list_str = ""
    for p in post_data:
        cats = ", ".join(p["categories"])
        post_list_str += f"- Title: {p['title']}\n"
        post_list_str += f"  URL: {p['url']}\n"
        post_list_str += f"  Description: {p['description']}\n"
        post_list_str += f"  Categories: {cats}\n"
        post_list_str += f"  Date: {p['date']}\n\n"

    prompt = (
        "You are generating an llms.txt file for a blog. Follow the llmstxt.org specification.\n"
        "\n"
        "Blog title: Yzy15's Blog\n"
        "Blog description: Yzy15\u7684\u4e2a\u4eba\u535a\u5ba2\uff0c\u4e13\u6ce8\u4e8e\u5206\u4eab\u6280\u672f\u6559\u7a0b\u3001\u7f16\u7a0b\u7ecf\u9a8c\u3001\u751f\u6d3b\u8bb0\u5f55\u548c\u5b66\u4e60\u5fc3\u5f97\u3002\n"
        f"Blog URL: {BLOG_URL}\n"
        "\n"
        "Here are the blog posts:\n"
        f"{post_list_str}"
        "\n"
        "Generate the llms.txt file content. Format:\n"
        "# [Blog Title]\n"
        "> [Blog description]\n"
        "\n"
        "## [Category Name]\n"
        "- [Post Title](URL): [Brief description]\n"
        "\n"
        f"Use full URLs like {BLOG_URL}/{{slug}}/\n"
        "Group posts by category. Write descriptions in the same language as each post."
    )

    result = call_gpt4o(
        prompt,
        system="You are a helpful assistant that generates llms.txt files following the llmstxt.org specification.",
    )
    LLMS_TXT_PATH.write_text(result + "\n", encoding="utf-8")
    print(f"Updated llms.txt with {len(post_data)} posts.")


def update_missing_descriptions():
    print("=" * 50)
    print("Updating missing descriptions...")
    print("=" * 50)

    posts = get_root_posts()
    updated = 0

    for post_path in posts:
        content = post_path.read_text(encoding="utf-8")
        fm_text, body = parse_content(content)
        if fm_text is None:
            continue
        if has_fm_key(fm_text, "description"):
            continue
        title = get_fm_value(fm_text, "title") or post_path.stem
        body_preview = body[:2000] if body else ""

        prompt = (
            "Generate a concise description for this blog post (max 160 characters). "
            "The description should be in the same language as the post content. "
            "Reply with ONLY the description text, nothing else.\n"
            "\n"
            f"Title: {title}\n"
            "\n"
            "Post content (first 2000 chars):\n"
            f"{body_preview}"
        )

        description = call_gpt4o(
            prompt,
            system="You are a helpful assistant that generates concise blog post descriptions.",
        )
        description = description.replace("\n", " ").replace("\r", "")
        if len(description) > 160:
            description = description[:157] + "..."

        new_content = add_fm_field(content, "description", description)
        post_path.write_text(new_content, encoding="utf-8")
        updated += 1
        print(f"  Added description to: {post_path.name}")

    print(f"Updated {updated} posts with missing descriptions.")


def detect_faq_posts():
    print("=" * 50)
    print("Detecting FAQ posts...")
    print("=" * 50)

    posts = get_root_posts()
    updated = 0

    for post_path in posts:
        content = post_path.read_text(encoding="utf-8")
        fm_text, body = parse_content(content)
        if fm_text is None:
            continue
        if has_fm_key(fm_text, "faq"):
            continue
        body_preview = body[:3000] if body else ""

        prompt = (
            "Analyze this blog post content and determine if it contains FAQ-style content (questions and answers). \n"
            'Reply with ONLY "yes" or "no".\n'
            "\n"
            "Post content:\n"
            f"{body_preview}"
        )

        result = call_gpt4o(
            prompt,
            system="You are a helpful assistant that analyzes blog post content.",
        )

        if result.lower().strip() == "yes":
            new_content = add_fm_field(content, "faq", "true")
            post_path.write_text(new_content, encoding="utf-8")
            updated += 1
            print(f"  Marked as FAQ: {post_path.name}")

    print(f"Detected {updated} FAQ posts.")


def main():
    try:
        if not API_KEY:
            print("Error: OPENAI_API_KEY environment variable is not set.")
            return 1

        changes = []

        try:
            update_llms_txt()
            changes.append("Updated llms.txt")
        except Exception as e:
            print(f"Error updating llms.txt: {e}")
            changes.append(f"Failed to update llms.txt: {e}")

        try:
            update_missing_descriptions()
            changes.append("Updated missing descriptions")
        except Exception as e:
            print(f"Error updating missing descriptions: {e}")
            changes.append(f"Failed to update missing descriptions: {e}")

        try:
            detect_faq_posts()
            changes.append("Detected FAQ posts")
        except Exception as e:
            print(f"Error detecting FAQ posts: {e}")
            changes.append(f"Failed to detect FAQ posts: {e}")

        print("\n" + "=" * 50)
        print("Summary of changes:")
        print("=" * 50)
        for change in changes:
            print(f"  - {change}")

        return 0
    except Exception as e:
        print(f"Fatal error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
