"""
Import DDInter 2.0 CSVs into Supabase: fills `drugs` and `drug_interactions`.
Reads all 8 files from data/raw/, removes duplicate pairs, keeps the most severe level.
Safe to re-run. Usage (from server/ with venv active):  python scripts/import_ddinter.py
"""
import os
from pathlib import Path

import pandas as pd
import psycopg
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "data" / "raw"
load_dotenv(REPO_ROOT / "server" / ".env")

SEVERITY_RANK = {"unknown": 0, "minor": 1, "moderate": 2, "major": 3}
RANK_TO_SEVERITY = {v: k for k, v in SEVERITY_RANK.items()}


def load_csvs() -> pd.DataFrame:
    files = sorted(RAW_DIR.glob("ddinter_downloads_code_*.csv"))
    if not files:
        raise SystemExit(f"No DDInter CSV files found in {RAW_DIR}")
    df = pd.concat((pd.read_csv(f, dtype=str) for f in files), ignore_index=True)
    print(f"Read {len(files)} files, {len(df):,} rows in total")

    df = df.dropna(subset=["DDInterID_A", "Drug_A", "DDInterID_B", "Drug_B"])
    for col in df.columns:
        df[col] = df[col].str.strip()
    df["Level"] = df["Level"].fillna("Unknown").str.lower()
    df.loc[~df["Level"].isin(SEVERITY_RANK.keys()), "Level"] = "unknown"
    return df


def to_number(ddinter_ids: pd.Series) -> pd.Series:
    """'DDInter1263' -> 1263"""
    return ddinter_ids.str.replace("DDInter", "", regex=False).astype(int)


def build_drugs(df: pd.DataFrame) -> pd.DataFrame:
    side_a = df[["DDInterID_A", "Drug_A"]].set_axis(["ddinter_id", "name"], axis=1)
    side_b = df[["DDInterID_B", "Drug_B"]].set_axis(["ddinter_id", "name"], axis=1)
    drugs = pd.concat([side_a, side_b]).drop_duplicates(subset="ddinter_id")
    drugs.insert(0, "id", to_number(drugs["ddinter_id"]))
    return drugs.sort_values("id")


def build_interactions(df: pd.DataFrame) -> pd.DataFrame:
    a, b = to_number(df["DDInterID_A"]), to_number(df["DDInterID_B"])
    pairs = pd.DataFrame({
        "drug_a_id": a.where(a < b, b),          # smaller id first
        "drug_b_id": b.where(a < b, a),
        "rank": df["Level"].map(SEVERITY_RANK),
    })
    pairs = pairs[pairs["drug_a_id"] != pairs["drug_b_id"]]
    pairs = pairs.groupby(["drug_a_id", "drug_b_id"], as_index=False)["rank"].max()
    pairs["severity"] = pairs["rank"].map(RANK_TO_SEVERITY)
    return pairs[["drug_a_id", "drug_b_id", "severity"]]


def upload(drugs: pd.DataFrame, interactions: pd.DataFrame) -> None:
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("create temp table tmp_drugs (id int, ddinter_id text, name text) on commit drop")
        with cur.copy("copy tmp_drugs (id, ddinter_id, name) from stdin") as cp:
            for row in drugs.itertuples(index=False, name=None):
                cp.write_row((int(row[0]), row[1], row[2]))
        cur.execute("""
            insert into public.drugs (id, ddinter_id, name)
            select id, ddinter_id, name from tmp_drugs
            on conflict (id) do update set ddinter_id = excluded.ddinter_id, name = excluded.name
        """)

        cur.execute("delete from public.drug_interactions")
        with cur.copy("copy public.drug_interactions (drug_a_id, drug_b_id, severity) from stdin") as cp:
            for row in interactions.itertuples(index=False, name=None):
                cp.write_row((int(row[0]), int(row[1]), row[2]))
    print("Upload committed.")


def main() -> None:
    df = load_csvs()
    drugs = build_drugs(df)
    interactions = build_interactions(df)
    print(f"Unique drugs: {len(drugs):,}")
    print(f"Unique interaction pairs: {len(interactions):,}")
    print(interactions["severity"].value_counts().to_string())
    upload(drugs, interactions)


if __name__ == "__main__":
    main()