import pandas as pd
import json
from pathlib import Path

# Define a pasta raiz do projeto automaticamente (um nível acima de scripts/)
ROOT_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT_DIR / 'data' / 'questions.csv'
JSON_PATH = ROOT_DIR / 'data' / 'questions.json'

# Carrega o CSV substituindo células vazias por string vazia
df = pd.read_csv(CSV_PATH).fillna('')

json_output = {}

for _, row in df.iterrows():
    mod = str(row['Module']).strip()
    lvl = str(row['Level']).strip()
    
    # Ignora linhas completamente vazias
    if not mod or not lvl or not str(row['Question']).strip():
        continue

    if mod not in json_output:
        json_output[mod] = {}
    if lvl not in json_output[mod]:
        json_output[mod][lvl] = []
    
    # Filtra opções vazias
    options = [
        str(row['Option 1']).strip(),
        str(row['Option 2']).strip(),
        str(row['Option 3']).strip(),
        str(row['Option 4']).strip()
    ]
    options = [opt for opt in options if opt]
    
    json_output[mod][lvl].append({
        "q": str(row['Question']).strip(),
        "type": str(row.get('Type', '')).strip(),
        "media": str(row.get('Media', '')).strip(),
        "options": options,
        "answer": str(row['Answer']).strip()
    })

with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(json_output, f, indent=2, ensure_ascii=False)

print("✓ questions.json atualizado com sucesso!")