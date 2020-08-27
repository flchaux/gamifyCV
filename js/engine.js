
var GameWindow = new Class({
    framerate: 60,
    canvas: null,
    context: null,
    background: null,
    internalScrolling: {x:0, y:0},
    gameObjects: new Array(),
    centerCamera: null,
    currentLevel: null,
    initialize: function(canvas, context, startLevel){
        var gameWindow = this;
        this.canvas = canvas;
        this.context = context;
        this.currentLevel = startLevel;
        window.setInterval(function(){
            gameWindow.redraw();
        }, 1000/this.framerate);
    },
    loadLevel: function(level){
        this.currentLevel = level;
    },
    loadJSONLevel: function(name){
        var game = this;
        new Request.JSON({
            url: 'js/'+name+'.json',
            async: false,
            onSuccess: function(json){
                var level = new Level();
                level.setBackground(json.background);
                level.size = json.size
                level.backgroundRepeatX = json["background-repeat-x"];
                level.backgroundRepeatY = json["background-repeat-y"];
                for(var i = 0; i < json.gameObjects.length; i ++){
                    var image = null;
                    var size = null;
                    if(json.gameObjects[i].size){
                        size = json.gameObjects[i].size;
                    }
                    if(json.gameObjects[i].img){
                        image = new Image();
                        image.src = json.gameObjects[i].img;
                    }
                    for(var j = 0; j < json.gameObjects[i].positions.length; j ++){
                        var gameObject = new GameObject(level, image, json.gameObjects[i].positions[j]);
                        gameObject.tags = json.gameObjects[i].tags;
                        if(size)
                            gameObject.size = size;
                        if(json.gameObjects[i].positions[j].size){
                            gameObject.size = json.gameObjects[i].positions[j].size;
                            gameObject.id = json.gameObjects[i].positions[j].id;
                        }
                    }
                }
                game.loadLevel(level);
            }
        }).get();
    },
    redraw: function(){
        var self = this;
        this.context.clearRect(0,0,this.canvas.width, this.canvas.height);
        if(this.currentLevel.background){
            if(this.currentLevel.backgroundRepeatX){
                for(var x = 0; x < this.currentLevel.size.x; x += this.currentLevel.background.width){
                    this.context.drawImage(this.currentLevel.background, 0, 0, this.canvas.width, this.canvas.height, x, 0, this.canvas.width, this.canvas.height);
                }
            }
            else{
                var width = this.currentLevel.background.width;
                if(Browser.firefox ){
                    width -= this.internalScrolling.x;
                }
                this.context.drawImage(this.currentLevel.background, this.internalScrolling.x, this.internalScrolling.y, this.currentLevel.background.width, this.currentLevel.background.height, 0, 0, width, this.currentLevel.background.height);
            }
        }
        // Move gameobjects
        this.currentLevel.gameObjects.each(function(element){
            // Collide detection
            if(element.moved){
                self.currentLevel.gameObjects.each(function(other){
                    var collideInfos = element.checkCollision(other, element.moveOrder);
                    if(element != other && collideInfos){
                        if(collideInfos){
                            element.onCollide(other);
                        }
                    }
                });
            }
            // Move
            element.position.x += element.moveOrder.x;
            element.position.y += element.moveOrder.y;
            element.moveOrder = {x: 0, y: 0};
        });
        // Update internal scrolling to center camera on game object
        if(this.centerCamera){
            if(this.internalScrolling.x != this.centerCamera.position.x+this.centerCamera.size.x/2 - this.canvas.width/2){
                this.moveInternalScrollHorizontal(this.centerCamera.position.x+this.centerCamera.size.x/2 - this.canvas.width/2 - this.internalScrolling.x);
                this.moveInternalScrollVertical(this.centerCamera.position.y - this.internalScrolling.y);
            }
        }
        // Display game object
        this.currentLevel.gameObjects.each(function(element){
            if(element.currentAnimation){
                var animation = element.currentAnimation;
                self.context.drawImage(animation.image, 0, animation.getCurrentOffset(), animation.image.width, animation.getStepHeight(), element.position.x-self.internalScrolling.x, element.position.y-self.internalScrolling.y, animation.image.width, animation.getStepHeight());
            }
            else if(element.image){
                self.context.drawImage(element.image, element.position.x-self.internalScrolling.x, element.position.y-self.internalScrolling.y);
            }
            element.draw();
        });
    },
    moveInternalScrollHorizontal: function(x){
        if(this.internalScrolling.x + x > 0 && this.internalScrolling.x+x <= this.currentLevel.size.x - this.canvas.width){
            this.internalScrolling.x += x;
            return true;
        }
        return false;
    },
    moveInternalScrollVertical: function(y){
        if(this.internalScrolling.y + y > 0 && this.internalScrolling.y+y <= this.currentLevel.size.y - this.canvas.heigth){
            this.internalScrolling.y += y;
            return true;
        }
        return false;
    },
    centerCameraOn: function(gameObject){
        this.centerCamera = gameObject;
    }
});

var Level = new Class({
    gameObjects: new Array(),
    background: null,
    size: {x: 0, y: 0},
    "background-repeat-x": false,
    "background-repeat-y": false,
    addElement: function(element){
        this.gameObjects.push(element);
    },
    setBackground: function(imageSrc){
        var self = this;
        var background = new Image();
        background.src = imageSrc;
        background.onload = function(){ 
            self.background = background;
            self.levelLoad();
        };
    },
    levelLoad: function(){
        
    }
});

var Sound = new Class({
    loop: false,
    audio: null,
    initialize: function(src, loop){
        this.audio = new Audio(src);
        this.loop = loop;
        var sound = this;
        
        this.audio.addEventListener("ended", function() { 
            this.played = false;
            if(sound.loop){
                sound.audio.play();
            }
        }, true);
    },
    play: function(){
        this.played = true;
        this.audio.play();
    }
});

var GameObject = new Class({
    level: null,
    collider: true,
    hitRect: {x:0,y:0,w:-1,h:-1},
    moved: false,
    moveOrder: {x: 0, y: 0},
    id: -1,
    initialize: function(level, imageSrc, position, size){
        var self = this;
        this.level = level;
        this.position.x += position.x;
        this.position.y += position.y;
        this.level.addElement(self);
        if(typeof(imageSrc) == 'string')
            this.setImageSrc(imageSrc);
        else if(typeof(imageSrc) == 'object')
            this.setImage(imageSrc);
    },
    position: {
        x: 0,
        y: 0
    },
    size: {
        x: 0,
        y: 0
    },
    tags: new Array(),
    image : null,
    currentAnimation: null,
    move: function(x, y){
        this.moveOrder.x = x;
        this.moveOrder.y = y;
        this.moved = true;
    },
    draw: function(){
        this.moved = false;
    },
    setImageSrc: function(src){
        var image = new Image();
        image.src = src;
        this.setImage(image);
    },
    setImage: function(image){
        this.image = image;
        if(image){
            if(image.complete){
                this.imageLoaded();
            }
            else{
                var self = this;
                this.image.addEvent('load', function(){
                    self.imageLoaded();
                });
            }
        }
    },
    imageLoaded: function(){
        // If no size has been defined
        if(this.size.x == 0 && this.size.y == 0){
            this.size.x = this.image.width;
            this.size.y = this.image.height;
        }
        if(this.hitRect.w == -1){
            this.hitRect.w = this.image.width;
            this.hitRect.h = this.image.height;
        }
    },
    startAnimation: function(animation){
        this.currentAnimation = animation;
        animation.start();
    },
    stopAnimation: function(){
        if(this.currentAnimation != null)
            this.currentAnimation.stop();
        this.currentAnimation = null;
    },
    checkCollision: function(other, moveOrder){
        if(typeof(moveOrder) == 'undefined'){
            moveOrder = {x: 0, y: 0};
        }
        var x = this.position.x + this.hitRect.x + moveOrder.x;
        var y = this.position.y + this.hitRect.y + moveOrder.y;
        var w = x + this.hitRect.w;
        var h = y + this.hitRect.h;
        if((w > other.position.x && w < other.position.x+other.size.x
                || x > other.position.x && x < other.position.x+other.size.x)
                &&
               (h > other.position.y && h < other.position.y+other.size.y
                || y > other.position.y && y < other.position.y+other.size.y)){
            return true;
        }
        return false;
    },
    onCollide: function(other){
        
    }
});

var Character = new Class({
    Extends: GameObject,
    speed: 15,
    imageLeft: null,
    rightAnimation: null,
    orientation: 'Right',
    initialize: function(level, imageRightSrc, position){
        this.imageLeft = new Image();
        this.imageRight = new Image();
        this.imageRight.src = imageRightSrc;
        this.parent(level, this.imageRight, position);
        this.collider = true;
    },
    moveRight: function(){
        this.orientation = 'Right';
        if(this.rightAnimation != this.currentAnimation){
            this.startAnimation(this.rightAnimation);
        }
        this.move(this.speed, 0 );
    },
    move: function(x, y){
        this.moveOrder.x = x;
        this.moveOrder.y = y;
        this.moved = true;
    },
    stop: function(){
        this.lastMove = 'Stop';
        this.stopAnimation();
        this.setImage(this.imageRight);
        this.moveOrder.x = 0;
        this.moveOrder.y = 0;
    },
    setRightAnimation: function(animation){
        this.rightAnimation = animation;
    },
    onCollide: function(other){
        if(other.tags.contains("box")){
            stop();
            this.moveOrder.x = 0;
            this.moveOrder.y = 0;
        }
        else if(other.tags.contains("checkpoint")){
            this.onCollideCheckpoint(other);
        }
    },
    onCollideCheckpoint: function(checkpoint){
        
    }
});

var Animation = new Class({
    duration: 0,
    stepNumber: 1,
    currentStep: 0,
    image: null,
    startTime: 0,
    gameObject: null,
    started: false,
    timer: null,
    initialize: function(gameObject, imageSrc, step, duration){
        this.image = new Image();
        this.image.src = imageSrc;
        this.stepNumber = step;
        this.gameObject = gameObject;
        this.duration = duration;
    },
    start: function(){
        this.startTime = new Date().getTime();
        this.currentStep = 0;
        this.started = true;
    },
    stop: function(){
        this.started = false;
    },
    getCurrentOffset: function(){
        if(new Date().getTime() - this.startTime > (this.duration/this.stepNumber)*this.currentStep){
            this.currentStep ++;
        }
        return (this.image.height/this.stepNumber)*(this.currentStep % this.stepNumber);
    },
    getStepHeight: function(){
        return this.image.height/this.stepNumber;
    },
    isStarted: function(){
        return this.started;
    }
});

var PlatformGameController = new Class({
    target: null,
    activate: true,
    initialize: function(target){
        this.target = target;
    },
    onInput: function(input){
        if(this.activate){
            if(input.key == 'd' || input.key == 'right'){
                this.target.moveRight();
            }
        }
    },
    onStop: function(event){
        if(this.activate){
            this.target.stop();
        }
    }
});