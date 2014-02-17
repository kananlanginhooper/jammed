/*global define*/
define({

    /** @type {number}
     * @const */
    TARGET_FPS: 30,

    /** @type {number}
     * @const */
    MAX_ACCELERATION: 8,

    /** @type {number}
     * @const */
    MIN_MAX_ACCELERATION: 2,


    /** @type {string}
     * @const */
    WRECKED_CAR_STYLE: 'black',

    /** @type {number}
     * @const */
    MAX_SPEED: 100,

    /** @type {number}
     * @const */
    MIN_MAX_SPEED: 70,

    /**
     * Minimum travel time to next car's rear, that cars keep while in motion.
     * @type {number}
     * @const */
    MAX_KEEPING_TIME: 2,
    /** @type {number}
     * @const */
    MIN_KEEPING_TIME: 0.5,

    /** @type {number}
     * @const */
    MIN_CAR_LENGTH: 5,

    /** @type {number}
     * @const */
    MAX_CAR_LENGTH: 8,


    /**
     * Minimum time-to-impact, under which cars start braking.
     * @type {number}
     * @const */
    MIN_IMPACT_TIME: 1,


    /** @type {number}
     * @const */
    MIN_KEEPING_DISTANCE: 1,

    /**
     * General delta for floating-point comparisons
     * @type {number}
     * @const
     * */
    DELTA: 0.001,

    /** @type {number}
     * @const */
    MAX_RANDOM_ROAD_POINTS: 10,

    /** @type {number}
     * @const */
    NUM_RANDOM_CARS_PER_ROAD: 10,

    /** @type {number}
     * @const */
    NUM_RANDOM_ROADS: 1,

    LANES_PER_ROAD: 2

});
