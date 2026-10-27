# Data

## DDInter 2.0 drug-drug interaction data
- Source: DDInter 2.0 (https://ddinter2.scbdd.com/) → Download page
- Files: 8 CSVs (one per drug category), saved in `data/raw/`
- Raw CSVs are NOT committed to Git (see .gitignore). Download them yourself if you need them.
- They are imported once into Supabase (`drugs` and `drug_interactions` tables) by the import script.
- Used for academic, non-commercial purposes; cite DDInter in the final report.