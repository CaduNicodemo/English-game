#!/usr/bin/env python3
"""
watch-spelling-bee.py

Monitora o arquivo 'data/spelling-bee.csv' e executa automaticamente
'scripts/convert-spelling-bee.py' sempre que ele for atualizado.
"""

import sys
import subprocess
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

ROOT_DIR = Path(__file__).resolve().parent.parent
CSV_FILE = ROOT_DIR / "data" / "spelling-bee.csv"
CONVERTER_SCRIPT = ROOT_DIR / "scripts" / "convert-spelling-bee.py"
OUTPUT_FILE = ROOT_DIR / "data" / "questions_spelling.json"


class CSVChangeHandler(FileSystemEventHandler):
    def __init__(self, csv_file):
        self.csv_file = Path(csv_file).resolve()
        self.is_processing = False

    def on_modified(self, event):
        if event.is_directory:
            return
        
        file_path = Path(event.src_path).resolve()
        
        if file_path == self.csv_file and not self.is_processing:
            self.is_processing = True
            print(f"\n📝 Alterações detectadas em {self.csv_file.name}")
            self._run_conversion()
            self.is_processing = False

    def _run_conversion(self):
        try:
            print("🔄 Executando conversão...")
            result = subprocess.run(
                [sys.executable, str(CONVERTER_SCRIPT)],
                capture_output=True,
                text=True,
                timeout=30,
            )
            
            if result.returncode == 0:
                print("✅ Conversão concluída com sucesso!")
                print(result.stdout.strip())
            else:
                print("❌ Falha na conversão!")
                print(result.stderr.strip())
        except subprocess.TimeoutExpired:
            print("❌ Tempo limite excedido na conversão!")
        except Exception as e:
            print(f"❌ Erro ao executar conversão: {e}")


def main():
    if not CSV_FILE.is_file():
        print(f"Erro: {CSV_FILE} não encontrado.")
        sys.exit(1)

    print(f"👀 Monitorando '{CSV_FILE}' para alterações...")
    print(f"O resultado será salvo em '{OUTPUT_FILE}'")
    print("Pressione Ctrl+C para parar.\n")

    event_handler = CSVChangeHandler(CSV_FILE)
    observer = Observer()
    # Monitora a pasta data/
    observer.schedule(event_handler, path=str(CSV_FILE.parent), recursive=False)
    observer.start()

    try:
        while True:
            observer.join(timeout=1)
    except KeyboardInterrupt:
        print("\n\n👋 Monitoramento encerrado.")
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main()