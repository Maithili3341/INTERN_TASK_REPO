import streamlit as st
import pandas as pd
import json

st.set_page_config(layout="wide")

# ---------- THEME ----------
if "theme" not in st.session_state:
    st.session_state.theme = "light"

toggle = st.toggle("🌙 Dark Mode", value=(st.session_state.theme == "dark"))
st.session_state.theme = "dark" if toggle else "light"

# ---------- LOAD DATA ----------
file_path = "snowflake_data_lineage.xlsx"
df = pd.read_excel(file_path, sheet_name="data_lineage")
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

nodes = set()
edges = []

for _, row in df.iterrows():
    src = str(row["parent_object"])
    tgt = str(row["child_object"])

    if src == "nan" or tgt == "nan":
        continue

    nodes.add(src)
    nodes.add(tgt)

    edge = {"from": src, "to": tgt}

    if "relation_type" in df.columns:
        edge["label"] = str(row["relation_type"])

    edges.append(edge)

graph_json = json.dumps({
    "nodes": [{"id": n} for n in nodes],
    "edges": edges
})

# ---------- HTML ----------
html = """
<!DOCTYPE html>
<html>
<head>
<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>

<style>
body {
    margin:0;
    font-family: Arial;
    background: BG;
    color: TEXT;
}

#topbar {
    height:50px;
    display:flex;
    gap:10px;
    padding:5px;
    background: BG;
}

#search {
    padding:6px;
    width:220px;
}

#suggestions {
    position:absolute;
    top:45px;
    background:white;
    color:black;
    max-height:150px;
    overflow:auto;
    border:1px solid #ccc;
}

.suggestion {
    padding:5px;
    cursor:pointer;
}
.suggestion:hover { background:#eee; }

.container {
    display:flex;
    height:95vh;
}

#network {
    flex:2;
}

#sidePanel {
    flex:1;
    background:CARD;
    padding:10px;
    overflow:auto;
}

.card {
    padding:10px;
    border-radius:10px;
    background:CARD;
}

.parent { color:#42a5f5; cursor:pointer; }
.child { color:#fb8c00; cursor:pointer; }
</style>
</head>

<body>

<div id="topbar">
<input id="search" placeholder="Search..." onkeyup="searchNode()">
<div id="suggestions"></div>

<button onclick="goBack()">⬅</button>
<button onclick="goForward()">➡</button>
<button onclick="zoomIn()">＋</button>
<button onclick="zoomOut()">－</button>
<button onclick="fit()">Fit</button>
<button onclick="toggleLock()" id="lockBtn">🔓</button>
<button onclick="fullscreen()">⛶</button>
</div>

<div class="container">
<div id="network"></div>

<div id="sidePanel">
<div class="card">
<h3>Node Details</h3>
<div id="info">Click a node</div>

<h4>Parents</h4>
<div id="parents"></div>

<h4>Children</h4>
<div id="children"></div>
</div>
</div>
</div>

<script>

let data = GRAPH;
let nodes = new vis.DataSet();
let edges = new vis.DataSet();

let history = [];
let index = -1;
let locked = false;

// -------- CLEAN LAYOUT --------
let network = new vis.Network(
    document.getElementById("network"),
    { nodes, edges },
    {
        layout: {
            hierarchical: {
                enabled: true,
                direction: "LR",
                sortMethod: "directed",
                levelSeparation: 250,
                nodeSpacing: 220,
                treeSpacing: 250,
                blockShifting: true,
                edgeMinimization: true,
                parentCentralization: true
            }
        },
        physics: false,

        nodes: {
            shape: "box",
            margin: 10,
            widthConstraint: {
                minimum: 120,
                maximum: 200
            },
            font: {
                size: 14,
                multi: true
            }
        },

        edges: {
            arrows: "to",
            smooth: {
                type: "cubicBezier",
                forceDirection: "horizontal",
                roundness: 0.4
            },
            font: {
                align: "middle",
                size: 10
            }
        }
    }
);

// ---------- ROOT VIEW ----------
function showRoots(){
    nodes.clear(); edges.clear();

    let childSet = new Set(data.edges.map(e => e.to));
    let roots = data.nodes.filter(n => !childSet.has(n.id));

    nodes.add(roots.map(n => ({
        id:n.id,
        label:format(n.id),
        color:"#fb8c00"
    })));

    network.setData({nodes,edges});
    network.fit({animation:true});
}

showRoots();

// ---------- CLICK ----------
network.on("click", function(p){
    if(!p.nodes.length || locked) return;

    let id = p.nodes[0];

    history = history.slice(0,index+1);
    history.push(id);
    index++;

    render(id);
});

// ---------- RENDER ----------
function render(id){
    nodes.clear(); edges.clear();

    let parents = data.edges.filter(e => e.to===id);
    let children = data.edges.filter(e => e.from===id);

    nodes.add({ id, label:format(id), color:"#e53935" });

    parents.forEach(e=>{
        nodes.add({ id:e.from, label:format(e.from), color:"#42a5f5" });
        edges.add(e);
    });

    children.forEach(e=>{
        nodes.add({ id:e.to, label:format(e.to), color:"#fb8c00" });
        edges.add(e);
    });

    document.getElementById("info").innerText=id;

    document.getElementById("parents").innerHTML =
        parents.map(p=>`<div class="parent" onclick="render('${p.from}')">${p.from}</div>`).join("");

    document.getElementById("children").innerHTML =
        children.map(c=>`<div class="child" onclick="render('${c.to}')">${c.to}</div>`).join("");

    network.setData({nodes,edges});
    network.fit({animation:true});
}

// ---------- SEARCH ----------
function searchNode(){
    let val=document.getElementById("search").value.toLowerCase();
    let box=document.getElementById("suggestions");

    if(!val){ box.innerHTML=""; return; }

    let matches=data.nodes.filter(n =>
        n.id.toLowerCase().includes(val)
    ).slice(0,10);

    box.innerHTML = matches.map(n =>
        `<div class="suggestion" onclick="selectNode('${n.id}')">${n.id}</div>`
    ).join("");
}

function selectNode(id){
    document.getElementById("suggestions").innerHTML="";
    render(id);
}

// ---------- NAV ----------
function goBack(){
    history=[];
    index=-1;
    showRoots();
}

function goForward(){
    if(index < history.length-1){
        index++;
        render(history[index]);
    }
}

// ---------- ZOOM ----------
function zoomIn(){ network.moveTo({scale:network.getScale()*1.2}); }
function zoomOut(){ network.moveTo({scale:network.getScale()*0.8}); }
function fit(){ network.fit(); }

// ---------- LOCK ----------
function toggleLock(){
    locked=!locked;
    document.getElementById("lockBtn").innerText = locked?"🔒":"🔓";
}

// ---------- FULLSCREEN ----------
function fullscreen(){
    if(!document.fullscreenElement)
        document.documentElement.requestFullscreen();
    else document.exitFullscreen();
}

// ---------- LABEL WRAP ----------
function format(text){
    return text.match(/.{1,18}/g).join("\\n");
}

</script>

</body>
</html>
"""

# ---------- THEME COLORS ----------
if st.session_state.theme == "dark":
    html = html.replace("BG", "#121212")
    html = html.replace("TEXT", "white")
    html = html.replace("CARD", "#1e1e1e")
else:
    html = html.replace("BG", "#ffffff")
    html = html.replace("TEXT", "black")
    html = html.replace("CARD", "#f4f4f4")

html = html.replace("GRAPH", graph_json)

st.components.v1.html(html, height=1000, scrolling=True)