// Global variable definitions
let typeSelected = ["none"];
let evolutionChainSelected = [];
let singleEvolutionChainSelected = [];
let pokemonSelected = [];
let typeFilteredData, evolutionData, filteredData, temp;
let bargraph, pointchart, linkedGraph, hexbinGraph, totalBaseLineChart, separateBaseLineChart, heatmap;
let maxPointsPerRow = 60;
let currentView = 'directed';
const clearDispatcher = d3.dispatch('clearSelections');

// Color map for Pokémon types
let colorMap = {
    'bug': '#ACB538',
    'dark': '#6B5A44',
    'dragon': '#6230F5',
    'electric': '#F1D647',
    'fairy': '#F2A6BC',
    'fighting': '#BB3B2A',
    'fire': '#E99738',
    'flying': '#9F8AE4',
    'ghost': '#695799',
    'grass': '#85CB51',
    'ground': '#E8D079',
    'ice': '#A8D6D7',
    'normal': '#A6A57A',
    'poison': '#8C3D93',
    'psychic': '#EC6589',
    'rock': '#B8A338',
    'steel': '#BAB8C9',
    'water': '#6A8BF0'
};

// Load evolution chain data
d3.csv('data/evolutionChain.csv').then(data => {
    evolutionData = data;
});

// Load Pokémon data and process it
d3.csv('data/pokemon.csv').then(data => {

    // Convert columns to numerical values
    data.forEach(d => {
        Object.keys(d).forEach(attr => {
            if (attr == 'abilities') {
                str = d[attr].replace(/'/g, '"');
                d[attr] = JSON.parse(str);
            } else if (attr != 'classfication' && attr != 'japanese_name' && attr != 'name' &&
                attr != 'type1' && attr != 'type2') {
                d[attr] = +d[attr];
            }
        });
        d.selected = 0;
    });

    filteredData = data;

    const types = Object.keys(colorMap);
    const colors = Object.values(colorMap);

    // Initialize scales for Pokemon types
    const colorScale = d3.scaleOrdinal()
        .range(colors)
        .domain(types);

    sortDataByType(data, 'type1');

    // Initialize chart instances with configurations and data
    forceDirectedGraph = new ForceDirectedGraph({
        parentElement: '#task1'
    }, data);
    forceDirectedGraph.updateVis();

    pointchart = new PointChart({
        parentElement: '#point-chart',
        colorScale: colorScale,
        maxPointsPerRow: maxPointsPerRow
    }, data, colorMap, clearDispatcher);
    pointchart.updateVis();

    totalBaseLineChart = new TotalBaseLineChart({
        parentElement: '#total-base-line-chart',
    }, []);
    totalBaseLineChart.updateVis();

    separateBaseLineChart = new SeparateBaseLineChart({
        parentElement: '#separate-base-line-chart',
    }, []);
    separateBaseLineChart.updateVis();

    heatmap = new Heatmap({
        parentElement: '#heatmap',
    }, data)
    heatmap.updateVis();

    bargraph = new BarGraph({
        parentElement: '#bar-graph',
        colorScale: colorScale,
    }, data);
    bargraph.renderEmptyVis();

    clearDispatcher.on('clearSelections', () => {
        clearSelectedPokemon();
        onHeatMapCellSelect([]);
    });

    // Event listener for generation selector changes
    d3.selectAll('#generation-selector').on('change', function() {
        let generation = d3.select(this).node().value;
        if (generation !== 'all') {
            generation = +generation;
            filterSelectedPokemon(generation);
            filteredData = data.filter(d => d.generation === generation);
            filterEvolutionChain();
        } else {
            filteredData = data;
        }

        pointchart.data = filteredData;
        forceDirectedGraph.data = filteredData;
        heatmap.data = filteredData;
        bargraph.data = filteredData;
        heatmap.selectedCell = []
        onHeatMapCellSelect(heatmap.selectedCell);
        updateAllVis(generation);
    });
});

// Function to clear selected Pokémon
function clearSelectedPokemon() {
    evolutionChainSelected = [];
    filteredData.forEach(d => d.selected = 0);
    filterSeparateLineChart(0);
    filterPokemon();
}

// Function to update all visualizations based on the current generation
function updateAllVis(generation) {
    forceDirectedGraph.updateVis();
    heatmap.updateVis();
    bargraph.updateVis();
    if (hexbinGraph && currentView === 'hexbin') {
        hexbinGraph.data = filterHexbinData();
    }
    if (linkedGraph && currentView === 'linked') {
        linkedGraph.data = filterLinkedData();
        linkedGraph.updateVis();
    }

    filterPokemon();
    filterSeparateLineChart(0);
    backToDirected();
}

// Function to update separate line chart
function filterSeparateLineChart(generation) {
    let tempData = separateBaseLineChart.data;
    separateBaseLineChart.data = tempData.filter(d => generation === 'all' || d.generation === generation);
    separateBaseLineChart.updateVis();
}

// Function to filter data
function filterSelectedPokemon(generation) {
    filteredData.forEach(d => {
        d.generation !== generation ? d.selected = 0 : null
    })
}

function filterEvolutionChain() {
    // only called when a specific generation is selected (ie. gen1, gen2, etc.)
    evolutionChainSelected = evolutionChainSelected.filter(item => filteredData.some(d => d.name === item));
}

// Function to filter pokemons
function filterPokemon() {
    // Create a data for storing evolution chains
    let filteredEvolutionChain = [];
    for (let d of evolutionChainSelected) {
        let filtered = evolutionData.filter(d1 => (d1.Basic === d) ||
            (d1.Stage1 === d) || (d1.Stage2 === d));
        if (filtered.length === 0) {
            filteredEvolutionChain.push({Basic: d, Stage1: "", Stage2: ""});
        } else {
            for (let i of filtered) {
                if (!filteredEvolutionChain.includes(i)) {
                    filteredEvolutionChain.push(i);
                }
            }
        }
    }

    // Get filtered data base on evolution chain data
    let pokemonFilteredData = [];
    for (let d of filteredEvolutionChain) {
        let temp = [];
        const basic = filteredData.filter(d1 => d1.name === d.Basic);
        basic.length > 0 && temp.push(basic[0]);

        if (d.Stage1 !== "") {
            const stage1 = filteredData.filter(d1 => d1.name === d.Stage1); 
            stage1.length > 0 && temp.push(stage1[0]);
        }

        if (d.Stage2 !== "") {
            const stage2 = filteredData.filter(d1 => d1.name === d.Stage2);
            stage2.length > 0 && temp.push(stage2[0]);
        }
        temp.length > 0 && pokemonFilteredData.push(temp);
    }

    // Update vis
    if (hexbinGraph && currentView === 'hexbin') {
        hexbinGraph.updateVis();
    }

    totalBaseLineChart.data = pokemonFilteredData;
    totalBaseLineChart.updateVis();
    
    pointchart.updateVis();
}

// To linked graph
function filterTypeToLinkedGraph() {
    currentView = 'linked';

    typeFilteredData = filterLinkedData();

    d3.select('#task1').selectAll("*").remove();
    d3.select('#tooltip').style('display', 'none');
    linkedGraph = new LinkedGraph({
        parentElement: '#task1'
    }, typeFilteredData);
    linkedGraph.updateVis();
}

function filterLinkedData() {
    let type = typeSelected[0];
    return filteredData.filter(d => d.type1 === type || d.type2 === type);
}

// To hexbin graph
function filterTypeToHexbinGraph() {
    currentView = 'hexbin';

    typeFilteredData = filterHexbinData();

    d3.select('#task1').selectAll("*").remove();
    d3.select('#tooltip').style('display', 'none');
    hexbinGraph = new HexbinGraph({
        parentElement: '#task1'
    }, typeFilteredData);
    hexbinGraph.updateVis();
}

function filterHexbinData() {
    let type1 = typeSelected[0];
    let type2 = typeSelected[1] === type1 ? '' : typeSelected[1];
    return filteredData.filter(d => (d.type1 === type1 && d.type2 === type2) || (d.type1 === type2 && d.type2 === type1));
}

// Back to force directed graph
function backToDirected() {
    currentView = 'directed';
    d3.select('#task1').selectAll("*").remove();
    d3.select('#tooltip').style('display', 'none');
    forceDirectedGraph = new ForceDirectedGraph({
        parentElement: '#task1'
    }, filteredData);
    forceDirectedGraph.updateVis();
}

// Function handle heatmap selection
function onHeatMapCellSelect(selectedCell) {
    if (selectedCell.length > 0) {
        bargraph.type = selectedCell[0];
        bargraph.againstType = selectedCell[1].substring(selectedCell[1].indexOf('_') + 1).trim();
        pointchart.types = [selectedCell[0]];
        typeSelected = [selectedCell[0]];
        filterTypeToLinkedGraph();

        filteredData.forEach(d => {
            if (d.type1 == selectedCell[0]) {
                d.selected = 1;
                evolutionChainSelected.push(d.name);
            }
        })
        filterPokemon();
    } else {
        bargraph.type = '';
        bargraph.againstType = '';
        pointchart.types = [];

        typeSelected = [];
        backToDirected();

        d3.selectAll('.highlighted-cell').classed('highlighted-cell', false);
        filteredData.forEach(d => {
            if (d.type1 == temp) {
                d.selected = 0;
                evolutionChainSelected = evolutionChainSelected.filter(item => item !== d.name);
            }
        });
        filterPokemon();
    }

    bargraph.updateVis();
    pointchart.updateVis();
    heatmap.updateVis();
}

// Sort data by type
function sortDataByType(data, type) {
    data.sort((a, b) => {
        if (a[type] < b[type]) {
            return -1;
        } else if (a[type] > b[type]) {
            return 1;
        }
        return 0;
    })
}