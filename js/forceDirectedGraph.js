class ForceDirectedGraph {

    /**
     * Class constructor with initial configuration
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
      
      // Set width and height for chart
      vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
      vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
  
      // Append svg, chart and axis groups
      vis.svg = d3.select(vis.config.parentElement)
          .attr('width', vis.config.containerWidth)
          .attr('height', vis.config.containerHeight);
  
      vis.chart = vis.svg.append('g')
          .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
    }
  
    updateVis() {
      let vis = this;
      
      // Aggregate data by Pokémon type
      vis.aggregatedData = [
        {'key': 'grass', 'count': 0},
        {'key': 'poison', 'count': 0},
        {'key': 'fire', 'count': 0},
        {'key': 'flying', 'count': 0},
        {'key': 'water', 'count': 0},
        {'key': 'bug', 'count': 0},
        {'key': 'normal', 'count': 0},
        {'key': 'dark', 'count': 0},
        {'key': 'electric', 'count': 0},
        {'key': 'ground', 'count': 0},
        {'key': 'ice', 'count': 0},
        {'key': 'rock', 'count': 0},
        {'key': 'fairy', 'count': 0},
        {'key': 'fighting', 'count': 0},
        {'key': 'psychic', 'count': 0},
        {'key': 'steel', 'count': 0},
        {'key': 'ghost', 'count': 0},
        {'key': 'dragon', 'count': 0},
      ];

      vis.data.forEach(d => {
        vis.aggregatedData.forEach(d1 => {
          if (d1.key == d.type1 || d1.key == d.type2) {
            d1.count++;
          }
        });
      });

      const maxCount = Math.max(...vis.aggregatedData.map(obj => obj.count));
      const minCount = Math.min(...vis.aggregatedData.map(obj => obj.count));

      // Make the circle size proportional to the screen size
      const maxMinRatio = maxCount / minCount;
      const ratio = (maxCount - minCount > 15) && (maxCount / minCount < 5) ? maxMinRatio : maxCount >= 20 ? 6 : 8;
      
      // Add data like radius and positon to aggregated data
      vis.aggregatedData.forEach((dataPoint, index) => {
        let radius = Math.sqrt(dataPoint.count) * ratio;
        dataPoint.r = radius;
        dataPoint.cx = radius + Math.random() * (vis.width - 2 * radius);
        dataPoint.cy = radius + Math.random() * (vis.height - 2 * radius);
    
        let overlapping;
        do {
          overlapping = false;
          for (let i = 0; i < index; i++) {
            let otherCircle = vis.aggregatedData[i];
            if (vis.isOverlapping(dataPoint, otherCircle)) {
              overlapping = true;
              dataPoint.cx = radius + Math.random() * (vis.width - 2 * radius);
              dataPoint.cy = radius + Math.random() * (vis.height - 2 * radius);
              break;
            }
          }
        } while (overlapping);
      });

      // Create a force simulation for the nodes
      vis.forceSimulation = d3.forceSimulation(vis.aggregatedData)
        .force('charge', d3.forceManyBody().strength(30))
        .force('center', d3.forceCenter(vis.width / 2, vis.height / 2))
        .force('collision', d3.forceCollide().radius(d => d.r + 0.5))
        .on('tick', () => {
          vis.chart.selectAll('.types')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
      });
  
      vis.renderVis();
    }
  
    renderVis() {
      let vis = this;
      
      // Bind data to elements and create/update circles representing types
      let types = vis.chart.selectAll('.types')
          .data(vis.aggregatedData)
          .join('circle')
          .attr('class', 'types')
          .attr('r', d => d.r)
          .attr('cy', d => d.cx)
          .attr('cx', d => d.cy)
          .attr('stroke', 'grey')
          .attr('fill', d => colorMap[d.key]);

      // Add interactivity (drag, mouseover, etc.) to the elements
      types
          .call(d3.drag()
            .on('start', (event, d) => {
              if (!event.active) vis.forceSimulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = Math.max(Math.min(event.x, vis.width), 0);
              d.fy = Math.max(Math.min(event.y, vis.height), 0);
            })
            .on('end', (event, d) => {
              if (!event.active) this.forceSimulation.alphaTarget(0.1).restart();
              d.fx = null;
              d.fy = null;
            }))
          .on('mouseover', (event, d) => {
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .style('color', colorMap[d.key])
              .html(`
                <div class="tooltip-type">Type: ${d.key.toUpperCase()}</div>
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
            typeSelected = [d.key];
            filterTypeToLinkedGraph();
          });

      // Append additional SVG elements or update existing ones (e.g., text labels)
      vis.chart.append('text')
          .attr('class', 'instruction')
          .attr('x', vis.width / 2 - 120)
          .attr('y', 30)
          .style('font-weight', 'bold')
          .style('font-size', '18px')
          .text('Pokémon Type Distribution II');
    }

    // Helper function to check if two circles are overlapping
    isOverlapping(circle1, circle2) {
      let dx = circle1.cx - circle2.cx;
      let dy = circle1.cy - circle2.cy;
      let distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (circle1.r + circle2.r);
    }
  }