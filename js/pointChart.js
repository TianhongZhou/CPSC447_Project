class PointChart {
    constructor(config, data, typesAndColors, clearDispatcher) {
        this.config = {
            parentElement: config.parentElement,
            colorScale: config.colorScale,
            containerWidth: 690,
            containerHeight: 300,
            legendHeight: 50,
            margin: {
                top: 50,
                right: 15,
                bottom: 20,
                left: 30
            },
            tooltipPadding: 10,
            maxPointsPerRow: config.maxPointsPerRow
        }
        this.data = data;
        this.typesAndColors = typesAndColors;
        this.types = [];
        this.clearDispatcher = clearDispatcher;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Calculate width and height for the chart area
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Initialize scales for x and y axis
        vis.xScale = d3.scaleLinear()
            .range([0, vis.width])

        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0])

        // Define X and Y axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(0);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(0)

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight + vis.config.legendHeight)
            .attr('id', 'point-chart');

        // Append a group element for the legend
        vis.legend = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`)

        // Append title text to the SVG
        vis.title = vis.svg.append('text')
            .attr('y', -18)
            .attr('x', vis.width / 2 - 90)
            .attr('dy', '2.5em')
            .attr('fill', 'black')
            .style('font-size', '18px')
            .attr('class', 'point-chart-title')
            .text('Pokémon Type Distribution I');

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append a rectangle for chart background with click listener
        vis.chart.append('rect')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.height)
            .attr('fill', 'transparent')
            .attr('class', 'click-listener');

        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height})`);

        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');

        vis.yAxisG.select('g').selectAll('.tick text').remove();

    }

    updateVis() {
        let vis = this;

        // Logic for positioning points in the chart
        let yIndex = 0;
        let xIndex = 0;
        vis.data.forEach(d => {
            if (xIndex >= maxPointsPerRow) {
                xIndex = 0;
                yIndex++;
            }
            d.xIndex = xIndex;
            d.yIndex = yIndex;
            xIndex++;
        });  

        // Set up color, x, and y value accessors for the points
        vis.colorValue = (d, type) => d[type];
        vis.xValue = d => d.xIndex;
        vis.yValue = d => d.yIndex;

        vis.xScale.domain([0, d3.max(vis.data, vis.xValue)]);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        // Click event listener for clearing selections
        vis.chart.selectAll('.click-listener')
            .on('click', (event, d) => {
                vis.clearDispatcher.call('clearSelections', event);
            })

        // Create and update circles for data points
        let circles = vis.chart.selectAll('.point')
            .data(vis.data)
            .join('circle')
            .attr('class', 'point')
            .attr('r', 4.5)
            .attr('cy', d => vis.yValue(d) * 17.3)
            .attr('cx', d => vis.xScale(vis.xValue(d)))
            .attr('fill', d => vis.config.colorScale(vis.colorValue(d, 'type1')))
            .attr('fill-opacity', d => vis.isType(d.type1) ? 1.0 : 0.35)
            .attr('stroke', d => d.selected === 1 ? 'black' : '#7d7d96')
            .attr('stroke-width', d => d.selected === 1 ? 2 : 0.5)

        // Tooltip event listeners
        circles
            .on('mouseover', (event, d) => {
                d3.select('#info-tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(`
            <div class="info-tooltip-title">${d.name}</div>
            <div><i>Generation ${d.generation}</i></div>
            <ul class="info-tooltip-list">
              <li>Primary Type: <text style=color:${vis.config.colorScale(vis.colorValue(d, 'type1'))}>${d.type1}</text></li>
              <li>Secondary Type: <text style=color:${d.type2 !== '' ? vis.config.colorScale(vis.colorValue(d, 'type2')) : '#000'}>
                ${d.type2 === '' ? 'N/A' : d.type2}
              </li>
            </ul>
          `);
            })
            .on('mouseleave', () => {
                d3.select('#info-tooltip').style('display', 'none');
            })
            .on('click', (event, d) => {
                if (d.selected === 1) {
                    d.selected = 0;
                    evolutionChainSelected = evolutionChainSelected.filter(item => item !== d.name);
                    let bool = 0;
                    separateBaseLineChart.data.forEach(d1 => {
                        if (evolutionChainSelected.includes(d1.name)) {
                            bool = 1;
                        }
                    })
                    if (!bool) {
                        separateBaseLineChart.data = [];
                    }
                } else {
                    d.selected = 1;
                    evolutionChainSelected.push(d.name);
                }
                filterPokemon();
                separateBaseLineChart.updateVis();
            });

        const types = Object.keys(vis.typesAndColors);
        const maxElements = 6;
        let pos = 0;
        let ind = 0;
        const typesObj = types.map((type, i) => {
            if (ind >= maxElements) {
                pos++;
                ind = 0;
            }
            return { type: type, xPos: ++ind * 90, yPos: pos * 20 };
        })

        // Create legends
        vis.legend.selectAll('.legend-points')
            .data(typesObj)
            .join('circle')
            .attr('class', 'legend-points')
            .attr('r', 7)
            .attr('cx', d => d.xPos - 10)
            .attr('cy', d => vis.height + 20 + d.yPos)
            .attr('fill', d => vis.config.colorScale(d.type))
            .attr('stroke', d => vis.isType(d.type) ? 'black' : '#7d7d96')
            .attr('stroke-width', d =>  vis.isType(d.type) ? 2 : 0.5)

        vis.legend.selectAll('.legend-labels')
            .data(typesObj)
            .join('text')
            .attr('class', 'legend-labels')
            .attr('x', d => d.xPos)
            .attr('y', d => vis.height + 25 + d.yPos)
            .attr('fill', d => vis.config.colorScale(d.type))
            .text(d => d.type.charAt(0).toUpperCase() + d.type.slice(1))

        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove()); // removes x-axis lines

        vis.yAxisG.call(vis.yAxis)
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove()) // removes y-axis lines
    }

    isType(type) {
        let vis = this;
        return vis.types.length != 0 && vis.types.includes(type);
    }
}