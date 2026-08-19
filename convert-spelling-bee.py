#!/usr/bin/env python3
"""
convert-spelling-bee.py

Read a CSV with headers: level,list,study,media,answer,prompt
Produce a nested JSON file: Level -> List -> Study -> [ {media, answer, prompt}, ... ]
By default it writes questions_spelling.json in the repo root.
It will also (unless --no-champ) create Championship = Practice 1 + Practice 2 for each Level/List.

Usage:
  python convert-spelling-bee.py input.csv --out questions_spelling.json --assets-prefix assets/spelling-bee/

Options:
  --out FILE           Output JSON file (default: questions_spelling.json)
  --assets-prefix P    (informational) prefix for media files (default: assets/spelling-bee/)
  --no-champ           Do not generate Championship by concatenating Practice 1 and Practice 2
  --dry-run            Print summary counts but do not write output file

This script intentionally does NOT dedupe or shuffle Championship; it concatenates Practice 1 then Practice 2.
"""

import argparse
import csv
import json
import os
import sys
from collections import defaultdict

REQUIRED_HEADERS = ['level', 'list', 'study', 'media', 'answer', 'prompt']


def parse_args():
    p = argparse.ArgumentParser(description='Convert CSV to questions_spelling.json for Spelling Bee')
    p.add_argument('csvfile', help='Input CSV file with headers: level,list,study,media,answer,prompt')
    p.add_argument('--out', '-o', default='questions_spelling.json', help='Output JSON file path')
    p.add_argument('--assets-prefix', default='assets/spelling-bee/', help='(informational) prefix for media files')
    p.add_argument('--no-champ', action='store_true', help='Do not generate Championship by concatenating Practice 1 and Practice 2')
    p.add_argument('--dry-run', action='store_true', help="Don't write output, just print counts")
    return p.parse_args()


def ensure_path(obj, level, list_name, study):
    if level not in obj:
        obj[level] = {}
    if list_name not in obj[level]:
        obj[level][list_name] = {}
    if study not in obj[level][list_name]:
        obj[level][list_name][study] = []


def main():
    args = parse_args()
    csvfile = args.csvfile

    if not os.path.isfile(csvfile):
        print(f'Error: CSV file not found: {csvfile}', file=sys.stderr)
        sys.exit(2)

    data = {}
    missing = 0
    rows_processed = 0

    with open(csvfile, newline='', encoding='utf-8-sig') as fh:
        reader = csv.DictReader(fh)
        headers = [h.strip() for h in reader.fieldnames] if reader.fieldnames else []
        lower_headers = [h.lower().strip() for h in headers]

        # Map columns to expected names (case-insensitive)
        header_map = {name: None for name in REQUIRED_HEADERS}
        for i, h in enumerate(headers):
            key = h.lower().strip()
            if key in header_map:
                header_map[key] = h

        missing_headers = [k for k, v in header_map.items() if v is None]
        if missing_headers:
            print('Error: CSV is missing required headers:', ', '.join(missing_headers), file=sys.stderr)
            print('Expected headers (case-insensitive):', ', '.join(REQUIRED_HEADERS), file=sys.stderr)
            sys.exit(2)

        for r in reader:
            rows_processed += 1
            level = (r.get(header_map['level']) or '').strip()
            list_name = (r.get(header_map['list']) or '').strip()
            study = (r.get(header_map['study']) or '').strip()
            media = (r.get(header_map['media']) or '').strip()
            answer = (r.get(header_map['answer']) or '').strip()
            prompt = (r.get(header_map['prompt']) or '').strip()

            if not (level and list_name and study and media and answer):
                missing += 1
                print(f'Warning: skipping row {rows_processed} due to missing required fields', file=sys.stderr)
                continue

            ensure_path(data, level, list_name, study)
            data[level][list_name][study].append({
                'media': media,
                'answer': answer,
                'prompt': prompt
            })

    # Optionally build Championship by concatenating Practice 1 and Practice 2
    if not args.no_champ:
        for level, lists in list(data.items()):
            for list_name, studies in list(lists.items()):
                p1 = studies.get('Practice 1', [])
                p2 = studies.get('Practice 2', [])
                # If Championship already present, do not overwrite
                if 'Championship' in studies:
                    print(f'Note: Championship already exists for {level} / {list_name}; leaving it as-is')
                    continue
                # Concatenate P1 then P2 (even if one is empty)
                concat = []
                if isinstance(p1, list):
                    concat.extend(p1)
                if isinstance(p2, list):
                    concat.extend(p2)
                studies['Championship'] = concat

    # Summary
    total_questions = 0
    counts = defaultdict(int)
    for level, lists in data.items():
        for list_name, studies in lists.items():
            for study, arr in studies.items():
                counts[f'{level} / {list_name} / {study}'] = len(arr)
                total_questions += len(arr)

    print(f'Processed {rows_processed} rows; skipped {missing} rows with missing fields')
    print(f'Total questions assembled: {total_questions}')
    for k, v in sorted(counts.items()):
        print(f'  {k}: {v}')

    if args.dry_run:
        print('Dry run: not writing output file')
        return

    out_path = args.out
    try:
        with open(out_path, 'w', encoding='utf-8') as of:
            json.dump(data, of, ensure_ascii=False, indent=2)
        print(f'Wrote JSON to {out_path}')
    except Exception as e:
        print('Error writing output file:', e, file=sys.stderr)
        sys.exit(3)


if __name__ == '__main__':
    main()
