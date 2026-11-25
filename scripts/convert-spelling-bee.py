import csv
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT_DIR / 'data' / 'spelling-bee.csv'
JSON_PATH = ROOT_DIR / 'data' / 'questions_spelling.json'

def update_championship_from_json(data):
    """Update Championship lists based on current Practice 1 and Practice 2 in JSON."""
    for level in data:
        for list_name in data[level]:
            p1 = data[level][list_name].get('Practice 1', [])
            p2 = data[level][list_name].get('Practice 2', [])
            data[level][list_name]['Championship'] = p1 + p2
    return data

with open(CSV_PATH, newline='', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    data = {}
        
    for row in reader:
        level = row['Level'].strip()
        list_name = row['List'].strip()
        study = row['Study'].strip()
        answer = row['Answer'].strip()

        # Ignora linhas vazias ou sem resposta
        if not level or not list_name or not study or not answer:
            continue
            
        if level not in data:
            data[level] = {}
        if list_name not in data[level]:
            data[level][list_name] = {}
        if study not in data[level][list_name]:
            data[level][list_name][study] = []
            
        data[level][list_name][study].append({
            "media": row['Media'].strip(),
            "answer": answer,
            "prompt": row['Prompt'].strip()
        })

# Sempre regenera o Championship a partir de Practice 1 e 2
data = update_championship_from_json(data)

# Salva no JSON dentro de data/
with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✓ questions_spelling.json atualizado com listas Championship renovadas!")