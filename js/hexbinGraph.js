class HexbinGraph {

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
  
      // Append the SVG element to the parent element and set its dimensions
      vis.svg = d3.select(vis.config.parentElement)
          .attr('width', vis.config.containerWidth)
          .attr('height', vis.config.containerHeight);
  
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

        // Define the categories and attributes for the hexagon vertices
        vis.categories = [
            { label: 'HP', color: 'hsl(0, 100%, 80%)', angle: 0, order: 0 }, 
            { label: 'ATTACK', color: 'hsl(39, 100%, 80%)', angle: 60, order: 1 },
            { label: 'SP_ATTACK', color: 'hsl(120, 100%, 80%)', angle: 120, order: 2 },
            { label: 'SPEED', color: 'hsl(270, 100%, 80%)', angle: 180, order: 3 },
            { label: 'DEFENSE', color: 'hsl(60, 100%, 80%)', angle: 240, order: 4 },
            { label: 'SP_DEFENSE', color: 'hsl(240, 100%, 80%)', angle: 300, order: 5 }
        ];

        vis.rectWidth = 140;
        vis.rectHeight = 16;

        vis.radius = 130

        // Calculate positions for each data point based on their attributes
        vis.offsetX = (Math.cos(30 * (Math.PI / 180)) * vis.rectWidth) / 2;
        vis.offsetY = (vis.rectHeight / 2) + (vis.rectWidth / 2) * Math.tan(30 * (Math.PI / 180));

        let hexagonVertices = vis.categories.map(c => {
            let angleRad = Math.PI / 180 * (c.angle - 90);
            return {
                x: vis.width / 2 + vis.radius * Math.cos(angleRad),
                y: vis.height / 2 + vis.radius * Math.sin(angleRad)
            };
        });
    
        for (let d of vis.data) {
            let sumValues = d3.sum(vis.categories, cat => +d[cat.label.toLowerCase()] || 0);
            let point = { x: vis.width / 2, y: vis.height / 2 };

            if (sumValues > 0) {
                let weightedPositions = { x: 0, y: 0 };
                let totalWeight = 0;

                for (let [index, cat] of vis.categories.entries()) {
                    let value = +d[cat.label.toLowerCase()] || 0;
                    let weight = Math.pow(value / sumValues, 1.5); 
                    weightedPositions.x += weight * hexagonVertices[index].x;
                    weightedPositions.y += weight * hexagonVertices[index].y;
                    totalWeight += weight;
                }

                if (totalWeight > 0) {
                    point.x = weightedPositions.x / totalWeight;
                    point.y = weightedPositions.y / totalWeight;
                }
            }

            d.x = point.x;
            d.y = point.y;
        }

        // Create a simulation for collision detection among points
        let simulation = d3.forceSimulation(vis.data)
        .force('collide', d3.forceCollide().radius(6))
        .stop();

        for (let i = 0; i < 120; i++) simulation.tick();

        vis.renderVis();
    }
  
    renderVis() {
        let vis = this;
        
        // Remove any existing instructions
        vis.chart.select('.instruction').remove();
    
        // Create and position category groups around the hexagon
        let categoryGroups = vis.chart.selectAll('.category-group')
        .data(vis.categories)
        .join('g')
        .attr('class', 'category-group')
        .attr('transform', (d) => {
            let angleRad = (d.angle - 90) * (Math.PI / 180);
            let x = vis.width / 2 + vis.radius * Math.cos(angleRad);
            let y = vis.height / 2 + vis.radius * Math.sin(angleRad);
            return `translate(${x}, ${y})`;
        });

        // Append hexagon categories with labels and styles
        categoryGroups.append('rect')
            .attr('width', vis.rectWidth)
            .attr('height', vis.rectHeight)
            .attr('fill', d => d.color)
            .attr('transform', d => `rotate(${d.angle})`)
            .attr('x', -vis.rectWidth / 2)
            .attr('y', -vis.rectHeight / 2)
            .attr('stroke', 'grey');

        categoryGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', 'black')
            .attr('transform', d => {
                let additionalRotation = ((d.order >= 2) && (d.order <= 4)) ? 180 : 0;
                return `translate(0, ${vis.rectHeight / 4 - 2}) rotate(${d.angle + additionalRotation})`;
            })
            .text(d => d.label);

        // Bind data to points and create/update circles representing data points
        let points = vis.chart.selectAll('.data-point')
            .data(vis.data)
            .join('circle')
            .attr('class', 'data-point')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', 6)
            .attr('stroke', d => (d.selected === 1) ? 'black' : 'grey')
            .attr('stroke-width', d => (d.selected === 1) ? 0.5 : 0.8)
            .attr('fill-opacity', d => (d.selected === 1) ? 1 : 0.6)
            .attr('fill', d => {
                let keys = typeSelected;
                if (keys[1] == "") {
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
              });

        // Add interactivity (mouseover, mousemove, click, etc.) to the elements
        points
            .on('mouseover', (event, d) => {
              d3.select('#info-tooltip')
                .style('display', 'block')
                .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
                .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                .style('color', 'black')
                .html(`
                  <div class="info-tooltip-title">${d.name}</div>
                  <div class="tooltip-type">HP: ${d.hp}</div>
                  <div class="tooltip-type">ATTACK: ${d.attack}</div>
                  <div class="tooltip-type">DEFENSE: ${d.defense}</div>
                  <div class="tooltip-type">SP_ATTACK: ${d.sp_attack}</div>
                  <div class="tooltip-type">SP_DEFENSE: ${d.sp_defense}</div>
                  <div class="tooltip-type">SPEED: ${d.speed}</div>
                `);
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

        // Append additional SVG elements or update existing ones (e.g., text labels)
        let type, padding;
        let selected = [];
        selected.push(typeSelected[0].charAt(0).toUpperCase() + typeSelected[0].slice(1));
        selected.push(typeSelected[1].charAt(0).toUpperCase() + typeSelected[1].slice(1));

        if (selected[0] != selected[1]) {
            type = selected[0] + " & " + selected[1];
            padding = 175;
        } else {
            type = selected[0];
            padding = 145;
        }

        vis.chart.append('text')
            .attr('class', 'instruction')
            .attr('x', vis.width / 2 - padding)
            .attr('y', 15)
            .style('font-weight', 'bold')
            .style('font-size', '14px')
            .text(type + ' Pokémon Base Stats Distribution');
    }
  }