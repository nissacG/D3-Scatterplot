d3.queue()
  .defer(d3.csv, "./CO2.csv", formatter)
  .defer(d3.csv, "./methane.csv", formatter)
  .defer(d3.csv, "./renew-energy.csv", formatter)
  .defer(d3.csv, "./urban.csv", formatter)
  .defer(d3.csv, "./pop.csv", formatter)
  .awaitAll(function(error, data){
  	if(error) throw error;

	let yearObj = formatAllData(data);

  	let width = 600;
	let height = 600;
	let padding = 100;
	let yearRange = d3.extent(Object.keys(yearObj).map(year => +year));

	let svg = d3.select("svg")
	            .attr("height", height)
	            .attr("width", width);

	// x axis
	svg.append("g")
	   .attr("transform", `translate(0,${height - padding + 20})`)
	   .classed("x-axis", true);

	// y axis
	svg.append("g")
	   .attr("transform", `translate(${padding - 20}, 0)`)
	   .classed("y-axis", true);

	// x axis label
	svg.append("text")
	   .attr("x", width/2)
	   .attr("y", height-padding)
	   .attr("dy", "4em")
	   .attr("text-anchor", "middle")
	   .text("CO2 Emissions (kt per person)");

	// y axis label
	svg.append("text")
	   .attr("transform", "rotate(-90)")
	    // due to rotation, x and y values are also altered.
	    // in this case, they are flipped and negated
	   .attr("x", -height/2)
	   .attr("y", padding)
	   .attr("dy", "-4em")
	   .attr("text-anchor", "middle")
	   .text("Methane Emissions (kt of CO2 equivalent per person)");

	// graph title
	svg.append("text")
	   .attr("x", width/2)
	   .attr("y", 0)
	   .attr("dy", ".9em")
	   .style("text-anchor", "middle")
	   .style("font-size", "1.5em")
	   .classed("title", true);
	   

	d3.select("input")
	    .property("min", yearRange[0])
	    .property("max", yearRange[1])
	    .property("value", yearRange[0])
	    .on("input", () => drawGraph(+d3.event.target.value));

	drawGraph(yearRange[0]);

	function drawGraph(year){
		let data = yearObj[year];
		let yScale = d3.scaleLinear()
				   .domain(d3.extent(data, d=>d.methane / d.population))
				   .range([height-padding, padding]);

		let xScale = d3.scaleLinear()
					   .domain(d3.extent(data, d=>d.co2 / d.population))
					   .range([padding, width-padding]);

		let colorScale = d3.scaleLinear()
		// 			 	   .domain([0, 100])
					 	   .domain(d3.extent(data, d=> d.renewable))
					 	   .range(["#000", "green"]);

		let radiusScale = d3.scaleLinear()
							.domain([0,1])
							.range([5, 20]);

		d3.select(".x-axis")
		  .call(d3.axisBottom(xScale));

		d3.select(".y-axis")
		  .call(d3.axisLeft(yScale));

		d3.select(".title")
		  .text(`Methane vs. CO2 emissions per capita (${year})`);

	    let update = svg.selectAll("circle")
	    			   .data(data, d=> d.region);

	    update.exit()
	    	  .transition()
	    	    .duration(500)
	    	    .attr("r", 0)
	    	  .remove();

	    update.enter()
	    	  .append("circle")
	    	    .attr("cx", d => xScale(d.co2 / d.population))
	       	    .attr("cy", d => yScale(d.methane / d.population))
	       	    .attr("stroke", "#fff")
	       	    .attr("stroke-width", 1)
				  .on("mousemove touchstart", showToolTip)
  				  .on("mouseout touchend", hideToolTip)
	       	  .merge(update)
				.transition()
	    	    .duration(500)
	    	    .delay((d, i) => i * 5)
	       	      .attr("cx", d => xScale(d.co2 / d.population))
	       	      .attr("cy", d => yScale(d.methane / d.population))
	       	      .attr("r", d => radiusScale(d.urban / d.population))
	       		  .attr("fill", d=> colorScale(d.renewable));
    }

    // show/hide helpers
	function showToolTip(d) {
		let tooltip = d3.select(".tooltip");
	  	tooltip
		    // change opacity from 0 to 1 (from css file) so visible
		    .style("opacity", 1)
		    // position tooltip div depending on mouse location (based on position: absolute in css)
		    // and then use the width of the div (gathered from tooltop.node to offset to center)
		    .style("left", `${d3.event.x - tooltip.node().offsetWidth / 2}px`)
		    // move tooltip down slightly too
		    .style("top", `${d3.event.y + 25}px`)
		    //using template strings and html so clear info and no long, concatinated strings
		    //also , use built in javascript method toLocaleString() to make long numbers into easier to read integars
		    .html(`
		      <p>Region: ${d.region}</p>
		      <p>Urban Population: ${(d.urban / d.population *100).toFixed(2)}%</p>
		      <p>CO2 per Capita: ${(d.co2 / d.population).toFixed(4)}%</p>
		      <p>Methane per Capita: ${(d.methane / d.population).toFixed(4)}%</p>
		      <p>Renewable Energy: ${d.renewable.toFixed(2)}%</p>`);
	}

	function hideToolTip() {
		d3.select(".tooltip")
	      .style("opacity", 0); 
	}

    function formatAllData(data) {
      let yearObj = {};
      data.forEach(function(arr) {
        // get the indicator and format the key
        let indicator = arr[0].indicator.split(" ")[0].replace(",","").toLowerCase();
        arr.forEach(function(obj) {
          // get current region
          let region = obj.region;
          // parse through every year, add that region's data to that year array
          for (let year in obj) {
            if (parseInt(year)) {
              if (!yearObj[year]) yearObj[year] = [];
              let yearArr = yearObj[year];
              let regionObj = yearArr.find(el => el.region === region);
              if (regionObj) regionObj[indicator] = obj[year];
              else {
                let newObj = {region: region};
                newObj[indicator] = obj[year];
                yearArr.push(newObj);
              }
            }
          }
        })
      });
      // remove years that don't have complete data sets for any region
      for (var year in yearObj) {
        yearObj[year] = yearObj[year].filter(validRegion);
        if (yearObj[year].length === 0) delete yearObj[year];
      }
      return yearObj;
    }

  	function validRegion(d){
  		for(var key in d){
  			if(d[key] === null) return false;
  		}
  		return true;
  	}
  });


function formatter (row){
	var invalidRows = [
    "Arab World", 
    "Central Europe and the Baltics",
    "Caribbean small states",
    "East Asia & Pacific (excluding high income)",
    "Early-demographic dividend",
    "East Asia & Pacific",
    "Europe & Central Asia (excluding high income)",
    "Europe & Central Asia",
    "Euro area",
    "European Union",
    "Fragile and conflict affected situations",
    "High income",
    "Heavily indebted poor countries (HIPC)",
    "IBRD only",
    "IDA & IBRD total",
    "IDA total",
    "IDA blend",
    "IDA only",
    "Not classified",
    "Latin America & Caribbean (excluding high income)",
    "Latin America & Caribbean",
    "Least developed countries: UN classification",
    "Low income",
    "Lower middle income",
    "Low & middle income",
    "Late-demographic dividend",
    "Middle East & North Africa",
    "Middle income",
    "Middle East & North Africa (excluding high income)",
    "North America",
    "OECD members",
    "Other small states",
    "Pre-demographic dividend",
    "Pacific island small states",
    "Post-demographic dividend",
    "Sub-Saharan Africa (excluding high income)",
    "Sub-Saharan Africa",
    "Small states",
    "East Asia & Pacific (IDA & IBRD countries)",
    "Europe & Central Asia (IDA & IBRD countries)",
    "Latin America & the Caribbean (IDA & IBRD countries)",
    "Middle East & North Africa (IDA & IBRD countries)",
    "South Asia (IDA & IBRD)",
    "Sub-Saharan Africa (IDA & IBRD countries)",
    "Upper middle income",
    "World"
  ];
	let obj = {
		region: row["Country Name"],
		indicator: row["Indicator Name"]
	}
	if (invalidRows.indexOf(obj.region) > -1) return;
	for(var key in row){
		if(parseInt(key)) obj[key] = +row[key] || null;
	}
	return obj;
}
