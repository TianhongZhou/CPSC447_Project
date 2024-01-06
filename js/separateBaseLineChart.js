class SeparateBaseLineChart {

    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 400,
            containerHeight: 350,
            margin: {
              top: 70,
              right: 50,
              bottom: 20,
              left: 80
            },
            tooltipPadding: 5
          }

        this.data = _data;

        this.initVis();
    }

    initVis() {
        let vis = this;

        // Calculate width and height for the chart area
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Initialize scales for y-axis and x-axis
        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xScale = d3.scaleBand()
            .domain(["Basic", "Stage 1", "Stage 2"])
            .range([0, vis.width])
            .paddingInner(0.2);

        // Define X and Y axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(5)
            .tickSizeOuter(0);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .ticks(6)
            .tickSizeOuter(0);

        // Create SVG element for the chart
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
    }

    updateVis() {
        let vis = this;

        // Define value accessors for various Pokémon stats
        vis.yValue1 = d => d.hp;
        vis.yValue2 = d => d.attack;
        vis.yValue3 = d => d.defense;
        vis.yValue4 = d => d.sp_attack;
        vis.yValue5 = d => d.sp_defense;
        vis.yValue6 = d => d.speed;

        let yValueFunctions = [
            vis.yValue1,
            vis.yValue2,
            vis.yValue3,
            vis.yValue4,
            vis.yValue5,
            vis.yValue6
        ];

        let maxValues = vis.data.map(d => {
            return d3.max(yValueFunctions, fn => fn(d));
        });

        // Calculate maximum values and scale domain
        let overallMax = d3.max(maxValues);
        vis.yScale.domain([0, overallMax]);

        let stageXCoordinates = {
            'Basic': vis.xScale('Basic') + vis.xScale.bandwidth() / 2,
            'Stage 1': vis.xScale('Stage 1') + vis.xScale.bandwidth() / 2,
            'Stage 2': vis.xScale('Stage 2') + vis.xScale.bandwidth() / 2
        };

        // Prepare data for points and lines in the chart
        vis.pointsData = [];
        vis.data.forEach((d, index) => {
            yValueFunctions.forEach((yValueFn, index1) => {
                let stages = ['Basic', 'Stage 1', 'Stage 2'];
                let stage = stages[index];

                vis.pointsData.push({
                    x: vis.xScale(stage) + vis.xScale.bandwidth() / 2,
                    y: vis.yScale(yValueFn(d)),
                    attribute: index1,
                    data: d
                });
            });
        });

        vis.linesData = [];
        if (vis.data.length === 2) {
            for (let i = 0; i < 6; i++) {
                vis.linesData.push({
                    source: vis.pointsData[i],
                    target: vis.pointsData[i + 6]
                });
            };
        } else if (vis.data.length === 3) {
            for (let i = 0; i < 6; i++) {
                vis.linesData.push({
                    source: vis.pointsData[i],
                    target: vis.pointsData[i + 6]
                });
                vis.linesData.push({
                    source: vis.pointsData[i + 6],
                    target: vis.pointsData[i + 12]
                });
            };
        }

        // Define categories for base stats (e.g., HP, Attack, Defense)
        vis.categories = [
            { label: 'HP', color: 'hsl(0, 100%, 80%)', number: 0, selected: 0 },
            { label: 'ATK', color: 'hsl(39, 100%, 80%)', number: 1, selected: 0 },
            { label: 'DEF', color: 'hsl(60, 100%, 80%)', number: 2, selected: 0 },
            { label: 'SP_ATK', color: 'hsl(120, 100%, 80%)', number: 3, selected: 0 },
            { label: 'SP_DEF', color: 'hsl(240, 100%, 80%)', number: 4, selected: 0 },
            { label: 'SPD', color: 'hsl(270, 100%, 80%)', number: 5, selected: 0 }
        ];

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        // Clear previous elements like instructions, labels, and legends
        vis.svg.select('.instruction').remove();
        vis.svg.select('.xlabel').remove();
        vis.svg.select('.ylabel').remove();
        vis.svg.select('.title').remove();
        vis.svg.selectAll('.legend-points').remove();
        vis.svg.selectAll('.legend-labels').remove();

        // Draw lines between stages
        vis.chart.selectAll('.line-between-stages')
            .data(vis.linesData)
            .join('line')
            .attr('class', 'line-between-stages')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .attr('stroke', 'grey')
            .attr('stroke-width', 0.5);

        // Draw points for each stage
        vis.pointsData.sort((a, b) => {
                if (vis.categories[a.attribute].selected === 1 && vis.categories[b.attribute].selected !== 1) {
                    return 1;
                } else if (vis.categories[a.attribute].selected !== 1 && vis.categories[b.attribute].selected === 1) {
                    return -1;
                } else {
                    return 0;
                }
            });

        vis.chart.selectAll('.stage-point')
            .data(vis.pointsData)
            .join('circle')
            .attr('class', d => 'stage-point stage-' + d.stage)
            .attr('r', 6)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('fill', d => vis.categories[d.attribute].color)
            .attr('stroke', d => vis.categories[d.attribute].selected === 1 ? 'black' : 'grey')
            .attr('stroke-width', d => vis.categories[d.attribute].selected === 1 ? 1.5 : 0.5);

        // Remove axis
        if (vis.xAxisG) {
            vis.xAxisG.remove();
        }
        if (vis.yAxisG) {
            vis.yAxisG.remove();
        }
        if (evolutionChainSelected.length === 0 || vis.data.length === 0) {
            // Add instruction
            vis.svg.append('text')
                .attr('class', 'instruction')
                .attr('x', vis.width / 2 - 50)
                .attr('y', vis.height / 2)
                .style('font-weight', 'bold')
                .text('Please select at least 1 Pokemon');
        } else {
            // Draw axes
            vis.xAxisG = vis.chart.append('g')
                .attr('class', 'axis x-axis')
                .attr('transform', `translate(0,${vis.height})`);
    
            vis.yAxisG = vis.chart.append('g')
                .attr('class', 'axis y-axis');
                
            vis.xAxisG.call(vis.xAxis);
            vis.yAxisG.call(vis.yAxis);

            // Add labels
            vis.svg.append('text')
                .attr('class', 'xlabel')
                .attr('x', vis.width + 60)
                .attr('y', vis.height + 84)
                .style('font-weight', 'bold')
                .text('Stage');

            vis.svg.append('text')
                .attr('class', 'ylabel')
                .attr('x', 25)
                .attr('y', 55)
                .style('font-weight', 'bold')
                .text('Base Stats');

            vis.svg.append('text')
                .attr('class', 'title')
                .attr('x',vis.width / 2 - 120)
                .attr('y', 18)
                .style('font-weight', 'bold')
                .style('font-size', '16px')
                .text('Separate Base Stats of Chosen Evolution Chain');

            // Add legends
            vis.chart.selectAll('.legend-points')
                .data(vis.categories)
                .join('circle')
                .attr('class', 'legend-points')
                .attr('r', 6)
                .attr('cx', vis.width - 25)
                .attr('cy', d => vis.height - 20 - (5 - d.number) * 20)
                .attr('fill', d => d.color)
                .attr('stroke', d => d.selected === 1 ? 'black' : 'grey')
                .attr('stroke-width', d => d.selected === 1 ? 1.5 : 0.5)
                .on('click', (event, d) => {
                    vis.categories.forEach(data => {
                        if (d.selected) {
                            data.selected = 0;
                        } else {
                            data.label === d.label ? data.selected = 1 : data.selected = 0;
                        }
                    })
                    vis.renderVis();
                });

            vis.chart.selectAll('.legend-labels')
                .data(vis.categories)
                .join('text')
                .attr('class', 'legend-labels')
                .attr('x', vis.width - 12)
                .attr('y', d => vis.height - 16 - (5 - d.number) * 20)
                .attr('fill', 'black')
                .text(d => d.label);
        }
    }
}