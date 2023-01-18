import imp
from operator import imod
from os import sep
from pathlib import Path

# Importing the create_engine function from the sqlalchemy package.
import pandas as pd
from sqlalchemy import create_engine, dialects, types

from utils import detect_csv_separator


def import_file(url, path, table_name=None, schema=None):
    engine = create_engine(url)

    path = Path(path)

    if table_name is None or table_name == "":
        table_name = path.name.split(".")[0].lower()

    if schema == "":
        schema = None

    print(f"Table name: {table_name}")

    if path.suffix.lower() == ".csv":
        read_funcs = [pd.read_csv]
    elif path.suffix.lower() == ".json":
        read_funcs = [pd.read_json]
    elif path.suffix.lower() == ".xlsx":
        read_funcs = [pd.read_excel]
    else:
        read_funcs = [pd.read_csv, pd.read_json, pd.read_excel]

    for func in read_funcs:
        try:
            print(f"Try: {func.__name__}")
            if func.__name__ == "read_csv":
                sepator = detect_csv_separator(path)
                df = func(path, sep=sepator)
            else:
                df = func(path)
            # Maybe we want more processing here...
            df.columns = df.columns.str.lower()
        except Exception as e:
            print(e)
            continue
        else:
            # if 'id' not in df.columns:
            #     df.index.names = ['id']
            # types.JSON
            dtypesDict = {
                column: dialects.postgresql.JSONB
                for column in df.columns
                if isinstance(df.iloc[0][column], dict)
            }
            df.to_sql(
                table_name,
                engine,
                index=False,
                schema=schema,
                if_exists="replace",
                dtype=dtypesDict,
            )
            break
