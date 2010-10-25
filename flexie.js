/*
File: flexie.js

About: Version
	0.1 pre

Project: Flexie

Description:
	Legacy support for the CSS3 Flexible Box Model

License:
	The MIT License
	
	Copyright (c) 2010 Richard Herrera

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

/*
Class: Flexie
	Scoped to the Flexie Global Namespace
*/
var Flexie = (function(window, doc, undefined) {
	var $self = {};
	
	// Store support for flexbox
	var SUPPORT;
	
	// Store reference to library
	var LIBRARY;
	
	var PIXEL = /^\d+(px)?$/i;
	var SIZES = /width|height|top|bottom|left|right|margin|padding|border(.*)?Width/;
	
	var BORDER_RIGHT = "borderLeftWidth",
	    BORDER_BOTTOM = "borderBottomWidth",
	    BORDER_LEFT = "borderLeftWidth",
	    BORDER_TOP = "borderTopWidth";
	
	var prefixes = " -o- -moz- -ms- -webkit- -khtml- ".split(" ");
	
	var defaults = {
		orient : "horizontal",
		align : "stretch",
		direction : "normal",
		pack : "start"
	};
	
	/*
	selectivizr v1.0.0 - (c) Keith Clark, freely distributable under the terms 
	of the MIT license.

	selectivizr.com
	*/
	var selectivizr = (function() {
		var FLEX_BOXES = [],
		    POSSIBLE_FLEX_CHILDREN = [];
		
		var RE_COMMENT = /(\/\*[^*]*\*+([^\/][^*]*\*+)*\/)\s*/g,
		    RE_IMPORT = /@import\s*url\(\s*(["'])?(.*?)\1\s*\)[\w\W]*?;/g,
		    RE_SELECTOR_GROUP = /(^|})\s*([^\{]*?[\[:][^{]+)/g,
			
		    // Whitespace normalization regexp's
		    RE_TIDY_TRAILING_WHITESPACE = /([(\[+~])\s+/g,
		    RE_TIDY_LEADING_WHITESPACE = /\s+([)\]+~])/g,
		    RE_TIDY_CONSECUTIVE_WHITESPACE = /\s+/g,
		    RE_TIDY_TRIM_WHITESPACE = /^\s*((?:[\S\s]*\S)?)\s*$/,
			
		    // String constants
		    EMPTY_STRING = "",
		    SPACE_STRING = " ",
		    PLACEHOLDER_STRING = "$1";

		// --[ patchStyleSheet() ]----------------------------------------------
		// Scans the passed cssText for selectors that require emulation and
		// creates one or more patches for each matched selector.
		function patchStyleSheet(cssText) {
			return cssText.replace(RE_SELECTOR_GROUP, function(m, prefix, selectorText) {	
				var selectorGroups = selectorText.split(",");
				for (var c = 0, cs = selectorGroups.length; c < cs; c++) {
					var selector = normalizeSelectorWhitespace(selectorGroups[c]) + SPACE_STRING;
					var patches = [];
				}
				return prefix + selectorGroups.join(",");
			});
		}

		// --[ trim() ]---------------------------------------------------------
		// removes leading, trailing whitespace from a string
		function trim(text) {
			return text.replace(RE_TIDY_TRIM_WHITESPACE, PLACEHOLDER_STRING);
		}

		// --[ normalizeWhitespace() ]------------------------------------------
		// removes leading, trailing and consecutive whitespace from a string
		function normalizeWhitespace(text) {
			return trim(text).replace(RE_TIDY_CONSECUTIVE_WHITESPACE, SPACE_STRING);
		}

		// --[ normalizeSelectorWhitespace() ]----------------------------------
		// tidys whitespace around selector brackets and combinators
		function normalizeSelectorWhitespace(selectorText) {
			return normalizeWhitespace(selectorText.replace(RE_TIDY_TRAILING_WHITESPACE, PLACEHOLDER_STRING).replace(RE_TIDY_LEADING_WHITESPACE, PLACEHOLDER_STRING));
		}
		
		// --[ getXHRObject() ]-------------------------------------------------
		function getXHRObject() {
			if (window.XMLHttpRequest) {
				return new XMLHttpRequest;
			}
			
			try	{ 
				return new ActiveXObject('Microsoft.XMLHTTP') ;
			} catch(e) { 
				return null;
			}
		}
		
		// --[ loadStyleSheet() ]-----------------------------------------------
		function loadStyleSheet(url) {
			var xhr = getXHRObject();
			
			xhr.open("GET", url, false);
			xhr.send();
			return (xhr.status === 200) ? xhr.responseText : "";	
		}
		
		// --[ resolveUrl() ]---------------------------------------------------
		// Converts a URL fragment to a fully qualified URL using the specified
		// context URL. Returns null if same-origin policy is broken
		function resolveUrl(url, contextUrl) {
			
			// IE9 returns a false positive sometimes(?)
			if (!url) {
				return;
			}
			
			function getProtocolAndHost(url) {
				return url.substring(0, url.indexOf("/", 8));
			}

			// absolute path
			if (/^https?:\/\//i.test(url)) {
				return getProtocolAndHost(contextUrl) == getProtocolAndHost(url) ? url : null;
			}

			// root-relative path
			if (url.charAt(0) == "/")	{
				return getProtocolAndHost(contextUrl) + url;
			}

			// relative path
			var contextUrlPath = contextUrl.split("?")[0]; // ignore query string in the contextUrl
			if (url.charAt(0) != "?" && contextUrlPath.charAt(contextUrlPath.length-1) != "/") {
				contextUrlPath = contextUrlPath.substring(0, contextUrlPath.lastIndexOf("/") + 1);
			}

			return contextUrlPath + url;
		}
		
		// --[ parseStyleSheet() ]----------------------------------------------
		// Downloads the stylesheet specified by the URL, removes it's comments
		// and recursivly replaces @import rules with their contents, ultimately
		// returning the full cssText.
		function parseStyleSheet(url) {
			if (url) {
				var cssText = loadStyleSheet(url);
				return cssText.replace(RE_COMMENT, EMPTY_STRING).replace(RE_IMPORT, function( match, quoteChar, importUrl ) { 
					return parseStyleSheet(resolveUrl(importUrl, url));
				});
			}
			return EMPTY_STRING;
		}
		
		function buildSelectorTree(text) {
			var rules = [], ruletext, rule, i, j, k, l,
			    match, selector, proptext, splitprop, properties;
			
			// Tabs, Returns
			text = text.replace(/\t/g, "").replace(/\n/g, "").replace(/\r/g, "");
			
			// Leading / Trailing Whitespace
			text = text.replace(/\s?(\{|\:|\})\s?/g, "$1");
			
			ruletext = text.split("}");
			
			for (i = 0, j = ruletext.length; i < j; i++) {
				if (ruletext[i]) {
					rule = [ruletext[i], "}"].join("");
					
					match = (/(.*)\{(.*)\}/).exec(rule);
					
					if (match.length && match[2]) {
						selector = match[1];
						proptext = match[2].split(";");
						properties = [];
						
						for (k = 0, l = proptext.length; k < l; k++) {
							splitprop = proptext[k].split(":");
							
							if (splitprop.length && splitprop[1]) {
								properties.push({
									property : splitprop[0],
									value : splitprop[1]
								});
							}
						}
						
						rules.push({
							selector : selector,
							properties : properties
						});
					}
				}
			}
			
			return rules;
		}
		
		function findFlexBoxElements(rules) {
			var rule, selector, properties, prop,
			    property, value, i, j, k, l,
			    leadingTrim = /^\s\s*/,
			    trailingTrim = /\s\s*$/;
			
			for (i = 0, j = rules.length; i < j; i++) {
				rule = rules[i];
				selector = rule.selector;
				properties = rule.properties;
				
				for (k = 0, l = properties.length; k < l; k++) {
					prop = properties[k];
					
					// Trim any residue whitespace (it happens)
					prop.property = prop.property.replace(leadingTrim, "").replace(trailingTrim, "");
					prop.value = prop.value.replace(leadingTrim, "").replace(trailingTrim, "");
					
					property = prop.property;
					value = prop.value;
					
					if (property == "display" && value == "box") {
						FLEX_BOXES.push(rule);
					} else if (property == "box-flex" && value) {
						
						// Easy access for later
						rule.flex = value;
						POSSIBLE_FLEX_CHILDREN.push(rule);
					}
				}
			}
			
			return {
				boxes : FLEX_BOXES,
				children : POSSIBLE_FLEX_CHILDREN
			};
		}
		
		function matchFlexChildren(parent, lib, possibleChildren) {
			var child, caller, matches = [], i, j, k, l;
			
			for (i = 0, j = possibleChildren.length; i < j; i++) {
				child = possibleChildren[i];
				caller = lib(child.selector);
				
				if (caller[0]) {
					for (k = 0, l = caller.length; k < l; k++) {
						if (caller[k].parentNode === parent) {
							child.match = caller[k];
							matches.push(child);
						}
					}
				}
			}
			
			return matches;
		}
		
		function buildFlexieCall(flexers) {
			var flex, selector, properties, prop,
			    orient, align, direction, pack,
			    lib, caller, children, i, j, k, l;
			
			for (i = 0, j = flexers.boxes.length; i < j; i++) {
				flex = flexers.boxes[i];
				
				selector = flex.selector;
				properties = flex.properties;
				
				orient = align = direction = pack = null;
				
				for (k = 0, l = properties.length; k < l; k++) {
					prop = properties[k];
					
					switch (prop.property) {
						case "box-orient" :
						orient = prop.value;
						break;
						
						case "box-align" :
						align = prop.value;
						break;
						
						case "box-direction" :
						direction = prop.value;
						break;
						
						case "box-pack" :
						pack = prop.value;
						break;
					}
				}
				
				if (orient || align || direction || pack) {
					
					// Determine library
					lib = LIBRARY;
					
					// Call it.
					caller = lib(flex.selector);
					
					// In an array?
					caller = caller[0] || caller;
					
					// Find possible child node matches
					children = matchFlexChildren(caller, lib, flexers.children);
					
					new $self.box({
						target : caller,
						children : children,
						orient : orient,
						align : align,
						direction: direction,
						pack : pack
					});
				}
			}
		}
		
		// --[ init() ]---------------------------------------------------------
		return function() {
			// honour the <base> tag
			var url, stylesheet, c,
			    baseTags = doc.getElementsByTagName("BASE"),
			    baseUrl = (baseTags.length > 0) ? baseTags[0].href : doc.location.href;
			
			for (c = 0; c < doc.styleSheets.length; c++) {
				stylesheet = doc.styleSheets[c];
				
				if (stylesheet.href != "") {
					url = resolveUrl(stylesheet.href, baseUrl);
					
					if (url) {
						var cssText = patchStyleSheet(parseStyleSheet(url)),
						    tree = buildSelectorTree(cssText),
						    flexers = findFlexBoxElements(tree);
					}
				}
			}
			
			buildFlexieCall(flexers);
		};
	})();
	
	// --[ determineSelectorMethod() ]--------------------------------------
	// walks through the selectorEngines object testing for an suitable
	// selector engine.
	function determineSelectorMethod() {
		// compatiable selector engines in order of CSS3 support
		var selectorEngines = {
			"NW" : "*.Dom.select",
			"DOMAssistant" : "*.$", 
			"Prototype" : "$$",
			"YAHOO" : "*.util.Selector.query",
			"MooTools" : "$$",
			"Sizzle" : "*", 
			"jQuery" : "*",
			"dojo" : "*.query"
		};
		
		var win = window, method;
		
		for (var engine in selectorEngines) {
			if (win[engine] && (method = eval(selectorEngines[engine].replace("*",engine)))) {
				return method;
			}
		}
		return false;
	}
	
	function calcPx(element, props, dir) {
		var value, i, j, key;
		dir = dir.replace(dir.charAt(0), dir.charAt(0).toUpperCase());

		var globalProps = {
			visibility : "hidden",
			position : "absolute",
			left : "-9999px",
			top : "-9999px"
		};

		var dummy = element.cloneNode(true);

		for (i = 0, j = props.length; i < j; i++) {
			dummy.style[props[i]] = "0";
		}
		for (key in globalProps) {
			dummy.style[key] = globalProps[key];
		}

		doc.body.appendChild(dummy);
		value = dummy["offset" + dir];
		doc.body.removeChild(dummy);

		return value;
	};
	
	function unAuto(element, prop) {
		var props;
		
		switch (prop) {
			case "width" :
			props = ["paddingLeft", "paddingRight", BORDER_LEFT, BORDER_RIGHT];
			prop = calcPx(element, props, prop);
			break;

			case "height" :
			props = ["paddingTop", "paddingBottom", BORDER_TOP, BORDER_BOTTOM];
			prop = calcPx(element, props, prop);
			break;

			default :
			prop = element.style[prop];
			break;
		}

		return prop;
	};
	
	function getPixelValue(element, prop, name) {
		if (PIXEL.test(prop)) {
			return prop;
		}
		
		// if property is auto, do some messy appending
		if (prop === "auto") {
			prop = unAuto(element, name);
		} else {
			var style = element.style.left,
			    runtimeStyle = element.runtimeStyle.left;
			
			try {
				element.runtimeStyle.left = element.currentStyle.left;

				element.style.left = prop || 0;
				prop = element.style.pixelLeft;
				element.style.left = style;
				element.runtimeStyle.left = runtimeStyle;
			} catch(e) {
				prop = 0;
			}
		}
		
		return prop + "px";
	};
	
	function getComputedStyle(element, property, returnAsInt) {
		if (doc.defaultView && doc.defaultView.getComputedStyle) {
			return doc.defaultView.getComputedStyle(element, null)[property];
		} else {
			property = toCamelCase(property);
			
			if (SIZES.test(property)) {
				property = getPixelValue(element, element.currentStyle[property], property);
			} else {
				property = element.currentStyle[property];
			}

			/**
			 * @returns property (or empty string if none)
			*/
			return returnAsInt ? parseInt(property) : (property || "");
		}
	}
	
	function toCamelCase(cssProp) {
		var hyphen = /(-[a-z])/ig;
		while (hyphen.exec(cssProp)) {
			cssProp = cssProp.replace(RegExp.$1, RegExp.$1.substr(1).toUpperCase());
		}
		return cssProp;
	}
	
	function getParams(params) {
		for (var key in params) {
			params[key] = params[key] || defaults[key];
		}
		
		return params;
	}
	
	function clientWidth(element) {
		return element.innerWidth || element.clientWidth;
	}
	
	function clientHeight(element) {
		return element.innerHeight || element.clientHeight;
	}
	
	function appendProperty(target, prop, value) {
		var cssText = [], i, j;

		for (i = 0, j = prefixes.length; i < j; i++) {
			cssText.push(prop + ":" + prefixes[i] + value);
		}

		target.style.cssText = cssText.join(";");
		return target;
	}
	
	function appendPixelValue(target, prop, value) {
		var targets = target[0] ? target : [target],
		    i, j;
		
		for (i = 0, j = targets.length; i < j; i++) {
			targets[i].style[prop] = (value ? (value + "px") : "");
		}
	}

	function flexBoxSupported() {
		var dummy = doc.createElement("div");
		appendProperty(dummy, "display", "box");
		return ((dummy.style.display).indexOf("box") !== -1) ? true : false;
	}
	
	$self.box = function(params) {
		this.renderModel(params);
	};
	
	$self.box.prototype = {
		boxModel : function(target, children) {
			target.style.overflow = "hidden";
		},

		boxOrient : function(target, children, params) {
			var _self = this,
			    i, j, kid;

			var wide = {
				pos : "marginLeft",
				add : ["marginRight", BORDER_LEFT, BORDER_RIGHT],
				dim : "width",
				func : clientWidth
			};

			var high = {
				pos : "marginTop",
				add : ["marginBottom", BORDER_TOP, BORDER_BOTTOM],
				dim : "height",
				func : clientHeight
			};

			for (i = 0, j = children.length; i < j; i++) {
				kid = children[i];

				kid.style.cssFloat = kid.style.styleFloat = "left";
				kid.style[wide.dim] = getComputedStyle(kid, wide.dim);

				if (params.orient === "vertical") {
					kid.style.cssFloat = kid.style.styleFloat = "";
				}
			}

			switch (params.orient) {
				case "horizontal" :
				case "inline-axis" :
				_self.props = wide;
				_self.anti = high;
				break;

				case "vertical" :
				case "block-axis":
				_self.props = high;
				_self.anti = wide;
				break;
			}
		},

		boxAlign : function(target, children, params) {
			var _self = this,
			    kid, targetDimension = _self.anti.func(target),
			    kidDimension, i, j, k, l;

			switch (params.align) {
				case "stretch" :
				appendPixelValue(children, _self.anti.dim, _self.anti.func(target));
				break;

				case "start" :
				break;

				case "end" :
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kidDimension = _self.anti.func(kid);

					for (k = 0, l = _self.anti.add.length; k < l; k++) {
						kidDimension += getComputedStyle(kid, _self.anti.add[k], true);
					}

					kid.style[_self.anti.pos] = (targetDimension - kidDimension) + "px";
				}
				break;

				case "center":
				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					kid.style[_self.anti.pos] = (targetDimension / 2 - _self.anti.func(kid) / 2) + "px";
				}
				break;

				case "baseline":
				break;
			}
		},

		boxDirection : function(target, children, params) {
			var i, j;

			switch (params.direction) {
				case "normal" :
				break;

				case "reverse" :
				for (i = children.length - 1; i >= 0; i--) {
					target.appendChild(children[i]);
				}
				break;
			}
		},

		boxPack : function(target, children, params) {
			var _self = this,
			    groupDimension = 0, i, j,
			    totalDimension, fractionedDimension;

			for (i = 0, j = children.length; i < j; i++) {
				groupDimension += _self.props.func(children[i]);
			}

			totalDimension = _self.props.func(target) - groupDimension;
			fractionedDimension = Math.floor(totalDimension / (children.length - 1));

			switch (params.pack) {
				case "start" :
				break;

				case "end" :
				appendPixelValue(children[0], _self.props.pos, totalDimension);
				break;

				case "center" :
				appendPixelValue(children[0], _self.props.pos, totalDimension / 2);
				break;

				case "justify" :
				appendPixelValue(children, _self.props.pos, fractionedDimension);
				appendPixelValue(children[0], _self.props.pos);
				break;
			}
		},

		boxFlex : function(target, children, params) {
			var _self = this;
			
			var createMatchMatrix = function(matches) {
				var kid, child, totalRatio = 0, i, j, k, l, x,
				    key, flexers = {}, keys = [];

				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					child = null;

					for (k = 0, l = matches.length; k < l; k++) {
						x = matches[k];

						if (x.match === kid) {
							child = x.match;
							totalRatio += parseInt(x.flex);

							flexers[x.flex] = flexers[x.flex] || [];
							flexers[x.flex].push(x);
						}
					}

					if (!child) {
						flexers["0"] = flexers["0"] || [];
						flexers["0"].push(kid);
					}
				}

				for (key in flexers) {
					keys.push(key);
				}

				keys.sort(function(a, b) {
					return b - a;
				});

				return {
					keys : keys,
					flexers : flexers,
					total : totalRatio
				};
			};

			var findTotalWhitespace = function(matrix) {
				var groupDimension = 0, kid, i, j, k, l,
				    whitespace, ration;

				for (i = 0, j = children.length; i < j; i++) {
					kid = children[i];
					
					groupDimension += _self.props.func(kid);

					for (k = 0, l = _self.anti.add.length; k < l; k++) {
						groupDimension += getComputedStyle(kid, _self.props.add[k], true);
						groupDimension += getComputedStyle(kid, _self.anti.add[k], true);
					}
				}

				whitespace = _self.props.func(target) - groupDimension;
				ration = (whitespace / matrix.total);

				return {
					whitespace : whitespace,
					ration : ration
				};
			};

			var distributeRatio = function(matrix, whitespace) {
				var flexers = matrix.flexers, i, j,
				    keys = matrix.keys, k, l,
				    ration = whitespace.ration,
				    x, w, key, groupDimension = 0,
				    flexWidths = {}, widthRation, trueDim;

				for (i = 0, j = keys.length; i < j; i++) {
					key = keys[i];
					widthRation = (ration * key);

					flexWidths[key] = widthRation/* / flexers[key].length*/;

					for (k = 0, l = flexers[key].length; k < l; k++) {
						x = flexers[key][k];
						w = flexWidths[key];

						if (x.match) {
							trueDim = getComputedStyle(x.match, _self.props.dim, true);
							x.match.style[_self.props.dim] = (trueDim + w) + "px";
						}

					}
				}
			};

			// Zero out any defined positioning
			appendPixelValue(children, _self.props.pos);

			var matrix = createMatchMatrix(params.children),
			    whitespace = findTotalWhitespace(matrix),

			    // Distribute the calculated ratios among the children
			    distro = distributeRatio(matrix, whitespace);
		},

		setup : function(target, children, params) {
			var _self = this;
			
			// Set up parent
			_self.boxModel(target, children);
			_self.boxOrient(target, children, params);
			_self.boxAlign(target, children, params);
			_self.boxDirection(target, children, params);
			_self.boxPack(target, children, params);

			// Children properties
			_self.boxFlex(target, children, params);
		},

		// Shoud I?
		// Polling innerHTML is a huge tax. Not sure if it's worth it.
		pollDOM : function(params) {
			var _self = this,
			    innerHTML = params.target.innerHTML;

			window.setInterval(function() {
				if (params.target.innerHTML != innerHTML) {
					_self.updateModel(params);
					innerHTML = params.target.innerHTML;
				}
			}, 250);
		},

		resizeEvent : function(params) {
			var _self = this;
			
			window.onresize = function() {
				_self.updateModel(params);
			};
		},

		updateModel : function(params) {
			var target = params.target, i, j,
			    children = target.childNodes;

			// Null properties
			for (i = 0, j = children.length; i < j; i++) {
				children[i].style.cssText = "";
			}

			this.setup(target, children, params);
		},

		renderModel : function(params) {
			var _self = this,
			    target = params.target, i, j,
			    nodes = target.childNodes, node,
			    children = [];

			params = getParams(params);

			node = nodes[0];
			for (i = 0, j = nodes.length; i < j; i++) {
				if (nodes[i]) {
					if (nodes[i].nodeType === 1) {
						children.push(nodes[i]);
					} else {
						target.removeChild(nodes[i]);
						i--;
					}
				}
			}
			
			// Setup properties
			_self.setup(target, children, params);

			// Poll the DOM for changes
			_self.pollDOM(params);

			// Update the box model on resize
			_self.resizeEvent(params);
		}
	};
	
	$self.init = function() {
 		SUPPORT = flexBoxSupported();
		LIBRARY = determineSelectorMethod();
		
		if (!SUPPORT && LIBRARY) {
			selectivizr();
		}
	}();
	
	return $self;
})(this, document);