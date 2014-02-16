/*global define */
define(['util/mathUtil', 'util/vector', 'util/car', 'util/road', 'util/consts'],
    function (mathUtil, Vector, Car, Road, consts) {
        'use strict';

        /** @type {number}
         * @const */
        var TARGET_FPS = 30;


        /** @type {number} */
        var deltaT = (1 / TARGET_FPS);
        /** @type {number} */
        var deltaTSquared = deltaT * deltaT;

        /** @type {World} */
        var world;

        /** @type {number} */
        var width;
        /** @type {number} */
        var height;
        /** @type {number} */
        var runCount = 0;

        /** @type {Array.<boolean>} */
        var shouldStop = [];

        /** @type {HTMLCanvasElement} */
        var _canvas;
        /** @type {CanvasRenderingContext2D} */
        var _context;
        /** @type {ImageData} */
        var _backgroundImage;

        /** @type {HTMLElement} */
        var _fpsElem;


        /**
         * @param {number} size
         * @returns {{clear: function(), add: function(number), getResult: function():number}}
         */
        function movingAverage(size) {
            var data = [];

            function clear() {
                var i;
                for (i = 0; i < size; i += 1) {
                    data[i] = 0;
                }
            }

            clear();
            return {
                clear: clear,
                add: function (value) {
                    data.push(value);
                    data.shift();
                },
                getResult: function () {
                    var i, result = data[0];
                    for (i = 1; i < size; i += 1) {
                        result += data[i];
                    }
                    return result / size;
                }
            };
        }


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
         * @param {CanvasRenderingContext2D} context
         * @param {World} world
         */
        function drawWorld(context, world) {
            var i;
            /** @type {Road} */
            var road;

            function drawCar(road, car, nextCar) {
                var position = road.roadToWorldPosition(car.position);
                var style = car.color;
                if (car.wrecked) {
                    style = consts.WRECKED_CAR_STYLE;
                }
                context.fillStyle = style;
                // This really slows things down:
//            if (Math.abs(car.accel) < DELTA) {
//                context.shadowColor = 'black';
//            } else if (car.accel < 0) {
//                context.shadowColor = 'red';
//            } else {
//                context.shadowColor = 'green';
//            }
//            context.shadowBlur = 4;
                context.fillRect(position.x, position.y, car.length, car.length);
            }

            for (i = 0; i < world.roads.length; i += 1) {
                road = world.roads[i];
                road.forEachCar(drawCar);
            }
        }

        /**
         * @param {HTMLCanvasElement} canvas
         * @param {CanvasRenderingContext2D} context
         * @param {World} world
         * @returns {ImageData}
         */
        function drawBackground(canvas, context, world) {
            /** @type {Road} */
            var road;
            /** @type {number} */
            var i;
            for (i = 0; i < world.roads.length; i += 1) {
                road = world.roads[i];
                road.draw(context);
            }
            return context.getImageData(0, 0, canvas.width, canvas.height);
        }

        /**
         * @param {Road} road
         * @param {Car} car
         * @param {?Car} nextCar
         */
        function simulateCar(road, car, nextCar) {
            var distanceToNextCarBackside = null;
            var closingSpeed;
            var impactTime;
            if (car.wrecked) {
                return;
            }
            car.accel = car.maxAcceleration;
            if (nextCar) {
                closingSpeed = car.speed - nextCar.speed;
                distanceToNextCarBackside = nextCar.position - car.position;
                while (distanceToNextCarBackside < 0) {
                    distanceToNextCarBackside += road.length;
                }
                if (Math.abs(closingSpeed) > consts.DELTA) {
                    impactTime = distanceToNextCarBackside / closingSpeed;
                } else {
                    impactTime = -1;
                }
                if (impactTime < 0) {
                    // never going to impact, closing speed is negative (actually gaining distance) or very, very small.
                    car.accel = car.maxAcceleration;
                } else if (impactTime <= consts.MIN_IMPACT_TIME) {
                    car.accel = -car.maxAcceleration;
                }

                if ((car.speed > consts.DELTA) && (distanceToNextCarBackside / car.speed < car.minKeepingTime)) {
                    car.accel = -car.maxAcceleration;
                }
                if (distanceToNextCarBackside < consts.MIN_KEEPING_DISTANCE) {
                    car.accel = -car.maxAcceleration;
                }
            }
            car.speed = Math.min(car.maxSpeed, Math.max(0, car.speed + car.accel * deltaT));
            car.position += car.speed * deltaT + 0.5 * car.accel * deltaTSquared;
            if ((null !== distanceToNextCarBackside) && (distanceToNextCarBackside - closingSpeed + consts.COLLISION_DISTANCE_DELTA < car.length)) {
                // Wreck!
                car.position = nextCar.position - car.length;
                car.wreck();
                nextCar.wreck();
            }
            while (car.position > road.length) {
                car.position -= road.length;
            }
            while (car.position < 0) {
                car.position += road.length;
            }
        }

        function simulateStep(world) {
            var i;
            /** @type {Road} */
            var road;
            for (i = 0; i < world.roads.length; i += 1) {
                road = world.roads[i];
                road.forEachCar(simulateCar);
                road.sortCars();
            }
        }


        function stop() {
            shouldStop[runCount] = true;
            runCount += 1;
        }

        function resetCanvas() {
            // Store the current transformation matrix
            _context.save();

            // Use the identity matrix while clearing the canvas
            _context.setTransform(1, 0, 0, 1, 0, 0);
            _context.clearRect(0, 0, width, height);
            _context.putImageData(_backgroundImage, 0, 0);

            // Restore the transform
            _context.restore();
        }


        function init() {
            var i;
            _canvas = getCanvas();
            _context = getContext(_canvas);
            _fpsElem = document.getElementById('fps');

            width = _canvas.width;
            height = _canvas.height;
            world = new World(_canvas.width, _canvas.height);
            for (i = 0; i < consts.NUM_RANDOM_ROADS; i += 1) {
                world.roads.push(Road.random(width, height));
            }
            _context.setTransform(1, 0, 0, 1, 0, 0);
            _context.clearRect(0, 0, width, height);
            _backgroundImage = drawBackground(_canvas, _context, world);
            resetCanvas();
        }

        return {
            init: init,

            start: function () {
                var currentRunCount;
                var lastRedrawTime;
                var elapsedQueue = movingAverage(4);
                var context = _context;

                function drawFPS(fps) {
                    _fpsElem.innerHTML = '' + fps + ' fps';
//                context.fillStyle = 'black';
//                context.shadowBlur = 0;
//                context.fillText('' + fps + ' fps', 10, 10);
                }

                function updateDeltaT() {
                    var now = Date.now();
                    var elapsed = now - lastRedrawTime;
                    var averageElapsed = elapsedQueue.getResult();
                    var fps = Math.floor(1000.0 / averageElapsed);
                    lastRedrawTime = Date.now();
                    elapsedQueue.add(elapsed);
                    deltaT = elapsed / 1000.0;
                    /** @type {number} */
                    deltaTSquared = deltaT * deltaT;
                    drawFPS(fps);
                }

                function loop() {
                    updateDeltaT();
                    window.setTimeout(function () {
                        resetCanvas();
                        drawWorld(context, world);
                        simulateStep(world);
                        if (shouldStop[currentRunCount]) {
                            return;
                        }
                        loop();
                    }, (1000.0 / TARGET_FPS));
                }

                stop();
                currentRunCount = runCount;
                loop();
            },

            stop: stop,

            clear: function () {
                resetCanvas();
                init();
            }
        };


    });
