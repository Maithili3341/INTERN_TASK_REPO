# %%
pip install pandas

# %%
pip install openpyxl

# %%
import sqlite3
import pandas as pd

# Load Excel file and keep all columns as string
df = pd.read_excel("customer_sample_500.csv.xlsx", dtype=str)

# Replace NaN with empty string so values remain exactly as in file
df = df.fillna("")

# Check datatypes
print(df.dtypes)

# Connect to SQLite
conn = sqlite3.connect(":memory:")

# Load dataframe into SQLite table
df.to_sql("customers", conn, index=False, if_exists="replace")

# Create cursor
cursor = conn.cursor()

# %%
columns = df.columns

for col in columns:
    query = f"""
    SELECT COUNT(*) 
    FROM customers
    WHERE {col} IS NULL OR TRIM({col}) = ''
    """
    
    missing = cursor.execute(query).fetchone()[0]
    print(f"{col} Missing Values:", missing)

# %%
unique_columns = ["PK_CUSTOMER_ID","ONEKEY_ID","HCO_ID"]

for col in unique_columns:
    query = f"""
    SELECT COUNT(*) - COUNT(DISTINCT {col})
    FROM customers
    """
    
    duplicates = cursor.execute(query).fetchone()[0]
    print(f"{col} Duplicate Count:", duplicates)

# %%
query = """
SELECT COUNT(*)
FROM customers
WHERE LENGTH(SIRET) != 14
"""
print("Invalid SIRET:", cursor.execute(query).fetchone()[0])

# %%
query = """
SELECT COUNT(*)
FROM customers
WHERE LENGTH(SIREN) != 9
"""
print("Invalid SIREN:", cursor.execute(query).fetchone()[0])

# %%
query = """
SELECT COUNT(*)
FROM customers
WHERE LENGTH(COUNTRY_CD) != 2
"""
print("Invalid Country Code:", cursor.execute(query).fetchone()[0])

# %%
query = """
SELECT COUNT(*)
FROM customers
WHERE SAP_POSTAL_ZIP_CD GLOB '*[^0-9]*'
"""
print("Invalid Postal Codes:", cursor.execute(query).fetchone()[0])

# %%
query = """
SELECT COUNT(*)
FROM customers
WHERE COUNTRY_CD != LUCI_COUNTRY_CD
"""
print("Country mismatch:", cursor.execute(query).fetchone()[0])

# %%
query = """
SELECT COUNT(*)
FROM customers
WHERE CUSTOMER_DELIVERY_BLOC NOT IN ('00','01')
"""
print("Invalid delivery block:", cursor.execute(query).fetchone()[0])

# %%
query = """
SELECT COUNT(*)
FROM customers
WHERE GERS GLOB '*[^0-9]*'
"""
print("Invalid GERS:", cursor.execute(query).fetchone()[0])

# %%



