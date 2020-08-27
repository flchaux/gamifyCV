

function ajouterLigne(text){
    var ligne = new Element('li');
    ligne.set('html', text);
    var myFx = new Fx.Tween(ligne, {
        duration: 'long',
        transition: 'bounce:out',
        link: 'cancel',
        property: 'margin-top'
    });
    ligne.setStyle('margin-top', -200);
    cv.adopt(ligne);
    myFx.start(-100, 0);
}
var cv;
var etape = 0;

var textEtape = [
    "8 ans - Création d'un jeu de carte",
    "12 ans - Premier jeu sur GameMaker",
    "16 ans - Création de jeux en ligne",
    "20 ans - Parmi les majors en C, C++, Java, C#, PHP",
    "23 ans - 3 ans d’expérience : serious gaming, soft multiplateforme, ...",
    "Et maintenant ? A vous de me le dire !"
];
window.onload = function() {
    
    
    var canvas = $('GameWindow');
    var context = canvas.getContext('2d');
    
    var firstLevel = new Level();
    firstLevel.setBackground('img/background.png');
    firstLevel.levelLoad = function(){
        loadingInProgress.dispose();
    };
    var gameWindow = new GameWindow(canvas, context);
    gameWindow.loadJSONLevel('level1');
    
    
    var mainCharacter = new Character(gameWindow.currentLevel, "img/perso_arret.png", {x:100, y:75});
    var animationRight = new Animation(mainCharacter, "img/perso_anim.png", 3, 500);
    mainCharacter.setRightAnimation(animationRight);
    var imageFace = new Image();
    imageFace.src = "img/perso_face.png";
    var imageFin = new Image();
    imageFin.src = "img/perso_fin.png";
    
    var checkpointSound = new Sound("sounds/Woosh.mp3");
    
    gameWindow.centerCameraOn(mainCharacter);
    var controller = new PlatformGameController(mainCharacter);
    
    window.addEvent('keydown', function(event){
        controller.onInput(event);
    });
    window.addEvent('keyup', function(key){
        controller.onStop(key);
    });
    
    cv = $("CV");
    cv.setStyle('width', ($$('body')[0].getSize().x - $('Laptop').getSize().x)/2);
    $('LienCV').setStyle('width', ($$('body')[0].getSize().x - $('Laptop').getSize().x)/2);
    var messageFin = $('EndMessage');
                messageFin.setStyle('display', 'none');
    var top = messageFin.getStyle('top').toInt();
    //messageFin.setStyle('top', top+100);

    mainCharacter.onCollideCheckpoint = function(element){
        if(etape+1 == element.id){
            checkpointSound.play();
            ajouterLigne(textEtape[etape]);
            etape ++;
            mainCharacter.stop();
            controller.activate = false;
            if(etape == 6){
                mainCharacter.setImage(imageFin);
                //messageFin.tween('top', top+100, top);
                messageFin.setStyle('display', 'block');
            }
            else{
                mainCharacter.setImage(imageFace);
                window.setTimeout(function(){
                    controller.activate = true;
                }, 1000);
            }
            
        }
    };
    
};