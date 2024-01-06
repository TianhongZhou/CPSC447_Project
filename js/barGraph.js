class BarGraph {
    constructor(config, data) {
        this.config = {
            parentElement: config.parentElement,
            colorScale: config.colorScale,
            containerWidth: 200,
            containerHeight: 250,
            margin: {
                top: 60,
                right: 5,
                bottom: 30,
                left: 35
            },
            tooltipPadding: 5
        }
        this.data = data;
        this.type = '';
        this.againstType = '';
        this.subtitleText = '';
        this.typeCount = [];
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Calculate the width and height of the actual chart area
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Initialize scales
        vis.xScale = d3.scaleBand()
            .range([0, vis.width])
            .paddingOuter(0.1)
            .paddingInner(0.1);

        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0])

        // Define X and Y axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickFormat(d => d + 'x')
            .tickSize(0)

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(2)

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)
            .attr('id', 'bar-graph');

        // Append title text to the SVG
        vis.title = vis.svg.append('text')
            .attr('y', -10)
            .attr('x', 10)
            .attr('dy', '2.5em')
            .attr('fill', 'black')
            .attr('class', 'bar-graph-title')
            .text('Type Effectiveness Distribution');

        // Append subtitle text to the SVG
        vis.subtitle = vis.svg.append('text')
            .attr('y', 15)
            .attr('x', 20)
            .attr('dy', '2.5em')
            .attr('fill', 'black')
            .attr('class', 'bar-graph-subtitle')

        // Append axis
        vis.graph = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.xAxisG = vis.graph.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height})`);

        vis.xAxisTitle = vis.graph.append("text")
            .attr("y", vis.height - 5)
            .attr("x", vis.width / 2)
            .attr("dy", "2.5em")
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .style("font-size", "0.9em")
            .text("Type Effectiveness");

        vis.yAxisG = vis.graph.append('g')
            .attr('class', 'axis y-axis')
            .attr('transform', `translate(2, 0)`);

        vis.yAxisTitle = vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0)
            .attr("x", -vis.config.containerHeight / 2)
            .attr("dy", "1em")
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .style("font-size", "0.9em")
            .text("Number of Pokemons");
    }

    updateVis() {
        let vis = this;

        // Set subtitle font size
        vis.subtitle.style('font-size', '0.9em');

        // Roll up data by type
        const typeRollUp = d3.rollups(vis.data, v => v, d => d.type1);

        // Find the count for the selected type
        vis.typeCount = typeRollUp.find(item => item[0] === vis.type);
        if (vis.typeCount && vis.typeCount.length > 0) {
            vis.typeCount = vis.typeCount[1];
        } else {
            vis.typeCount = [];
        }

        // Roll up data for the effectiveness against selected type
        vis.againstCount = d3.rollups(vis.typeCount, v => v.length, d => d[`against_${vis.againstType}`]);
        vis.againstCount.sort();

        vis.colorValue = d => d.type1;

        // Update scales
        vis.xScale.domain(vis.againstCount.map(d => d[0]));
        vis.yScale.domain([0, d3.max(vis.againstCount, d => d[1])]);

        vis.renderVis();
    }

    // Method to render an empty visualization with a placeholder message
    renderEmptyVis() {
        let vis = this;
        vis.subtitle.text('Select a cell in the heatmap to continue');
        vis.subtitle.style('font-size', '9.5px');
    }

    renderVis() {
        let vis = this;

        // Update the subtitle text based on the selected types
        vis.subtitleText = vis.type.length > 0
            ? `${vis.capitalizeString(vis.againstType)} attacks ${vis.capitalizeString(vis.type)}`
            : 'Select a cell in the heatmap to continue';
        vis.subtitle.text(vis.subtitleText);
        vis.subtitle.style('font-size', '9.5px');

        // Bind data to the bars and create bar elements
        let bars = vis.graph.selectAll('.bar')
            .data(vis.againstCount)
            .join('rect')
            .attr('class', 'bar')
            .attr('width', vis.xScale.bandwidth())
            .attr('height', d => vis.height - vis.yScale(d[1])) // moving down by y translation
            .attr('x', d => vis.xScale(d[0]))
            .attr('y', d => vis.yScale(d[1]))
            .attr('fill', vis.config.colorScale(vis.type))
            .on('mouseover', (event, d) => {
                d3.select('#info-tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(`<div class="info-tooltip-title">Pokémons: ${d[1]}</div>`)
            })
            .on('mousemove', (event, d) => {
                d3.select('#info-tooltip')
                  .style('display', 'block')
                  .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
                  .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
            })
            .on('mouseleave', () => {
                d3.select('#info-tooltip').style('display', 'none');
            });

        vis.xAxisG.call(vis.xAxis)

        vis.yAxisG.call(vis.yAxis)
    }

    // Utility method to capitalize the first letter of a string
    capitalizeString(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}