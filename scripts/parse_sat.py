#!/usr/bin/env python3
"""
Parse SAT HTML question files and output JSON for seeding.
Usage: python3 scripts/parse_sat.py > scripts/sat_questions.json
"""

import json
import os
import re
import sys
from pathlib import Path

SAT_DIR = Path(__file__).parent.parent / "app" / "resources" / "SAT"

HTML_ENTITIES = {
    "&rsquo;": "'", "&lsquo;": "'", "&ldquo;": "“", "&rdquo;": "”",
    "&mdash;": "—", "&ndash;": "–", "&amp;": "&", "&nbsp;": " ",
    "&lt;": "<", "&gt;": ">", "&copy;": "©", "&reg;": "®",
    "&deg;": "°", "&times;": "×", "&divide;": "÷",
    "&frac12;": "½", "&frac14;": "¼", "&frac34;": "¾",
    "&pi;": "π", "&ne;": "≠", "&le;": "≤", "&ge;": "≥",
    "&hellip;": "…",
}

def decode_html(text):
    for entity, char in HTML_ENTITIES.items():
        text = text.replace(entity, char)
    text = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), text)
    text = re.sub(r"&#x([0-9a-fA-F]+);", lambda m: chr(int(m.group(1), 16)), text)
    return text

def strip_tags(html):
    html = re.sub(r"<svg[^>]*>.*?</svg>", "", html, flags=re.DOTALL)
    html = re.sub(r"<figure[^>]*>.*?</figure>", "", html, flags=re.DOTALL)
    html = re.sub(r"<img[^>]*>", "", html)
    html = re.sub(r"<[^>]+>", " ", html)
    html = decode_html(html)
    html = re.sub(r"\s+", " ", html).strip()
    return html

def has_image(qbody):
    return bool(re.search(r"<svg|<img|<figure", qbody, re.IGNORECASE))

def parse_choices(qbody):
    """Return dict {A: text, B: text, C: text, D: text} and correct letter."""
    choices = {}
    correct = None

    # Find all choice divs — they contain <b>A.</b>, <b>B.</b>, etc.
    # Match the whole div including nested content
    choice_div_pattern = re.compile(
        r'(<div[^>]*>)\s*<b>\s*([ABCD])\.\s*</b>(.*?)(?=<div[^>]*>\s*<b>\s*[ABCD]\.|'
        r'<div[^>]*>.*?<b>Explanation</b>|<b>Explanation:</b>|\Z)',
        re.DOTALL | re.IGNORECASE,
    )

    for div_open, letter, content in choice_div_pattern.findall(qbody):
        text = strip_tags(content)
        choices[letter] = text.strip()
        # Green background = correct answer
        if "d4edda" in div_open.lower() or "28a745" in div_open.lower():
            correct = letter

    # Fallback: simpler pattern if above found nothing
    if not choices:
        simple = re.compile(r'<b>\s*([ABCD])\.\s*</b>(.*?)(?=<b>\s*[ABCD]\.|<b>Explanation|$)',
                            re.DOTALL | re.IGNORECASE)
        for letter, content in simple.findall(qbody):
            text = strip_tags(content)
            choices[letter] = text.strip()

    # Correct answer: look for green div containing the letter
    if not correct:
        green_match = re.search(
            r'<div[^>]*(?:d4edda|28a745)[^>]*>\s*<b>\s*([ABCD])\.',
            qbody, re.IGNORECASE
        )
        if green_match:
            correct = green_match.group(1)

    return choices, correct

def parse_question_block(qbody):
    """Extract passage, question stem, choices, correct answer, explanation."""
    # Remove SVG/images but track presence
    img_present = has_image(qbody)

    # Split into parts: before choices, choices section, explanation
    # Explanation starts with <b>Explanation:</b>
    expl_split = re.split(r'<b>Explanation:</b>', qbody, maxsplit=1, flags=re.IGNORECASE)
    pre_expl = expl_split[0]
    explanation = strip_tags(expl_split[1]) if len(expl_split) > 1 else ""
    explanation = re.sub(r'^Explanation:\s*', '', explanation)

    # Parse choices from the full block (includes color info)
    choices, correct = parse_choices(qbody)

    # Everything before the first choice div is passage + question stem
    # Find where choices start
    first_choice_pos = len(pre_expl)
    for letter in "ABCD":
        pat = re.search(rf'<b>\s*{letter}\.\s*</b>', pre_expl)
        if pat and pat.start() < first_choice_pos:
            first_choice_pos = pat.start()

    pre_choices = strip_tags(pre_expl[:first_choice_pos])

    # Separate passage from question: question usually ends with "?" or "blank"
    # Try to find the question stem (last sentence ending with ? or containing "blank")
    question = ""
    passage = ""

    # Question stem patterns
    q_patterns = [
        r'([^.!?]*\?)\s*$',                          # ends with ?
        r'(Which (?:choice|option|quotation|finding|conclusion)[^.]*\.)\s*$',
        r'(According to[^.]*\.)\s*$',
        r'(The (?:student|author|researcher)[^.]*\.)\s*$',
        r'([^.!]*blank[^.]*\.)\s*$',
    ]

    for pat in q_patterns:
        m = re.search(pat, pre_choices, re.IGNORECASE)
        if m:
            q_end = m.end()
            q_start = pre_choices.rfind('\n', 0, m.start())
            if q_start == -1:
                q_start = max(0, m.start() - 300)
            question = pre_choices[m.start():q_end].strip()
            passage = pre_choices[:m.start()].strip()
            break

    if not question:
        # Fallback: last 300 chars is question, rest is passage
        split_at = max(0, len(pre_choices) - 300)
        passage = pre_choices[:split_at].strip()
        question = pre_choices[split_at:].strip()

    return {
        "hasImage": img_present,
        "passage": passage or None,
        "question": question,
        "choiceA": choices.get("A", ""),
        "choiceB": choices.get("B", ""),
        "choiceC": choices.get("C", ""),
        "choiceD": choices.get("D") or None,
        "correctAnswer": correct or "A",
        "explanation": explanation,
    }

# ── Categorization ──────────────────────────────────────────────────────────

MATH_RULES = [
    ("statistics",    ["mean", "median", "mode", "probability", "data", "distribution",
                       "scatter plot", "sample", "survey", "statistic", "percent change",
                       "margin of error", "random", "population", "proportion"]),
    ("geometry",      ["triangle", "circle", "angle", "area", "volume", "perimeter",
                       "rectangle", "polygon", "coordinate", "distance", "radius",
                       "diameter", "slope", "parallel", "perpendicular", "arc",
                       "circumference", "trigonometry", "sine", "cosine", "tangent",
                       "congruent", "similar", "right angle", "pythagorean"]),
    ("advanced-math", ["polynomial", "rational expression", "radical", "f(x)", "g(x)",
                       "function", "composite", "inverse function", "complex number",
                       "imaginary", "remainder theorem", "factor theorem", "asymptote",
                       "exponential", "logarithm", "absolute value"]),
    ("algebra",       ["linear", "equation", "inequality", "system of", "quadratic",
                       "solve for", "expression", "variable", "constant", "factor",
                       "expand", "simplify", "substitute", "coefficient", "zero",
                       "root", "vertex", "parabola", "arithmetic sequence"]),
    ("problem-solving", ["ratio", "rate", "percent", "percentage", "proportion",
                          "unit conversion", "word problem", "profit", "cost",
                          "speed", "distance", "time", "interest", "discount"]),
]

ELA_RULES = [
    ("vocabulary",          ["most nearly means", "as used in", "best word", "in context",
                              "meaning of", "definition of", "what does", "the word"]),
    ("punctuation",         ["comma", "semicolon", "colon", "dash", "apostrophe",
                              "punctuation", "period", "hyphen", "parenthes"]),
    ("grammar",             ["subject-verb", "pronoun", "modifier", "parallel",
                              "verb tense", "agreement", "sentence structure",
                              "grammatically", "noun", "adjective"]),
    ("rhetoric",            ["transition", "concise", "most effective", "style",
                              "argument", "combine", "sentence", "word choice",
                              "order", "logically completes", "function of",
                              "main purpose", "strengthen", "support", "weaken"]),
    ("reading-comprehension", ["according to", "passage", "text states", "narrator",
                                "author", "main idea", "inference", "conclude",
                                "suggest", "imply", "tone", "purpose", "claim",
                                "evidence", "illustrates", "demonstrates"]),
]

def classify(subject, question_text, passage_text=""):
    combined = ((question_text or "") + " " + (passage_text or "")).lower()
    rules = MATH_RULES if subject == "math" else ELA_RULES
    for topic_id, keywords in rules:
        if any(kw in combined for kw in keywords):
            return topic_id
    # defaults
    return "problem-solving" if subject == "math" else "reading-comprehension"

def difficulty_for(q_num):
    # q_num is global (1–1700); convert to position within 50-Q file
    pos = (q_num - 1) % 50 + 1
    if pos <= 17:
        return "easy"
    elif pos <= 34:
        return "medium"
    return "hard"

# ── Parse all files ──────────────────────────────────────────────────────────

def parse_file(filepath, subject):
    source = filepath.stem  # e.g. "SAT_RW_01"
    with open(filepath, encoding="utf-8") as f:
        content = f.read()

    qs = re.findall(r'<b[^>]*>Q(\d+)\.</b>(.*?)(?=<b[^>]*>Q\d+\.\s*</b>|\Z)',
                    content, re.DOTALL)

    results = []
    for q_str, q_body in qs:
        q_num = int(q_str)
        parsed = parse_question_block(q_body)

        if not parsed["correctAnswer"] or not parsed["question"]:
            continue

        topic_id = classify(subject, parsed["question"], parsed["passage"] or "")

        results.append({
            "subject": subject,
            "topicId": topic_id,
            "difficulty": difficulty_for(q_num),
            "sourceFile": source,
            "questionNum": q_num,
            **parsed,
        })

    return results

def main():
    all_questions = []
    errors = []

    # Both folders contain SAT R&W (ELA) questions; use reading/ folder only
    for subject, folder in [("ela", "reading")]:
        folder_path = SAT_DIR / folder
        for html_file in sorted(folder_path.glob("SAT_RW_*.html")):
            try:
                questions = parse_file(html_file, subject)
                all_questions.extend(questions)
            except Exception as e:
                errors.append(f"{html_file.name}: {e}")

    print(json.dumps(all_questions, ensure_ascii=False), file=sys.stdout)
    if errors:
        print(f"\n{len(errors)} errors:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)

    print(f"Parsed {len(all_questions)} questions total", file=sys.stderr)

if __name__ == "__main__":
    main()
