from flask import Flask, render_template, jsonify
import pandas as pd

app = Flask(__name__)

# -------- LOAD DATA FROM EXCEL --------
file_path = "snowflake_data_lineage.xlsx"
df = pd.read_excel(file_path, sheet_name="data_lineage") # make sure file exists here

# clean column names
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

# -------- COLUMN MAPPING (ADJUST IF NEEDED) --------
# try common Snowflake lineage formats
if "parent_object" in df.columns and "child_object" in df.columns:
    parent_col = "parent_object"
    child_col = "child_object"
elif "parent" in df.columns and "child" in df.columns:
    parent_col = "parent"
    child_col = "child"
elif "source" in df.columns and "target" in df.columns:
    parent_col = "source"
    child_col = "target"
else:
    raise ValueError(f"Unknown column format: {df.columns.tolist()}")

# relation optional
relation_col = "relation" if "relation" in df.columns else None

# standardize column names
df = df.rename(columns={
    parent_col: "parent",
    child_col: "child"
})

if relation_col:
    df = df.rename(columns={relation_col: "relation"})
else:
    df["relation"] = "related_to"

# clean data
df = df.dropna(subset=["parent", "child"]).drop_duplicates()

# -------- ROOT NODES --------
all_children = set(df["child"])
all_parents = set(df["parent"])
root_nodes = list(all_parents - all_children)


# -------- ROUTES --------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/graph")
def graph():
    return jsonify({
        "nodes": [{"id": n, "label": n} for n in root_nodes[:10]],
        "edges": []
    })


@app.route("/expand/<node_id>")
def expand(node_id):
    edges = []

    # children
    for _, row in df[df["parent"] == node_id].iterrows():
        edges.append({
            "from": row["parent"],
            "to": row["child"],
            "label": row["relation"]
        })

    # parent
    for _, row in df[df["child"] == node_id].iterrows():
        edges.append({
            "from": row["parent"],
            "to": row["child"],
            "label": row["relation"]
        })

    return jsonify({"edges": edges})


@app.route("/full_lineage/<node_id>")
def full_lineage(node_id):

    lineage_nodes = set()
    lineage_edges = []

    current = node_id

    # upward traversal
    while True:
        parent = df[df["child"] == current]

        if parent.empty:
            break

        row = parent.iloc[0]

        lineage_nodes.add(row["parent"])
        lineage_nodes.add(row["child"])

        lineage_edges.append({
            "from": row["parent"],
            "to": row["child"],
            "label": row["relation"]
        })

        current = row["parent"]

    # direct children
    for _, row in df[df["parent"] == node_id].iterrows():
        lineage_nodes.add(row["parent"])
        lineage_nodes.add(row["child"])

        lineage_edges.append({
            "from": row["parent"],
            "to": row["child"],
            "label": row["relation"]
        })

    return jsonify({
        "nodes": list(lineage_nodes),
        "edges": lineage_edges
    })


@app.route("/path/<node_id>")
def path(node_id):
    path = []
    current = node_id

    while True:
        parent = df[df["child"] == current]

        if parent.empty:
            break

        p = parent.iloc[0]["parent"]
        path.append(p)
        current = p

    return jsonify(path[::-1])


@app.route("/all_nodes")
def all_nodes():
    return jsonify(list(set(df["child"]).union(set(df["parent"]))))


# -------- RUN --------
if __name__ == "__main__":
    app.run(debug=True)