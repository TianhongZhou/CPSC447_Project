class Heatmap {
    /**
     * Class constructor with initial configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 630,
            containerHeight: 340,
            tooltipPadding: 15,
            margin: { top: 60, right: 20, bottom: 80, left: 60 },
            legendWidth: 140,
            legendBarHeight: 10
        }
        this.data = _data;
        this.selectedCell = [];
        this.initVis();
    }

    /**
     * We create the SVG area, initialize scales/axes, and append static elements
     */
    initVis() {
        const vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart
        vis.config.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.config.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chartArea = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.chart = vis.chartArea.append('g');

        // Initialize scales
        vis.colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateReds);

        vis.xScale = d3.scaleBand()
            .range([0, vis.config.width]);

        vis.yScale = d3.scaleBand()
            .range([0, vis.config.height])
            .paddingInner(0.2);

        // Initialize y-axis
        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(0)
            .tickPadding(10);

        // Initialize x-axis
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(0)
            .tickPadding(10);

        // Append empty x-axis group 
        vis.xAxisG = vis.chartArea.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.config.height})`);

        vis.yAxisG = vis.chartArea.append('g')
            .attr('class', 'axis y-axis');

        // Legend
        const legendLeftPadding = 26;
        const legendTopPadding = 20;

        vis.legend = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.containerWidth - vis.config.legendWidth - vis.config.margin.right - legendLeftPadding},${legendTopPadding})`);


        vis.legendColorGradient = vis.legend.append('defs').append('linearGradient')
            .attr('id', 'linear-gradient');

        vis.legendColorRamp = vis.legend.append('rect')
            .attr('width', vis.config.legendWidth)
            .attr('height', vis.config.legendBarHeight)
            .attr('fill', 'url(#linear-gradient)');

        vis.xLegendScale = d3.scaleLinear()
            .range([0, vis.config.legendWidth]);

        vis.xLegendAxis = d3.axisBottom(vis.xLegendScale)
            .tickSize(vis.config.legendBarHeight + 3)
            .tickFormat(d3.format('d'));

        vis.xLegendAxisG = vis.legend.append('g')
            .attr('class', 'axis x-axis legend-axis');


        vis.svg.append('text')
            .attr('x', vis.config.containerWidth / 2)
            .attr('y', vis.config.margin.top / 1.5)
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .style('font-size', '18px')
            .text('Pokémon Strength');

        // Append y-axis label
        vis.svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -(vis.config.containerHeight / 2))
            .attr('y', vis.config.margin.left / 6)
            .style('text-anchor', 'middle')
            .text('Type');

        // Append x-axis label
        vis.svg.append('text')
            .attr('x', vis.config.containerWidth / 2)
            .attr('y', vis.config.containerHeight - vis.config.margin.bottom / 20)
            .style('text-anchor', 'middle')
            .text('Strength');

        vis.updateVis();
    }

    /**
     * Prepare the data and scales before we render it.
     */
    updateVis() {
        const vis = this;

        var groupedData = d3.group(vis.data, d => d.type1);

        // Sum and average the "against_X" columns for each group
        vis.aggregatedData = Array.from(groupedData, ([type1, group]) => {
            var sumObject = {};
            var countObject = {};

            group.forEach(function (d) {
                for (var key in d) {
                    if (key.startsWith('against_')) {
                        sumObject[key] = (sumObject[key] || 0) + d[key];
                        countObject[key] = (countObject[key] || 0) + 1;
                    }
                }
            });

            // Calculate the average for each "against_X" column
            for (var key in sumObject) {
                sumObject[key] /= countObject[key];
            }

            return { type1: type1, ...sumObject };
        });

        vis.columns = Object.keys(vis.aggregatedData[0]).filter(function (d) {
            return d !== 'type1';
        });

        // Specificy accessor functions
        vis.yValue = d => d.type1;
        vis.xValue = d => d.key;

        // Set the scale input domains
        // Extract all numeric properties excluding 'type1'
        const numericProperties = Object.keys(vis.aggregatedData[0]).filter(key => key !== 'type1');

        // Calculate the minimum and maximum values across all numeric properties
        const minValue = d3.min(vis.aggregatedData, d => d3.min(numericProperties, prop => d[prop]));
        const maxValue = d3.max(vis.aggregatedData, d => d3.max(numericProperties, prop => d[prop]));

        // Update color scale domain
        vis.colorScale.domain([minValue, maxValue]);

        vis.new_columns = [];
        vis.columns.forEach(d => {
            vis.new_columns.push(d.replace("_", " "));
        });

        vis.xScale.domain(vis.columns);
        vis.xAxis.tickValues(vis.columns);
        vis.yScale.domain(vis.aggregatedData.map(d => d.type1));
        vis.yAxis.tickValues(vis.aggregatedData.map(d => d.type1));

        vis.renderVis();
        vis.renderLegend();
    }

    /**
     * Bind data to visual elements.
     */
    renderVis() {
        const vis = this;

        const rows = vis.chart
            .selectAll('g.row')
            .data(vis.aggregatedData);

        rows.enter()
            .append('g')
            .attr('class', 'row')
            .merge(rows)
            .selectAll('rect')
            .data(function (d) {
                return vis.columns.map((key) => ({ key, value: d[key], type1: d.type1 }));
            })
            .enter()
            .append('rect')
            .merge(rows.selectAll('rect'))
            .attr('x', function (d) {
                return vis.xScale(vis.xValue(d));
            })
            .attr('y', function (d) {
                return vis.yScale(vis.yValue(d));
            })
            .attr('width', vis.xScale.bandwidth())
            .attr('height', vis.yScale.bandwidth())
            .style('fill', function (d) {
                return vis.colorScale(d.value);
            })
            .on('mouseover', function (event, d) {
                const tooltipContent = `<strong>${d.type1}</strong><br>${d.key}: ${d.value}`;

                d3.select('#heatmap-tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(tooltipContent);
            })
            .on('mouseleave', () => {
                d3.select('#heatmap-tooltip').style('display', 'none');
            })
            .on('click', (event, d) => {
                d3.selectAll('.highlighted-cell').classed('highlighted-cell', false);

                if (vis.selectedCell[0] === d.type1 && vis.selectedCell[1] === d.key) {
                    temp = vis.selectedCell[0];
                    vis.selectedCell = [];
                    onHeatMapCellSelect(vis.selectedCell);
                } else {
                    vis.selectedCell = [d.type1, d.key, event, d];
                    onHeatMapCellSelect(vis.selectedCell);

                    d3.select(event.currentTarget).classed('highlighted-cell', true);
                }
            });

        rows.exit().remove();

        vis.xScale.domain(vis.new_columns);
        vis.xAxis.tickValues(vis.new_columns);
        vis.xAxisG.call(vis.xAxis);

        vis.xAxisG.selectAll('.tick text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        vis.yAxisG.call(vis.yAxis);
    }


    // Update colour legend
    renderLegend() {
        const vis = this;
        // Add stops to the gradient
        vis.legendColorGradient.selectAll('stop')
            .data(vis.colorScale.range())
            .join('stop')
            .attr('offset', (d, i) => i / (vis.colorScale.range().length - 1))
            .attr('stop-color', d => d);

        // Set x-scale 
        vis.xLegendScale.domain(vis.colorScale.domain()).nice();
        const extent = vis.xLegendScale.domain();

        // Calculate ticks evenly between the extent
        const tickValues = d3.range(extent[0], extent[1] + 0.1, (extent[1] - extent[0]) / 4).map(val => Math.min(val, extent[1]));

        // Manually calculate tick values
        vis.xLegendAxis.tickValues(tickValues);

        // Update legend axis
        vis.xLegendAxisG.call(vis.xLegendAxis);

        // Append labels beside 0 and 4 ticks
        vis.legend.append('text')
            .attr('x', -5)
            .attr('y', vis.config.legendBarHeight / 2)
            .attr('text-anchor', 'end')
            .style('font-size', '10px')
            .text('weaker');

        vis.legend.append('text')
            .attr('x', vis.config.legendWidth + 5)
            .attr('y', vis.config.legendBarHeight / 2)
            .style('font-size', '10px')
            .text('stronger');

        // Update legend axis
        vis.xLegendAxisG.call(vis.xLegendAxis);
    }
}