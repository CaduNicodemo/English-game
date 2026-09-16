import csv
import json
import os

def load_json_data(filepath='questions_spelling.json'):
    """Load existing JSON data if it exists."""
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def update_championship_from_json(data):
    """Update Championship lists based on current Practice 1 and Practice 2 in JSON."""
    for level in data:
        for list_name in data[level]:
            p1 = data[level][list_name].get('Practice 1', [])
            p2 = data[level][list_name].get('Practice 2', [])
            data[level][list_name]['Championship'] = p1 + p2
    return data

# First, try to load existing JSON and update it
data = load_json_data()

if data is None:
    # If no JSON exists, build from CSV (original behavior)
    with open('spelling-bee.csv', newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        data = {}
        
        for row in reader:
            level = row['Level']
            list_name = row['List']
            study = row['Study']
            
            if level not in data: data[level] = {}
            if list_name not in data[level]: data[level][list_name] = {}
            if study not in data[level][list_name]: data[level][list_name][study] = []
            
            data[level][list_name][study].append({
                "media": row['Media'],
                "answer": row['Answer'],
                "prompt": row['Prompt']
            })

# Always regenerate Championship from current Practice 1 and 2
data = update_championship_from_json(data)

# Save back to JSON
with open('questions_spelling.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✓ JSON updated with refreshed Championship lists")
