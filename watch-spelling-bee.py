#!/usr/bin/env python3
"""
watch-spelling-bee.py

Watches the 'Spelling Bee - questions.csv' file and automatically runs
convert-spelling-bee.py whenever it is updated.

Installation:
  pip install watchdog

Usage:
  python watch-spelling-bee.py
"""

import os
import sys
import subprocess
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class CSVChangeHandler(FileSystemEventHandler):
    def __init__(self, csv_file, output_file):
        self.csv_file = Path(csv_file).resolve()
        self.output_file = output_file
        self.is_processing = False

    def on_modified(self, event):
        if event.is_directory:
            return
        
        file_path = Path(event.src_path).resolve()
        
        # Only trigger if the CSV file was modified
        if file_path == self.csv_file and not self.is_processing:
            self.is_processing = True
            print(f"\n📝 Detected changes to {self.csv_file.name}")
            self._run_conversion()
            self.is_processing = False

    def _run_conversion(self):
        try:
            print("🔄 Running conversion...")
            result = subprocess.run(
                [
                    sys.executable,
                    "convert-spelling-bee.py",
                    str(self.csv_file),
                    "--out",
                    self.output_file,
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )
            
            if result.returncode == 0:
                print(f"✅ Conversion successful!")
                print(result.stdout)
            else:
                print(f"❌ Conversion failed!")
                print(result.stderr)
        except subprocess.TimeoutExpired:
            print("❌ Conversion timed out!")
        except Exception as e:
            print(f"❌ Error running conversion: {e}")


def main():
    csv_file = "Spelling Bee - questions.csv"
    output_file = "questions_spelling.json"

    if not os.path.isfile(csv_file):
        print(f"Error: {csv_file} not found in current directory.")
        print("Make sure you're running this script from the repo root.")
        sys.exit(1)

    print(f"👀 Watching '{csv_file}' for changes...")
    print(f"Output will be written to '{output_file}'")
    print("Press Ctrl+C to stop.\n")

    event_handler = CSVChangeHandler(csv_file, output_file)
    observer = Observer()
    observer.schedule(event_handler, path=".", recursive=False)
    observer.start()

    try:
        while True:
            observer.join(timeout=1)
    except KeyboardInterrupt:
        print("\n\n👋 Stopped watching.")
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main()
