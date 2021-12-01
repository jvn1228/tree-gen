let tree = function(p) {
    // Procedurally Generated Tree
    // A peaceful demo of procedural generation, maybe fractals,
    // and maybe even (literally and figuratively) a binary (not search though) tree
    // By procedural generation we mean letting the computer make the object for us
    // using some algorithms and some randomness
    // Here we're using good ol fashioned p5.Vector addition to keep all the branches
    // connected to each other
    // Restarting the script will make a new tree

    // constants
    // These defaults can be overwritten by leaf and branch classes
    // You can adjust these to get some pretty wind-swept trees
    var jitterSpeed = 0.1;
    var jitterAmplitude = 0.05;

    // color is a p5.Vector to facilitate easy adding and subtracting of colors
    var leafColor = new p5.Vector(
        120+p.random(-20,120),
        220+p.random(-60, 30),
        35+p.random(-10,20)
    );
    var maxLeafSize = p.random(25, 250);
    var maxBranchLength = p.random(0, 4) > 1 ? p.random(125, 400) : p.random(50, 200);
    var maxThickness = p.random(2, 40);
    // grow time in milliseconds
    var growTime = 250;
    // A high branch value can cause significant lag
    var maxBranching = p.random(3, 8);

    // utility functions

    // calculate three triangle points rotating about a point
    // size is the length of the hypotenuse for simplicity's sake
    // height is set to size/3
    // Inputs: pt - p5.Vector object
    //         size - length of hypotenuse
    //         rotation - degree rotation about anchor point
    // Returns: array containing triangle coordinates [x1, y1, x2, y2, x3, y3]
    function calcTriangleCoordinates(pt, size, rotation) {
        // define triangle points
        var pts = [[-size/2, size/6],
                    [size/2, size/6],
                    [0, -size/6]];
        var coords = [0, 0, 0, 0, 0, 0];
        var anchorX, anchorY;
        // Create pt p5.Vector, rotate it, offset to x and y anchor, translate to location
        for (var i = 0; i < 3; i++) {
            this.v.set.apply(this.v, pts[i]);
            this.v.rotate(rotation);
            if (anchorX === undefined) {
                anchorX = this.v.x;
                anchorY = this.v.y;
            }
            this.v.sub(anchorX, anchorY);
            this.v.add(pt);
            coords[i*2] = this.v.x;
            coords[i*2+1] = this.v.y;
        }
        return coords;
    }

    // calculates the coordinates of a quadrilateral fill based on a p5.Vector
    // Inputs: pt - base location p5.Vector
    //         l - length (or height) of quad
    //         rotation - rotation in degrees of p5.Vector
    //         thickness - thickness of p.quad...this does not appear for horizontal
    //                      quads unfortunately
    //         taper - factor that determines ratio of thickness from bottom to top
    // Output:  Array containing quad coordinates [x1, y1, ..., x4, y4]
    function calcQuadCoordinates(pt, l, rotation, thickness, taper) {
        this.v.set(0, -l);
        this.v.rotate(rotation);
        this.v.add(pt);
        return [
            pt.x - thickness, pt.y,
            pt.x + thickness, pt.y,
            this.v.x + thickness*taper, this.v.y,
            this.v.x - thickness*taper, this.v.y
        ];
    }

    // When used with call, will take on context of leaf or branch instance
    // This function is separated out because it can be used with both
    function createJitter(speed, amplitude) {
        speed = speed || jitterSpeed;
        amplitude = amplitude || jitterAmplitude;
        // slices adjusts the modulo of p.millis() to reach 360 degrees
        // when multiplied with the speed modifier so we get the full sine wave
        var slices = 360/speed;
        // Create a random offset in the sine wave so objects using jitter
        // will move indepedently of others
        var randomSeed = p.random(1, slices);
        return function() {
            return p.sin(speed*(p.millis()+randomSeed))*amplitude;
        };
    }

    // Returns color p5.Vector used by fill, etc, from the p5.Vector
    function vec2color(v) {
        return [v.x, v.y, v.z];
    }

    // Leaf class
    // Attrs: pt - p5.Vector with x and y locs of anchor
    //        size - size of leaf
    //        rotation - rotation degrees about anchor point
    //        color - p5.Vector color of leaf, some random shading is added per leaf
    var Leaf = (function() {
        function Leaf(pt, size, rotation, color) {
            var color = color.copy();
            color.add(p.random(-20, 20), p.random(-20, 20), p.random(-20, 20));
            this.color = vec2color(color) || [0, 255, 0];
            // Add some transparency for a blended effect
            this.color.push(180);
            this.maxSize = (size || maxLeafSize) + p.random(-50, 50);
            if (this.maxSize < 1) {
              this.maxSize = 1;
            }
            this.pt = pt || new p5.Vector();
            this.rotation = rotation || 0;

            // Internal state
            this.z = this.rotation;
            this.spawnTime = p.millis();
            this.mature = false;
            this.size = 1;

            this.calcJitter = createJitter(0.25, 0.15);

            // Allocate working p5.Vector
            this.v = new p5.Vector();
        }
        Leaf.prototype = {
            render: function() {
                if (!this.mature) {
                    this.grow();
                }
                this.jitter();
                p.fill.apply(p, this.color);
                var triangleCoords = calcTriangleCoordinates.call(
                    this, this.pt, this.size, this.z
                );
                p.triangle.apply(p, triangleCoords);
            },
            jitter: function() {
                this.z = this.rotation + this.calcJitter();
            },
            // change location of leaf anchor point
            setPt: function(x, y) {
                this.pt.set(x, y);
            },
            // increase leaf size over grow time
            grow: function() {
                var delta = p.millis() - this.spawnTime;
                if (delta > growTime) {
                    this.mature = true;
                }
                this.size = p.map(delta, 0, growTime, 1, this.maxSize);
            }
        };

        return Leaf;
    }());

    // branch class
    // Attrs: branching (required) - what level of branching we're at, from 0
    //        pt - p5.Vector location
    //        l - length of branch
    //        rotation - degree rotation of branch
    //        color - color of branch
    var Branch = (function() {
        function Branch(branching, pt, l, rotation, color) {
            this.pt = pt || new p5.Vector();
            this.l = l || 1;
            // note that rotation is from vertical
            this.rotation = rotation || 0;
            this.z = this.rotation;
            this.color = color || [55, 45, 15];
            this.branching = branching;

            // Internal state
            this.thickness = 2;
            this.taper = 0.25;
            this.leaves = [];
            this.branches = [];
            this.mature = false;
            this.leavesGrown = false;
            this.spawnTime = p.millis();

            this.maxLength = maxBranchLength / (this.branching+1);
            this.maxThickness = maxThickness / (this.branching+1);

            // Allocate working p5.Vector
            this.v = new p5.Vector();

            this.calcJitter = createJitter(0.15);
        }

        Branch.prototype = {
            // Render itself and all children leaves/branches
            render: function() {
                if (!this.mature){
                    this.grow();
                }
                this.jitter();
                p.fill.apply(p, this.color);
                var quadCoords = calcQuadCoordinates.call(
                    this, this.pt, this.l, this.z, this.thickness, this.taper
                );
                p.quad.apply(p, quadCoords);

                if (this.branches.length) {
                    this.branches[0].setPt(quadCoords[4], quadCoords[5]);
                    this.branches[1].setPt(quadCoords[6], quadCoords[7]);
                    this.branches[0].render();
                    this.branches[1].render();
                }
                if (this.leaves.length) {
                    this.leaves[0].setPt(quadCoords[4], quadCoords[5]);
                    this.leaves[1].setPt(quadCoords[6], quadCoords[7]);
                    this.leaves[0].render();
                    this.leaves[1].render();
                }
            },
            jitter: function() {
                this.z = this.rotation + this.calcJitter();
            },
            addLeaf: function(rotation) {
                this.leaves.push(new Leaf(
                    new p5.Vector(),
                    p.random(20,40),
                    rotation,
                    leafColor
                ));
            },
            addBranch: function(branching, rotation) {
                this.branches.push(new Branch(
                    branching,
                    new p5.Vector(),
                    1,
                    rotation
                ));
            },
            // Change location of branch anchor point
            setPt: function(x, y) {
                this.pt.set(x, y);
            },
            // Grow function called during grow time
            // Will extend the branch length and add leaves halfway through
            // and branches at the end of grow time
            grow: function() {
                var delta = p.millis()-this.spawnTime;
                if (delta > growTime) {
                    this.mature = true;
                    if (this.branching < maxBranching) {
                        // 2 node branches
                        var maxAngle = 360/(this.branching+1);
                        this.addBranch(this.branching+1, 30+p.random(-maxAngle,maxAngle));
                        this.addBranch(this.branching+1, -30+p.random(-maxAngle,maxAngle));
                    }
                }
                if (this.l < this.maxLength ) {
                    this.l = p.map(delta, 0, growTime, 1, this.maxLength);
                    this.thickness =p.map(delta, 0, growTime, 1, this.maxThickness);
                }
                if (!this.leavesGrown && delta > growTime/2) {
                    // 2 node leaves
                    this.addLeaf(0+this.rotation);
                    this.addLeaf(180+this.rotation);
                    this.leavesGrown = true;
                }
            }
        };

        return Branch;
    }());

    function generateTree() {
        // color is a p5.Vector to facilitate easy adding and subtracting of colors
        leafColor = new p5.Vector(
            120+p.random(-20,120),
            220+p.random(-60, 30),
            35+p.random(-10,20)
        );
        maxLeafSize = p.random(25, 250);
        maxBranchLength = p.random(25, 400);
        maxThickness = p.random(2, 40);
        // A high branch value can cause significant lag
        maxBranching = p.random(3, 9);
        p.noLoop();
        delete p.mainBranch;
        p.mainBranch = new Branch(0, new p5.Vector(p.width/2, p.height), p.random(1, p.height/2));
        p.mainBranch.thickness = p.random(2, 40);
        p.loop();
    }

    p.setup = function() {
      p.createCanvas(960, 960);
      p.noStroke();
      p.background(209, 209, 190);
      p.angleMode(p.DEGREES);
      p.mainBranch = new Branch(0, new p5.Vector(p.width/2, p.height), p.random(1, p.height/2));
      p.mainBranch.thickness = p.random(2, 40);

      let button = p.createButton('Generate');
      button.mousePressed(generateTree);
    };

    p.draw = function() {
      p.background(209, 209, 190);
      p.mainBranch.render();
    }
};

let myp5 = new p5(tree);
