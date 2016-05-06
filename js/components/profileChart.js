"use strict";
define(['knockout','d3', 'lodash'], function (ko, d3, _) {
  window.d3 = d3;
  var width = 400;
  var height = 450;
  var lineHeight = 20;

  var x = d=>{
    if (!d) debugger;
    //return d.startDate;
    return d.startDay;
  };
  var y = d=>d.recordType;
  var tipText = d=>d.conceptName;
  var pointClass = d=>d.recordType;
  var radius = d=>2;
  function circle(datum) {
    var g = d3.select(this);
    g.selectAll('circle.' + pointClass(datum))
      .data([datum])
      .enter()
      .append('circle')
        .classed(pointClass(datum), true);
    g.selectAll('circle.' + pointClass(datum))
      .attr('r', radius(datum))
      //.attr('fill', 'blue');
  }
  function triangle(datum) {
    var g = d3.select(this);
    g.selectAll('path.' + pointClass(datum))
      .data([datum])
      .enter()
      .append('path')
        .attr('d', 'M 0 -3 L -3 3 L 3 3 Z')
        .classed(pointClass(datum), true);
    //g.selectAll('path.' + pointClass(datum))
      //.attr('r', radius(datum))
      //.attr('fill', 'blue');
  }
  ko.bindingHandlers.profileChart = {
    init: function (element, valueAccessor, allBindingsAccessor) {
      //var profile = valueAccessor().profile;
      //var filteredData = valueAccessor().filteredData;
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
      var va = valueAccessor();
      if (va.facetFilteredData() && va.profile()
          && va.allData().length === va.profileZoom()().length
         )
        categoryScatterPlot(element, va.facetFilteredData(), 
                            x, y, tipText, pointClass, triangle,
                           null, va.allData(), null, va.profileZoom);
                    // va.profile(), va.cohortPerson());
      //console.log(va.profile());
      //debugger;
    }
  };
});
function categoryScatterPlot(element, points, x, y, tipText, 
                             pointClass,
                             pointFunc,
                             verticalLines, allPoints, highlighPoints,
                             profileZoomSetRecs ) {
  /* verticleLines: [{xpos, color},...] */
  var categories = _.chain(points).map(y).uniq().value();
  var catLineHeight = 28;
  var mainHeight = categories.length * 28;
  var margin = {
      top: 10,
      right: 10,
      bottom: 30,
      left: 10
    };
  //var height = recordTypes.length * 35 - margin.top - margin.bottom;
  var brushWindowHeight = 50;
  var margin2 = {
      top: 10,
      right: 10,
      bottom: 20,
      left: 10
    },
    width = 900 - margin.left - margin.right;

  var 
    //xScale = d3.time.scale().range([0, width]),
    //x2Scale = d3.time.scale().range([0, width]),
    xScale = d3.scale.linear().range([0, width]),
    x2Scale = d3.scale.linear().range([0, width]),
    yScale = d3.scale.ordinal().rangePoints([mainHeight * .9, mainHeight * .1]),
    y2Scale = d3.scale.ordinal().rangePoints([brushWindowHeight * .9, brushWindowHeight * .1]);

  //xScale.domain([profile.startDate, profile.endDate]);
  //xScale.domain(d3.extent(points.map(x)));
  xScale.domain(d3.extent(allPoints.map(x)));
  yScale.domain(categories);
  //x2Scale.domain(xScale.domain());
  x2Scale.domain(d3.extent(allPoints.map(x)));
  y2Scale.domain(yScale.domain());

  //$('#scatter').empty();
  $(element).empty();

  var svg = d3.select(element).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", mainHeight + margin.top + margin.bottom +
                    brushWindowHeight + margin2.top + margin2.bottom);

  var focus = svg.append("g")
    //.attr("class", "focus")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var context = svg.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + margin2.left + "," + 
          (mainHeight + margin.top + margin.bottom + margin2.top) + ")");

  var xAxis = d3.svg.axis().scale(xScale).orient("bottom"),
    xAxis2 = d3.svg.axis().scale(x2Scale).orient("bottom"),
    yAxis = d3.svg.axis().scale(yScale).orient("left");

  var brushed = function () {
    xScale.domain(brush.empty() ? x2Scale.domain() : brush.extent());
    focus.selectAll('g.point')
      .attr("transform", function(d) {
        return "translate(" + xScale(x(d)) + "," + yScale(y(d)) + ")";
      })
    //var member = self.members()[self.currentMemberIndex];
    focus.selectAll("line.index")  // not drawing vertLines right now
      .attr('x1', function (d) {
        return xScale(d)
      })
      .attr('y1', 0)
      .attr('x2', function (d) {
        return xScale(d)
      })
      .attr('y2', mainHeight)
    xAxis = d3.svg.axis().scale(xScale).orient("bottom");
    focus.select(".x.axis").call(xAxis);
  }

  var brush = d3.svg.brush()
    .x(x2Scale)
    .on("brush", brushed)
    .on("brushend", function() {
      if (brush.empty()) {
        profileZoomSetRecs(allPoints);
      } else {
        var zoomedRecs = allPoints.filter(function(d) {
          return x(d) >= brush.extent()[0] && x(d) <= brush.extent()[1];
        });
        profileZoomSetRecs(zoomedRecs);
      }
    });

  var focusTip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function (d) {
      return tipText(d);
    });

  svg.call(focusTip);

  // place your data into the focus area
  var pointGs = focus.selectAll("g.point")
    .data(points);
  pointGs.exit().remove();
  pointGs
    .enter()
    .append("g")
      .classed('point', true);
  focus.selectAll("g.point")
    .attr("transform", function(d) {
      return "translate(" + xScale(x(d)) + "," + yScale(y(d)) + ")";
    })
    .attr('class', function (d) {
      return pointClass(d);
    })
    .classed('point', true)
    .on('mouseover', function (d) {
      focusTip.show(d);
    })
    .on('mouseout', function (d) {
      focusTip.hide(d);
    })
    .each(pointFunc);

  categories.forEach(function(category) {
    focus.append("text")
          .text(category)
          .attr('class', category)
          .attr('x', 0)
          .attr('y', yScale(category) - 5)
  });

  context.selectAll("rect")
    .data(allPoints)
    .enter()
    .append("rect")
    .attr('x', function (d) {
      return x2Scale(x(d));
    })
    .attr('y', function (d) {
      return y2Scale(y(d));
    })
    .attr('width', 2)
    .attr('height', 2)
    .attr('class', function (d) {
      return pointClass(d);
    })
    .classed('dim', function(d) {
      return !_.find(points, d);
    })


  focus.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + mainHeight + ")")
    .call(xAxis);

  context.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + brushWindowHeight + ")")
    .call(xAxis2);

  context.append("g")
    .attr("class", "x brush")
    .call(brush)
    .selectAll("rect")
    .attr("y", -6)
    .attr("height", brushWindowHeight + 7);
}
