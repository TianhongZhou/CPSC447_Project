class TotalBaseLineChart {

  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 350,
      containerHeight: 350,
      margin: {
        top: 70,
        right: 40,
        bottom: 20,
        left: 70
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

    // Define value accessor for total base stats
    vis.yValue = d => d.base_total;

    // Flatten the data array for easier processing
    let temp = []

    vis.data.forEach(d => {
      for (let d1 of d) {
        temp.push(d1);
      }
    });

    // Set the domain for yScale based on data
    vis.yScale.domain([0, d3.max(temp, vis.yValue)]);

    // Prepare line data for Basic to Stage 1 and Stage 1 to Stage 2 transitions
    vis.linesBasicToStage1 = vis.data
      .filter(d => d.length > 1)
      .map(d => {
        return {
          x1: vis.xScale("Basic") + vis.xScale.bandwidth() / 2,
          y1: vis.yScale(vis.yValue(d[0])),
          x2: vis.xScale("Stage 1") + vis.xScale.bandwidth() / 2,
          y2: vis.yScale(vis.yValue(d[1]))
        };
      });

    vis.linesStage1ToStage2 = vis.data
      .filter(d => d.length > 2)
      .map(d => {
        return {
          x1: vis.xScale("Stage 1") + vis.xScale.bandwidth() / 2,
          y1: vis.yScale(vis.yValue(d[1])),
          x2: vis.xScale("Stage 2") + vis.xScale.bandwidth() / 2,
          y2: vis.yScale(vis.yValue(d[2]))
        };
      });

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // Clear previous elements like instructions, labels, and legends
    vis.svg.select('.instruction').remove();
    vis.svg.select('.xlabel').remove();
    vis.svg.select('.ylabel').remove();
    vis.svg.select('.title').remove();

    // Draw lines between evolutionary stages
    vis.chart.selectAll('.line-basic-stage1')
      .data(vis.linesBasicToStage1)
      .join('line')
      .attr('class', 'line-basic-stage1')
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5);

    vis.chart.selectAll('.line-stage1-stage2')
      .data(vis.linesStage1ToStage2)
      .join('line')
      .attr('class', 'line-stage1-stage2')
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5);

    // Draw points for each stage
    let point1 = vis.chart.selectAll('.basic_point')
      .data(vis.data)
      .join('circle')
      .attr('class', 'basic_point')
      .attr('r', 6)
      .attr('cy', d => vis.yScale(vis.yValue(d[0])))
      .attr('cx', vis.xScale("Basic") + vis.xScale.bandwidth() / 2)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('fill', d => {
        return vis.colorSet(d, 0);
      });
    vis.setupEventListeners(point1);

    let point2 = vis.chart.selectAll('.stage1_points')
      .data(vis.data.filter(d => d.length > 1))
      .join('circle')
      .attr('class', 'stage1_points')
      .attr('r', 6)
      .attr('cy', d => vis.yScale(vis.yValue(d[1])))
      .attr('cx', vis.xScale("Stage 1") + vis.xScale.bandwidth() / 2)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('fill', d => {
        return vis.colorSet(d, 1);
      });
    vis.setupEventListeners(point2);

    let point3 = vis.chart.selectAll('.stage2_points')
      .data(vis.data.filter(d => d.length > 2))
      .join('circle')
      .attr('class', 'stage2_points')
      .attr('r', 6)
      .attr('cy', d => vis.yScale(vis.yValue(d[2])))
      .attr('cx', vis.xScale("Stage 2") + vis.xScale.bandwidth() / 2)
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('fill', d => {
        return vis.colorSet(d, 2);
      });
    vis.setupEventListeners(point3);

    // Remove axes
    if (vis.xAxisG) {
      vis.xAxisG.remove();
    }
    if (vis.yAxisG) {
        vis.yAxisG.remove();
    }

    if (evolutionChainSelected.length === 0 || vis.data.length === 0) {
      // Add instructions
      vis.svg.append('text')
        .attr('class', 'instruction')
        .attr('x', vis.width / 2 - 50)
        .attr('y', vis.height / 2)
        .style('font-weight', 'bold')
        .text('Please select at least 1 Pokemon');
    } else {
      // Add axes
      vis.xAxisG = vis.chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${vis.height})`);

      vis.yAxisG = vis.chart.append('g')
        .attr('class', 'axis y-axis');

      vis.xAxisG.call(vis.xAxis);
      vis.yAxisG.call(vis.yAxis);

      // Add label
      vis.svg.append('text')
        .attr('class', 'xlabel')
        .attr('x', vis.width + 60)
        .attr('y', vis.height + 84)
        .style('font-weight', 'bold')
        .text('Stage');

      vis.svg.append('text')
        .attr('class', 'ylabel')
        .attr('x', 7)
        .attr('y', 55)
        .style('font-weight', 'bold')
        .text('Total Base Stats');

      vis.svg.append('text')
        .attr('class', 'title')
        .attr('x',vis.width / 2 - 100)
        .attr('y', 18)
        .style('font-weight', 'bold')
        .style('font-size', '18px')
        .text('Total Base Stats of Evolution Chains');
    }
    

  }

  // Setup event listeners for the selection (e.g., for tooltips)
  setupEventListeners(selection) {
    let vis = this;
    selection
      .on('mouseover', (event, d) => {
        let tooltipHtml = '';

        if (d.length >= 1 && d[0].name) {
          tooltipHtml += `<div class="info-tooltip-title">${d[0].name}: ${d[0].base_total}</div>`;
        }
        if (d.length >= 2 && d[1].name) {
          tooltipHtml += `<div class="info-tooltip-title">${d[1].name}: ${d[1].base_total}</div>`;
        }
        if (d.length >= 3 && d[2].name) {
          tooltipHtml += `<div class="info-tooltip-title">${d[2].name}: ${d[2].base_total}</div>`;
        }

        d3.select('#info-tooltip')
          .style('display', 'block')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
          .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
          .style('color', 'black')
          .html(tooltipHtml);
      })
      .on('mousemove', (event, d) => {
        d3.select('#info-tooltip')
          .style('display', 'block')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
          .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
      })
      .on('mouseleave', (event, d) => {
        d3.select('#info-tooltip').style('display', 'none');
      })
      .on('click', (event, d) => {
        separateBaseLineChart.data = d;
        separateBaseLineChart.updateVis();
      });
  }

  // Function to set color for points based on type
  colorSet(d, x) {
    let vis = this;

    let keys = [d[x].type1, d[x].type2];
    if (d[x].type2 == "") {
      keys[1] = keys[0];
    }
    let gradientId = `gradient-${keys.join('-')}`;
    let defs = vis.chart.append('defs');
    let gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    gradient.append('stop')
      .attr('offset', '25%')
      .attr('stop-color', colorMap[keys[0]]);
    gradient.append('stop')
      .attr('offset', '75%')
      .attr('stop-color', colorMap[keys[1]]);

    return `url(#${gradientId})`;
  }
}