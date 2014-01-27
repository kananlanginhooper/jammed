var jammed = (function () {
    'use strict';

    var NUM_RANDOM_ROADS = 5;
    var NUM_RANDOM_CARS_PER_ROAD = 5;
    var WRECKED_CAR_STYLE = 'black';

    var intervalId;
    var world;

    /** @type {number} */
    var maxVelSqrt = 10;
    /** @type {number} */
    var maxCarLength = 8;

    var maxRandomRoadPoints = 10;

    var width, height;

    /**
     * @param {number} x
     * @param {number} y
     * @constructor
     * @returns {{ x:number, y:number }}
     */
    function Vector(x, y) {
        var vector = this;
        this.x = x || 0;
        this.y = y || 0;
    }

    /** @returns {number} */
    Vector.prototype.getMagnitude = function () {
        return this.x * this.x + this.y * this.y;
    };

    /** @returns {number} */
    Vector.prototype.getSize = function () {
        return Math.sqrt(this.getMagnitude());
    };

    /**
     * @param {Vector} otherVector
     * @returns {Vector}
     */
    Vector.prototype.minus = function (otherVector) {
        return new Vector(this.x - otherVector.x, this.y - otherVector.y);
    };

    /**
     * @param {Vector} otherVector
     * @returns {Vector}
     */
    Vector.prototype.plus = function (otherVector) {
        return new Vector(this.x + otherVector.x, this.y + otherVector.y);
    };

    /**
     * @param {number} scalar
     * @returns {Vector}
     */
    Vector.prototype.mul = function (scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    };

    /** @returns {Vector} */
    Vector.prototype.toUnit = function () {
        var size = this.getSize();
        return new Vector(this.x / size, this.y / size);
    };


    /**
     * @param {Array.<Vector>} points
     * @param {function(Vector,Vector):(undefined|boolean)} f
     */
    function forEachSegment(points, f) {
        var i;
        /** @type {Vector} */
        var point;
        /** @type {Vector} */
        var prevPoint;

        for (i = 1; i < points.length; i += 1) {
            point = points[i];
            prevPoint = points[i - 1];
            if (f(prevPoint, point)) {
                return;
            }
        }
    }

    /**
     * @param {Array.<Vector>} points
     * @returns {number}
     */
    function getLength(points) {
        var length = 0;
        forEachSegment(points, function (prevPoint, point) {
            length += point.minus(prevPoint).getSize();
        });
        return length;
    }

    /**
     * @param {number} length
     * @param {number} position
     * @param {number} speed
     * @constructor
     * @returns {{length:number, position:number, speed:number, color:string}}
     */
    function Car(length, position, speed) {
        this.length = length;
        this.position = position;
        this.speed = speed;
        this.color = randomColor();
        this.wrecked = false;
    }

    /**
     * @param {Array.<Vector>} points
     * @param {Array.<Car>} cars
     * @constructor
     * @returns {{ points: Array.<Vector>, cars: Array.<Car>, length: number }}
     */
    function Road(points, cars) {
        this.points = points;
        this.cars = [];
        this.length = getLength(points);
    }

    /**
     * @param {function(Road, Car,?Car)} f
     */
    Road.prototype.forEachCar = function (f) {
        /** @type {number} */
        var i;
        for (i = 0; i < this.cars.length; i += 1) {
            f(this, this.cars[i], this.cars[i + 1]);
        }
    };

    /**
     * @param {CanvasRenderingContext2D} context
     */
    Road.prototype.draw = function (context) {
        var i, point;
        if (!this.points.length) {
            return;
        }
        context.strokeStyle = "red";
        context.shadowColor = "#88ff88";
        context.shadowBlur = 10;
        context.beginPath();
        context.moveTo(this.points[0].x, this.points[0].y);
        for (i = 1; i < this.points.length; i += 1) {
            point = this.points[i];
            context.lineTo(point.x, point.y);
        }
        context.stroke();
    };

    Road.prototype.sortCars = function() {
        this.cars.sort(function (a, b) {
            return a.position - b.position;
        });
    };

    /** @param {number} roadPosition
     *  @returns {Vector}
     */
    Road.prototype.roadToWorldPosition = function (roadPosition) {
        /** @type {Vector} */
        var targetSegmentStart;
        /** @type {Vector} */
        var targetSegmentDirection;
        var segment;
        var pos = roadPosition;
        forEachSegment(this.points, function (prevPoint, point) {
            segment = point.minus(prevPoint);
            var segmentSize = segment.getSize();
            targetSegmentStart = prevPoint;
            if (segmentSize > pos) {
                return true;
            }
            pos -= segmentSize;
        });
        if (targetSegmentStart && segment) {
            targetSegmentDirection = segment.toUnit();
            return new Vector(targetSegmentStart.x + pos * targetSegmentDirection.x, targetSegmentStart.y + pos * targetSegmentDirection.y);
        }
        return null;
    };


    /**
     * @param {number} width
     * @param {number} height
     * @constructor
     * @returns {{width:number, height:number, roads:Array.<Road>}}
     */
    function World(width, height) {
        this.width = width;
        this.height = height;
        this.roads = [];

    }

    /**
     * @returns {HTMLCanvasElement}
     */
    function getCanvas() {
        return /** @type {HTMLCanvasElement} */ document.getElementById('canvas');
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @returns {CanvasRenderingContext2D}
     */
    function getContext(canvas) {
        return canvas.getContext('2d');
    }

    /**
     * @param {World} world
     */
    function drawWorld(world) {
        var canvas = getCanvas();
        var context = getContext(canvas);
        var i;
        /** @type {Road} */
        var road;

        function drawCar(road, car, nextCar) {
            var position = road.roadToWorldPosition(car.position);
            var style = car.color;
            if (car.wrecked) {
                style = WRECKED_CAR_STYLE;
            }
            context.fillStyle = style;
            context.shadowColor = style;
            context.shadowBlur = 2;
            context.fillRect(position.x, position.y, car.length, car.length);

        }

        resetCanvas();
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.draw(context);
            road.forEachCar(drawCar);
        }
    }


    /**
     * @param {Road} road
     * @param {Car} car
     * @param {?Car} nextCar
     */
    function simulateCar(road, car, nextCar) {
        var distanceToNextCarBackside = null;
        if (car.wrecked) {
            return;
        }
        if (nextCar) {
            distanceToNextCarBackside = nextCar.position - car.position;
            if (distanceToNextCarBackside < 0) {
                distanceToNextCarBackside += road.length;
            }
        }
        car.position += car.speed;
        if ((null !== distanceToNextCarBackside) && (distanceToNextCarBackside - car.speed < car.length)) {
            // Wreck!
            car.position = nextCar.position - car.length;
            car.wrecked = true;
            car.speed = 0;
            nextCar.wrecked = true;
            nextCar.speed = 0;
        }
        if (car.position > road.length) {
            car.position -= road.length;
        }
        if (car.position < 0) {
            car.position += road.length;
        }
    }

    function simulateStep(world) {
        var i;
        /** @type {Road} */
        var road;
        var newCars;
        for (i = 0; i < world.roads.length; i += 1) {
            road = world.roads[i];
            road.sortCars();
            road.forEachCar(simulateCar);
        }
    }

    /**
     * @param {number} max
     * @param {boolean=} allowNegative
     * @param {number=} min
     * @returns {number}
     */
    function randomInt(max, allowNegative, min) {
        var sign = (allowNegative && (Math.random() > 0.5)) ? -1 : 1;
        return sign * ((min || 0) + Math.floor(Math.random() * max));
    }

    /**
     * @param {Road} road
     */
    function addRandomCar(road) {
        road.cars.push(new Car(randomInt(maxCarLength) + 1, randomInt(road.length), randomInt(maxVelSqrt) + 1));
    }

    function stop() {
        if (intervalId) {
            window.clearInterval(intervalId);
        }
    }

    function randomHexDigit() {
        var digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
        return digits[randomInt(digits.length)];
    }

    function randomColor() {
        return '#' + randomHexDigit() + randomHexDigit() + randomHexDigit() + randomHexDigit() + randomHexDigit() + randomHexDigit();
    }

    function initCanvas() {
        var canvas = getCanvas();
        var context = getContext(canvas);

//        canvas.width = 600;
//        canvas.height = 300;
    }

    function resetCanvas() {
        var canvas = getCanvas();
        var context = getContext(canvas);


        // Store the current transformation matrix
        context.save();

        // Use the identity matrix while clearing the canvas
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Restore the transform
        context.restore();
    }

    /**
     * @param {number} maxX
     * @param {number} maxY
     * @returns {Vector}
     */
    function randomVector(maxX, maxY) {
        return new Vector(randomInt(maxX), randomInt(maxY));
    }

    function randomRoad() {
        var i, numSegments = randomInt(maxRandomRoadPoints) + 2;
        var points = [randomVector(width, height)];
        var prevPoint = points[0];
        var point;
        var road;
        for (i = 0; i < numSegments; i += 1) {
            point = randomVector(width, height).minus(prevPoint);
            point = prevPoint.plus(new Vector(point.x * (i % 2), point.y * ((i + 1) % 2)));
            points.push(point);
            prevPoint = point;
        }
        road = new Road(points, []);

        for (i = 0; i < NUM_RANDOM_CARS_PER_ROAD; i += 1) {
            addRandomCar(road);
        }
        return road;
    }

    function init() {
        var i;
        var canvas = getCanvas();
        width = canvas.width;
        height = canvas.height;
        initCanvas();
        world = new World(canvas.width, canvas.height);
        for (i = 0; i < NUM_RANDOM_ROADS; i += 1) {
            world.roads.push(randomRoad());
        }
    }

    return {
        init: init,

        start: function () {
            stop();
            intervalId = window.setInterval(function () {
                drawWorld(world);
                simulateStep(world);
            }, 100);
        },

        stop: stop,

        clear: function () {
            resetCanvas();
            init();
        }
    };


}());
