/*
 * Version 0.1.1 
 */

(function ($) {
    $.fn.funnel = function (options) {
        var setting = $.extend({
            // defaults
            stageHeight: "200px",
            stageNameFontSize: "20px",
            stageNameFontFamily: "sans-serif",
            stageNameFontColor: "black",
            legendNameFontSize: "20px",
            legendNameFontFamily: "sans-serif",
            legendNameFontColor: "black",
            histogramLabelFontSize: "10px",
            histogramLabelFontFamily: "sans-serif",
            histogramLabelFontColor: "black",
            funnelBackgroundColor: "white",
            funnelBorderColor: "gray",
            funnelBorderThickness: "1px",
            width: 1000,
            height: 500,
            url: 'data.json',
            onBubbleClick: function () {}
        }, options);

        var width = setting.width;
        var height = setting.height;

        var levelHeight = parseInt(setting.stageHeight) / 2;

        return this.each(function (i, n) {
            var elem = $(n);
            var svg = d3.select(n)
                    .attr("width", 2 * width)
                    .attr("height", 2 * height);

            var svg_pos = $(svg[0]).position();

            $(n.parentElement).find('div').remove();

            var tooltip = d3.select(n.parentElement)
                    .append("div")
                    .style("position", "absolute")
                    .style("text-align", "left")
                    .style("padding", "2px")
                    .style("font", "12px sans-serif")
                    .style("background", "lightsteelblue")
                    .style("border", "0px")
                    .style("border-radius", "8px")
                    .style("z-index", "10")
                    .style("visibility", "hidden");

            var data_url = setting.url;

            d3.json(data_url, function (resp) {
                if (resp != null) {
                    handleDataReceived(resp);
                }
            });

            function handleDataReceived(resp) {
                elem.empty();
                var json = resp;
                var size = json.stages.length;
                var totalHeight = size * levelHeight * 2;

                var adjustTopWidth = 0;
                var maxCount = 0;

                for (var i = 0; i < size; i++) {
                    for (var j = 0; j < json.stages[i].sources.length; j++)
                    {
                        maxCount = Math.max(maxCount, json.stages[i].sources[j].count);
                    }
                }

                for (var i = 0; i < json.stages[0].sources.length; i++) {
                    var rad = Math.sqrt(json.stages[0].sources[i].count / maxCount) * (levelHeight / 2 - 20);
                    adjustTopWidth += 2 * rad;
                }
                adjustTopWidth = Math.max(1.3 * adjustTopWidth, 500);


                var adjustButtonWidth = 0;
                for (var i = 0; i < json.stages[size - 1].sources.length; i++) {
                    var rad = Math.sqrt(json.stages[size - 1].sources[i].count / maxCount) * (levelHeight / 2 - 20);
                    adjustButtonWidth += 2 * rad;
                }

                adjustButtonWidth = Math.max(1.3 * adjustButtonWidth, 300);

                var trapBox = new Trapezoidal([[200, 0], [200 + adjustTopWidth, 0], [200 + (adjustTopWidth + adjustButtonWidth) / 2, totalHeight], [200 + (adjustTopWidth - adjustButtonWidth) / 2, totalHeight]]);
                var data_set = [];
                var name_set = new Set();

                var color_codes = {};
                function stringToColorCode(str) {
                    return (str in color_codes) ? color_codes[str] : (color_codes[str] = '#' + ('000000' + (Math.random() * 0xFFFFFF << 0).toString(16)).slice(-6));
                }

                for (var t = 0; t < size; t++) {
                    for (var i = 0; i < json.stages[t].sources.length; i++)
                    {
                        data_set.push({"level": t, "name": json.stages[t].sources[i].name, "radius": Math.sqrt(json.stages[t].sources[i].count / maxCount) * (levelHeight / 2), "count": json.stages[t].sources[i].count});
                        name_set.add(json.stages[t].sources[i].name);
                    }
                }

                for (var t = 0; t < size; t++) {
                    svg.append("text")
                            .style("fill", "black")
                            .attr("x", 0)
                            .attr("y", (t + 0.5) * levelHeight * 2)
                            .attr("font-size", setting.stageNameFontSize)
                            .attr("font-family", setting.stageNameFontFamily)
                            .attr("fill", setting.stageNameFontColor)
                            .text(json.stages[t].name);
                }

                var counter = 0;
                name_set.forEach(function (value) {
                    svg.append("text")
                            .style("fill", "black")
                            .attr("x", adjustTopWidth + 400)
                            .attr("y", (counter + 1) * 50 + 4)
                            .attr("font-size", setting.legendNameFontSize)
                            .attr("font-family", setting.legendNameFontFamily)
                            .attr("fill", setting.legendNameFontColor)
                            .text(value);
                    svg.append("ellipse")
                            .attr("cx", adjustTopWidth + 370)
                            .attr("cy", (counter + 1) * 50)
                            .attr("rx", 10)
                            .attr("ry", 10)
                            .attr("fill", stringToColorCode(value))
                            .attr("stroke", d3.rgb(stringToColorCode(value)).darker());
                    counter++;
                });

                for (var t = 0; t < size; t++)
                {
                    var trap = new Trapezoidal([[trapBox.left(t * totalHeight / size), t * totalHeight / size],
                        [trapBox.right(t * totalHeight / size), t * totalHeight / size],
                        [trapBox.right((t + 1) * totalHeight / size), (t + 1) * totalHeight / size],
                        [trapBox.left((t + 1) * totalHeight / size), (t + 1) * totalHeight / size]]);
                    var polygon = svg.append("g")
                            .attr("class", "polygon")
                            .datum(trap.p)
                            .attr("fill", setting.funnelBackgroundColor)
                            .attr("stroke", setting.funnelBorderColor)
                            .attr("stroke-width", setting.funnelBorderThickness);

                    polygon.append("path")
                            .call(function (path) {
                                path.attr("d", function (d) {
                                    return "M" + d.join("L") + "Z";
                                });
                            });
                }

                var chart_data_arr = [];
                var max_leadsum = 0;
                for (var t = 0; t < size; t++)
                {
                    var chart_data = reorganizeSource(json.stages[t].sources);
                    chart_data_arr.push(chart_data);
                    max_leadsum = Math.max(max_leadsum, chart_data.max_leadsum);
                }

                for (var t = 0; t < size; t++)
                {
                    var date_str_len = 5 * parseInt(setting.histogramLabelFontSize) + 5;
                    var chart_data = chart_data_arr[t];
                    var chart_width = trapBox.right((t + 1) * totalHeight / size) - trapBox.left((t + 1) * totalHeight / size);
                    var chart_height = levelHeight * 0.4;
                    var chart_div = chart_width / chart_data.dates.length;
                    var stride = Math.ceil(date_str_len / chart_div);
                    for (var i = 0; i < chart_data.leads.length; i++)
                    {
                        var base_x = trapBox.left((t + 1) * totalHeight / size) + chart_div * i;
                        var base_y = (t + 1) * totalHeight / size - 5;

                        if (i === chart_data.leads.length - 1)
                        {
                            if (stride < 2)
                            {
                                if (i % stride === 0)
                                {
                                    svg.append("text")
                                            .style("fill", setting.histogramLabelFontColor)
                                            .attr("x", base_x + 5)
                                            .attr("y", base_y)
                                            .attr("font-size", setting.histogramLabelFontSize)
                                            .attr("font-family", setting.histogramLabelFontFamily)
                                            .text(getDateStr(chart_data.dates[i]));
                                }
                            }
                        } else
                        {
                            if (i % stride === 0)
                            {
                                svg.append("text")
                                        .style("fill", setting.histogramLabelFontColor)
                                        .attr("x", base_x)
                                        .attr("y", base_y)
                                        .attr("font-size", setting.histogramLabelFontSize)
                                        .attr("font-family", setting.histogramLabelFontFamily)
                                        .text(getDateStr(chart_data.dates[i]));
                            }
                        }

                        base_y -= parseInt(setting.histogramLabelFontSize);

                        for (var j = 0; j < chart_data.leads[i].length; j++)
                        {
                            var l = chart_data.leads[i][j] * chart_height / max_leadsum;
                            svg.append("rect")
                                    .attr("x", base_x)
                                    .attr("y", base_y - l)
                                    .attr("width", chart_div - 1)
                                    .attr("height", l)
                                    .attr("fill", stringToColorCode(chart_data.names[j]))
                                    .append("svg:title")
                                    .text(function () {
                                        info = "";
                                        info += "date: " + getDateStr(chart_data.dates[i]) + "\n";
                                        info += "Leads of each source:" + "\n";
                                        for (var jj = 0; jj < chart_data.leads[i].length; jj++)
                                        {
                                            if (chart_data.leads[i][jj] != 0)
                                                info += chart_data.names[jj] + ": " + chart_data.leads[i][jj].toString() + "\n";
                                        }
                                        return info;
                                    });
                            base_y = base_y - l;
                        }
                    }
                }

                //svg.append("text").attr("x", 1100).attr("y", 200).attr("font-size", "20px").attr("font-family", "sans-serif").text("99/99/9999");
                //svg.append("rect").attr("x", 1100).attr("y", 200).attr("width", 100).attr("height", 20);

                var force = d3.layout.force()
                        .size([width, height]);

                var node = svg.selectAll("circle")
                        .data(data_set)
                        .enter().append("svg:circle")
                        .attr("r", function (d) {
                            return d.radius;
                        })
                        .style("fill", function (d) {
                            return stringToColorCode(d.name);
                        })
                        .style("stroke", function (d) {
                            return d3.rgb(stringToColorCode(d.name)).darker();
                        })
                        .on("mouseover", function () {
                            return tooltip.style("visibility", "visible");
                        })
                        .on('click', function (d) {
                            if (typeof setting.onBubbleClick === 'function') {
                                setting.onBubbleClick.call(this, d);
                            }
                        })
                        .on("mousemove", function (d) {
                            return tooltip.style("top", ((svg_pos.top + d.y) - d.radius * 2) + "px").style("left", ((svg_pos.left + d.x) - d.radius) + "px")
                                    .html(function () {
                                        var tip = "";
                                        tip += "name:  " + d.name.toString() + "<br>";
                                        tip += "count: " + d.count.toString();
                                        return tip;
                                    });
                        })
                        .on("mouseout", function () {
                            return tooltip.style("visibility", "hidden");
                        })
                        .call(force.drag);
                force
                        .nodes(data_set)
                        //.charge(-200)
                        //.gravity(0.002)
                        .gravity(-0.0002)
                        .charge(-200)
                        .on("tick", function () {

                            var collide = function (node) {
                                var r = node.radius + 16,
                                        nx1 = node.x - r,
                                        nx2 = node.x + r,
                                        ny1 = node.y - r,
                                        ny2 = node.y + r;
                                return function (quad, x1, y1, x2, y2) {
                                    if (quad.point && (quad.point !== node)) {
                                        var x = node.x - quad.point.x,
                                                y = node.y - quad.point.y,
                                                l = Math.sqrt(x * x + y * y),
                                                r = node.radius + quad.point.radius + 10;
                                        if (l < r) {
                                            l = (l - r) / l * .5;
                                            node.x -= x *= l;
                                            node.y -= y *= l;
                                            quad.point.x += x;
                                            quad.point.y += y;
                                        }
                                    }
                                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                                };
                            };

                            var q = d3.geom.quadtree(data_set),
                                    i = 0,
                                    n = data_set.length;

                            while (++i < n)
                                q.visit(collide(data_set[i]));

                            node
                                    .attr("cy", function (d) {
                                        var idx = d.level;
                                        var rad = d.radius;
                                        var trap = new Trapezoidal([[trapBox.left(idx * totalHeight / size), idx * totalHeight / size],
                                            [trapBox.right(idx * totalHeight / size), idx * totalHeight / size],
                                            [trapBox.right((idx + 0.65) * totalHeight / size), (idx + 0.65) * totalHeight / size],
                                            [trapBox.left((idx + 0.65) * totalHeight / size), (idx + 0.65) * totalHeight / size]]);
                                        return d.y = Math.max(trap.top() + rad + 8, Math.min(trap.button() - rad - 8, d.y));
                                    })
                                    .attr("cx", function (d) {
                                        var idx = d.level;
                                        var rad = d.radius;
                                        var trap = new Trapezoidal([[trapBox.left(idx * totalHeight / size), idx * totalHeight / size],
                                            [trapBox.right(idx * totalHeight / size), idx * totalHeight / size],
                                            [trapBox.right((idx + 0.65) * totalHeight / size), (idx + 0.65) * totalHeight / size],
                                            [trapBox.left((idx + 0.65) * totalHeight / size), (idx + 0.65) * totalHeight / size]]);
                                        return d.x = Math.max(trap.left(d.y) + rad + 11, Math.min(trap.right(d.y) - rad - 11, d.x));
                                    });
                        })
                        .start();
            }
        });
    };

    function reorganizeSource(source) {
        var chart_data = {"names": [], "dates": [], "leads": [], "max_leadsum": 0};
        var len = source.length;

        for (var i = 0; i < len; i++)
        {
            chart_data.names.push(source[i].name);
        }

        var date_set = new Set();
        for (var i = 0; i < len; i++)
        {
            for (var j = 0; j < source[i].bydate.length; j++)
            {
                var date_str = source[i].bydate[j].data;
                var date_list = date_str.split("/");
                var date = parseInt(date_list[0]) + parseInt(date_list[1]) * 100 + parseInt(date_list[2]) * 100000;
                date_set.add(date);
            }
        }

        chart_data.dates = Array.from(date_set).sort();

        var empty_list = [];
        for (var i = 0; i < len; i++)
        {
            empty_list.push(0);
        }

        date_set.forEach(function (value) {
            chart_data.leads.push(empty_list.slice());
        });

        for (var i = 0; i < len; i++)
        {
            for (var j = 0; j < source[i].bydate.length; j++)
            {
                var date_str = source[i].bydate[j].data;
                var date_list = date_str.split("/");
                var date = parseInt(date_list[0]) + parseInt(date_list[1]) * 100 + parseInt(date_list[2]) * 100000;

                var idx = chart_data.dates.indexOf(date);
                chart_data.leads[idx][i] = source[i].bydate[j].leads;
            }
        }

        var max_lead = 0;
        for (var i = 0; i < chart_data.leads.length; i++)
        {
            var tmp_max = 0;
            for (var j = 0; j < chart_data.leads[i].length; j++)
            {
                tmp_max += chart_data.leads[i][j];
            }
            max_lead = Math.max(max_lead, tmp_max);
        }

        chart_data.max_leadsum = max_lead;


        return chart_data;
    }

    function getDateStr(date) {
        return (date % 100).toString() + "/" + (Math.floor(date / 100) % 100).toString() + "/" + (Math.floor(date / 100000)).toString();
    }

    // Trapezoidal
    var Trapezoidal = function (points) {
        this.p = points;
    };

    Trapezoidal.prototype.top = function ()
    {
        return this.p[0][1];
    };

    Trapezoidal.prototype.button = function ()
    {
        return this.p[2][1];
    };

    Trapezoidal.prototype.left = function (y)
    {
        return (y - this.p[0][1]) / (this.p[3][1] - this.p[0][1]) * (this.p[3][0] - this.p[0][0]) + this.p[0][0];
    };

    Trapezoidal.prototype.right = function (y)
    {
        return (y - this.p[1][1]) / (this.p[2][1] - this.p[1][1]) * (this.p[2][0] - this.p[1][0]) + this.p[1][0];
    };

    Trapezoidal.prototype.center = function ()
    {
        var pos = [];
        pos.push((this.p[0][0] + this.p[1][0] + this.p[2][0] + this.p[3][0]) / 2);
        pos.push((this.p[0][1] + this.p[1][1] + this.p[2][1] + this.p[3][1]) / 2);
        return pos;
    };

    Trapezoidal.prototype.hasPoint = function (point)
    {
        if (point[1] < this.top())
            return false;
        if (point[1] > this.button())
            return false;
        if (point[0] < this.left(point[1]))
            return false;
        if (point[0] > this.right(point[1]))
            return false;
    };
}(jQuery));