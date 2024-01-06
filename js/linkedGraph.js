class LinkedGraph {

    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     */
    constructor(_config, _data) {
        this.config = {
          parentElement: _config.parentElement,
          containerWidth: 350,
          containerHeight: 400,
          margin: {
            top: 20,
            right: 0,
            bottom: 20,
            left: 0
          },
          tooltipPadding: 5
        }
    
        this.data = _data;
    
        this.initVis();
      }
  
    initVis() {
      let vis = this;
      
      // Set width and height for the chart area
      vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
      vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

      // Scale for the radius of the circles in the graph
      vis.rScale = d3.scaleLinear()
        .range([6, 25]);
  
      // Append the SVG element to the parent element and set its dimensions
      vis.svg = d3.select(vis.config.parentElement)
          .attr('width', vis.config.containerWidth)
          .attr('height', vis.config.containerHeight);
  
      // Append a group element that will hold the chart
      vis.chart = vis.svg.append('g')
          .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
  
      // Create a background for the chart with an event listener
      vis.chartBackground = vis.chart.append('rect')
          .attr('width', vis.width)
          .attr('height', vis.height)
          .attr('fill', 'transparent')
          .on('click', () => {
            backToDirected();
      });
    }
  
    updateVis() {
        let vis = this;

        // Define the radius value function
        vis.rValue = d => d.r;
  
        // Aggregate and process data for the graph
        vis.aggregatedData = [];

        vis.data.forEach(d => {
            let types = new Set();
            types.add(d.type1)
            if (d.type2 != "") {
            types.add(d.type2);
            };

            let bool = false;

            vis.aggregatedData.forEach(d1 => {
            let key = d1.key;
            if (vis.compareSet(key, types)) {
                d1.count++;
                bool = true;
            };
            });

            if (!bool) {
            vis.aggregatedData.push({'key': types, 'count': 1});
            };
        });

        vis.aggregatedData.forEach((dataPoint, index) => {
            let radius = dataPoint.count;
            dataPoint.r = radius;
        });

        vis.rScale.domain([d3.min(vis.aggregatedData, vis.rValue), d3.max(vis.aggregatedData, vis.rValue)]);

        // Separate data into center and outer ones
        let centerData = vis.aggregatedData.find(d => d.key.size === 1);
        let outerData;

        if (!centerData) {
          centerData = vis.aggregatedData[0];
          outerData = vis.aggregatedData.filter((d, i) => i != 0);
        } else {
          outerData = vis.aggregatedData.filter(d => d.key.size === 2);
        }

        // Add position value to data
        let center = { x: vis.width / 2, y: vis.height / 2 };
        centerData.x = center.x;
        centerData.y = center.y;

        let orbitRadius = 140;

        let angleIncrement = (2 * Math.PI) / outerData.length;
        outerData.forEach((d, i) => {
            d.angle = i * angleIncrement;
            d.x = center.x + orbitRadius * Math.cos(d.angle);
            d.y = center.y + orbitRadius * Math.sin(d.angle);
        });

        vis.centerData = centerData;
        vis.outerData = outerData;

        vis.renderVis();
    }
  
    renderVis() {
        let vis = this;

        // Create and update lines connecting the data points
        vis.chart.selectAll('.link')
            .data(vis.outerData)
            .join('line')
            .attr('class', 'link')
            .attr('x1', vis.centerData.x)
            .attr('y1', vis.centerData.y)
            .attr('x2', d => d.x)
            .attr('y2', d => d.y)
            .attr('stroke', '#ccc');
        
        // Force center to be re-rendered to prevent lines from being "on top" when filtering
        vis.chart.selectAll('.center-type').remove();

        // Create and update circles for data points
        let center = vis.chart.selectAll('.center-type')
            .data([vis.centerData])
            .join('circle')
            .attr('class', 'center-type')
            .attr('r', d => vis.rScale(vis.rValue(d)))
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('stroke', 'grey')
            .attr('fill', d => vis.centerData.key && vis.centerData.key.size > 1 ? gradientFill(d) : colorMap[typeSelected])

        let outers = vis.chart.selectAll('.outer-type')
            .data(vis.outerData)
            .join('circle')
            .attr('class', 'outer-type')
            .attr('r', d => vis.rScale(vis.rValue(d)))
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('stroke', 'grey')
            .attr('fill', d => gradientFill(d))

        function gradientFill(d) {
          let keys = Array.from(d.key);
          let gradientId = `gradient-${keys.join('-')}`;
          let defs = vis.chart.append('defs');
          let gradient = defs.append('linearGradient')
              .attr('id', gradientId)
              .attr('x1', '0%').attr('y1', '0%')
              .attr('x2', '100%').attr('y2', '100%');
          gradient.append('stop')
              .attr('offset', '50%')
              .attr('stop-color', colorMap[keys[0]]);
          gradient.append('stop')
              .attr('offset', '50%')
              .attr('stop-color', colorMap[keys[1]]);

          return `url(#${gradientId})`;
        }

        // Add interactivity (mouseover, mousemove, click, etc.) to the elements
        center
          .on('mouseover', (event, d) => {
            let [type1, type2] = vis.centerData.key;
            let typeText = type2 ? `Type: ${type1.toUpperCase()}, ${type2.toUpperCase()}` : `Type: ${type1.toUpperCase()}`;
            let type = typeSelected[0];
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .style('color', colorMap[type])
              .html(`
                <div class="tooltip-type">${typeText}</div>
                <div class="tooltip-type">Total: ${d.count} Pokemons</div>
              `);
          })
          .on('mousemove', (event, d) => {
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
          })
          .on('mouseleave', (event, d) => {
            d3.select('#tooltip').style('display', 'none');
          })
          .on('click', (event, d) => {
            if (vis.centerData.key && vis.centerData.key.size > 1) {
              let [type1, type2] = vis.centerData.key;
              typeSelected = [type1, type2];
            } else {
              let [type] = vis.centerData.key;
              typeSelected = [type, ""];
            }
            filterTypeToHexbinGraph();
          });

        outers
          .on('mouseover', (event, d) => {
            let [type1, type2] = d.key;
            let type = typeSelected[0];
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .style('color', colorMap[type])
              .html(`
                <div class="tooltip-type">Type: ${type1.toUpperCase()}, ${type2.toUpperCase()}</div>
                <div class="tooltip-type">Total: ${d.count} Pokemons</div>
              `);
          })
          .on('mousemove', (event, d) => {
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px');
          })
          .on('mouseleave', (event, d) => {
            d3.select('#tooltip').style('display', 'none');
          })
          .on('click', (event, d) => {
            let [type1, type2] = d.key;
            typeSelected = [type1, type2];
            filterTypeToHexbinGraph();
          });

      // Append additional SVG elements or update existing ones (e.g., text labels)
      vis.chart.append('text')
          .attr('class', 'instruction')
          .attr('x', vis.width / 2 - 150)
          .attr('y', 10)
          .style('font-weight', 'bold')
          .style('font-size', '18px')
          .text('Double Type Pokémon Distribution');
    }

    // Helper function to compare sets
    compareSet(key, types) {
        if (key.size !== types.size) {
          return false;
        }
  
        for (let item of key) {
            if (!types.has(item)) {
                return false;
            }
        }
  
        return true;
      }
  }