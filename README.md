I don't have permission to update the workflow file. You'll need to update .github/workflows/sync.yml manually with these changes:

Add 'spelling-bee.csv' to the paths trigger (line 5)
Change line 18 comment from Run Converter to Run Converters
Add python convert-spelling-bee.py after python convert.py (lines 20-21)
Update line 26 to add questions_spelling.json to the git add command
Update line 27 commit message to reflect both files
Here's the updated file you can copy:

name: Sync Questions
on:
  push:
    paths:
      - 'questions.csv'
      - 'spelling-bee.csv'
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      - name: Set up Python
        uses: actions/setup-python@v5
        with: { python-version: '3.x' }
      - name: Run Converters
        run: |
          pip install pandas
          python convert.py
          python convert-spelling-bee.py
      - name: Commit and Push
        run: |
          git config --global user.name 'GitHub Action'
          git config --global user.email 'action@github.com'
          git add questions.json questions_spelling.json
          git commit -m "Auto-update JSON files from CSVs" || exit 0
          git push
