import csv
import json

# Load the CSV file
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

# Generate Championship by concatenating Practice 1 and Practice 2
for level in data:
    for list_name in data[level]:
        p1 = data[level][list_name].get('Practice 1', [])
        p2 = data[level][list_name].get('Practice 2', [])
        if 'Championship' not in data[level][list_name]:
            data[level][list_name]['Championship'] = p1 + p2

with open('questions_spelling.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
