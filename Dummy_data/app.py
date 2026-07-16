import streamlit as st
import pandas as pd
import json

st.set_page_config(layout="wide")
st.title("Data Lineage Visualization")

# -------- LOAD DATA --------
file_path = "snowflake_data_lineage.xlsx"
df = pd.read_excel(file_path, sheet_name="data_lineage")

df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

# detect columns
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
    st.error("Unknown column format")
    st.stop()

df = df.rename(columns={parent_col: "parent", child_col: "child"})
df = df.dropna(subset=["parent", "child"]).drop_duplicates()

# -------- ROOT NODES --------
all_parents = set(df["parent"])
all_children = set(df["child"])

root_nodes = [node for node in all_parents if node not in all_children]

if len(root_nodes) == 0:
    st.error("No true root nodes found")
    st.stop()

root_nodes = root_nodes[:30]  # allow more but controlled

# -------- BUILD GRAPH --------
edges = []
for _, row in df.iterrows():
    edges.append({
        "from": str(row["parent"]),
        "to": str(row["child"])
    })

graph_json = json.dumps({
    "edges": edges,
    "roots": root_nodes
})

# -------- HTML --------
html = """
<!DOCTYPE html>
<html>
<head>
<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>

<style>
#network { height:90vh; }
</style>
</head>

<body>
<div id="network"></div>

<script>

let data = GRAPH;

let nodes = new vis.DataSet();
let edges = new vis.DataSet();

// -------- TEXT WRAP FUNCTION --------
function formatLabel(text){
    return text.match(/.{1,20}/g).join("\\n");
}

let network = new vis.Network(
    document.getElementById("network"),
    { nodes, edges },
    {
        layout: {
            improvedLayout: true
        },
        physics: {
            enabled: true,
            stabilization: false
        },

        nodes: {
            shape: "box",
            margin: 10,
            widthConstraint: {
                minimum: 120,
                maximum: 180
            },
            font: {
                size: 14,
                multi: true
            }
        },

        edges: {
            arrows: "to",
            smooth: {
                type: "dynamic"
            }
        }
    }
);

// -------- SHOW ROOTS (GRID STYLE) --------
function showRoots() {
    nodes.clear();
    edges.clear();

    data.roots.forEach((r, i) => {
        nodes.add({
            id: r,
            label: formatLabel(r),
            color: "#fb8c00",
            x: (i % 5) * 250,
            y: Math.floor(i / 5) * 150,
            fixed: true
        });
    });

    network.setData({ nodes, edges });
}

showRoots();

// -------- CLICK → TOP-DOWN VIEW --------
network.on("click", function(params) {
    if (!params.nodes.length) return;

    let selected = params.nodes[0];

    nodes.clear();
    edges.clear();

    // center node
    nodes.add({
        id: selected,
        label: formatLabel(selected),
        color: "#e53935",
        level: 1
    });

    // parents (top)
    let parents = data.edges.filter(e => e.to === selected);

    parents.forEach(e => {
        nodes.add({
            id: e.from,
            label: formatLabel(e.from),
            color: "#42a5f5",
            level: 0
        });
        edges.add(e);
    });

    // children (bottom)
    let children = data.edges.filter(e => e.from === selected);

    children.forEach(e => {
        nodes.add({
            id: e.to,
            label: formatLabel(e.to),
            color: "#fb8c00",
            level: 2
        });
        edges.add(e);
    });

    network.setOptions({
        layout: {
            hierarchical: {
                enabled: true,
                direction: "UD",
                levelSeparation: 200,
                nodeSpacing: 150
            }
        },
        physics: false
    });

    network.setData({ nodes, edges });
    network.fit({ animation: true });
});

</script>
</body>
</html>
"""

html = html.replace("GRAPH", graph_json)

st.components.v1.html(html, height=900)
