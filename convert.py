import pandas as pd
import json

# Load the CSV file
df = pd.read_csv('questions.csv')

json_output = {}

for _, row in df.iterrows():
    mod = row['Module']
    lvl = row['Level']
    
    if mod not in json_output: json_output[mod] = {}
    if lvl not in json_output[mod]: json_output[mod][lvl] = []
    
    json_output[mod][lvl].append({
        "q": row['Question'],
        "options": [row['Option 1'], row['Option 2'], row['Option 3'], row['Option 4']],
        "answer": row['Answer']
    })

with open('questions.json', 'w', encoding='utf-8') as f:
    json.dump(json_output, f, indent=2, ensure_ascii=False)