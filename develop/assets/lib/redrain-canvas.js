/**
 * 红包雨-canvas
 * 依赖jQuery
 * 
 * @author liting
 * @since 2017-06-30
 */
(function() {
    // 定义requestAnimationFrame
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame) window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() {
            callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
    if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}());

// 阻止touchmove对页面的映像
(function forbidOverMove() {
    window.ontouchmove = function(e) {
        e.preventDefault && e.preventDefault();
        e.returnValue = false;
        e.stopPropagation && e.stopPropagation();
        return false;
    }
})();

// 红包雨util
var util = {
    //向已知dom后添加新元素
    appendChildDom: function(domChild, domParent) {
        domParent.append(domChild);
    },
    //创建空的canvas
    createCanvas: function(width, height, id, parentDOM) {
        var canvas = $('<canvas></canvas>');
        canvas.attr({
            id: id,
            width: width,
            height: height
        });
        this.appendChildDom(canvas, parentDOM);
        return canvas;
    },
    //随机数创建
    random: function(start, end, type) {
        if (type) {
            return Math.random() * (end - start) + start;
        } else {
            return (Math.random() * ((end - start + 1)) << 0) + start;
        }
    },
    // 设置背景图片
    setBackground: function(url, node) {
        node.css({
            background: 'url(' + url + ') no-repeat',
            WebkitBackgroundSize: 'cover',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            webkitUserSelect: 'none',
            MozUserSelect: 'none',
            MsUserSelect: 'none',
            userSelect: 'none'
        })
    }
};

/**
 * redrain
 *
 * @method Fn
 * @param
 *     option: {
 *          WIDTH       {int}   canvas宽
 *          HEIGHT      {int}   canvas高
 *          backgroundUrl    {arr}   背景图片
 *          redImages: [{ 
 *              url: '',        红包图片
 *              width: '',      宽度
 *              height: ''      高度
 *              }]
 *          sounds      {arr}   点击红包音效 eg:['地址','地址']
 *          redOdds        {int}   单次出现红包的概率
 *          dropSpeed           {int}   初始速度
 *          timeInterval
 *          dv          {int}   变化速度
 *     }
 *          callback{fn}    结束回调函数        
 * @return {KISSYOverlay}
 */
//定义全局变量
var oRed, touchX, touchY, startframetime, lastframetime = 0,
    diffframetime, canvas, ctx, canvas_w, canvas_h, isGameover, nGetRedTotal, isStartGame, createRedTimer, timeInterval,
    dropSpeed, gameCountDown;
var Fn = function(options, callback_countdown, callback_gameover) {
    canvas_w = options.WIDTH || $(window).width() * 1;
    canvas_h = options.HEIGHT || $(window).height() * 2;
    timeInterval = options.timeInterval || 300;
    this.option = options;
    // 旋转平移参数
    this.nRotate = 35;
    this.nTranslateX = 100;
    this.nTranslateY = -300;
    this.redOdds = options.redOdds || 0.6;

    // 创建画布
    canvas = util.createCanvas(canvas_w, canvas_h, "canvas", $('.rdgame-wrapper'))[0];
    ctx = canvas.getContext('2d');
    this.nDevicePixelRatio = 2 || window.devicePixelRatio;
    // Retina屏抗锯齿
    if (this.nDevicePixelRatio) {
        canvas.style.width = canvas_w + "px";
        canvas.style.height = canvas_h + "px";
        canvas.height = canvas_h * this.nDevicePixelRatio;
        canvas.width = canvas_w * this.nDevicePixelRatio;
        ctx.scale(this.nDevicePixelRatio, this.nDevicePixelRatio);
    }
    // 旋转平移
    // ctx.rotate(this.nRotate * Math.PI / 180);
    // ctx.translate(this.nTranslateX, this.nTranslateY);

    // 已获取红包个数
    nGetRedTotal = 0;
    // 活动开关（控制红包）
    isStartGame = false;

    // 都秒结束的回掉函数
    this.callback_countdown = callback_countdown;
    // 结束的回掉函数
    this.callback_gameover = callback_gameover;

    this.init();
};

// 初始化画布
Fn.prototype.init = function() {
    var _this = this;
    _this.countdown(function() {
        var intervalTimes = 0; // 产生次数
        var originOdds = _this.redOdds;
        oRed = new red(_this.option);
        createRedTimer = setInterval(function() {
            if (intervalTimes > 20 && intervalTimes < 80) {
                _this.redOdds = 1;
            } else {
                _this.redOdds = originOdds;
            }
            if (isGameover) {
                clearInterval(createRedTimer);
                ctx.clearRect(0, 0, canvas_w, canvas_h);
                _this.callback_gameover && _this.callback_gameover(nGetRedTotal);
                return;
            }
            if (Math.random() < _this.redOdds) {
                // 生成红包
                oRed.create();
            }
            intervalTimes++;
        }, timeInterval);
        canvas.addEventListener('touchstart', _this.touchHandler, false);
        // 开始动画
        _this.animate();
    });
};

// 游戏开始倒计时
Fn.prototype.countdown = function(callback) {
    var _this = this;
    var time_meter = 3;
    var nWinWidth = $(window).width();
    var nWinHeight = $(window).height();
    var div = $('<div class="count"></div>');
    var span = $('<span class="num"></span>');
    div.css({
        display: "inline",
        width: '332px',
        height: '400px',
        position: "fixed",
        zIndex: 99999,
        top: (nWinHeight - 400) / 2 - 20 + "px",
        left: (nWinWidth - 332) / 2 + "px",
        background: "url('./assets/img/redpacket_count@2x.png') no-repeat",
        backgroundSize: "100% auto",
        backgroundPosition: "center"
    });
    var numImageList = [
        './assets/img/redpacket_numberGo@2x.png',
        './assets/img/redpacket_number1@2x.png',
        './assets/img/redpacket_number2@2x.png',
        './assets/img/redpacket_number3@2x.png'
    ];
    var spanStyle = {
        display: "block",
        position: "absolute",
        width: "65px",
        height: "90px",
        top: "208px",
        left: "132px",
        background: "url(" + numImageList[3] + ") no-repeat",
        backgroundPosition: "center",
        backgroundSize: "auto 100%"
    }
    span.css(spanStyle);

    util.appendChildDom(div, $('body'));
    util.appendChildDom(span, div);
    var countInterval = setInterval(function() {
        if (time_meter < 1) {
            clearInterval(countInterval);
            $('body>div.count').remove();
            _this.callback_countdown();
            callback && callback();
            return
        }
        spanStyle = $.extend(true, spanStyle, {
            background: "url(" + numImageList[time_meter - 1] + ") no-repeat",
        });
        if (time_meter == 1) {
            spanStyle = $.extend(true, spanStyle, {
                width: "100px",
                height: "90px",
                top: "208px",
                left: "115px",
            });
        }
        span.css(spanStyle)

        time_meter--;
    }, 1000)
};

//绑定touch事件
Fn.prototype.touchHandler = function(e) {
    if (isGameover) {
        return;
    }
    var o = e.targetTouches[0];
    touchX = o.clientX;
    touchY = o.clientY;
    var oIsGet = oRed.isGet();
    if (oIsGet.isGet) {
        //红包数目++
        ++nGetRedTotal;
        oIsGet.exportItem.isBig = true;
        oIsGet.exportItem.sound.play();
        $(".red-sum span").html(nGetRedTotal);
    }
};

// 循环每一帧
Fn.prototype.animate = function() {
    var _this = this;
    lastframetime = new Date();

    function game() {
        requestAnimationFrame(game);
        ctx.clearRect(0, 0, canvas_w, canvas_h);
        var now = new Date();
        startframetime = startframetime || new Date();
        diffframetime = now - lastframetime;
        lastframetime = now;
        var durationframetime = now - startframetime;
        if (durationframetime > 10000) {
            isGameover = true;
            return;
        }
        oRed.move();
        oRed.draw();
    }
    //game();
    var timer = setInterval(function() {
        ctx.clearRect(0, 0, canvas_w, canvas_h);
        var now = new Date();
        startframetime = startframetime || new Date();
        // diffframetime = 2;
        diffframetime = now - lastframetime;
        lastframetime = now;
        var durationframetime = now - startframetime;
        var second = 10 - Math.floor(durationframetime / 1000);
        if (gameCountDown != second) {
            gameCountDown = second;
            $(".remaint-time span").html(gameCountDown);
            if (gameCountDown <= 0) {
                isGameover = true;
                clearInterval(timer);
                return;
            }
        }
        oRed.move();
        oRed.draw();
    }, 1)
};

/**
 * 红包对象
 * @param  {[type]} option [description]
 * @return {[type]}        [description]
 */
var red = function(option) {
    this.dropSpeed = option.dropSpeed;
    this.redList = [];
    this.imgList = [];
    this.soundList = [];
    for (var i = 0; i < option.imgList.length; i++) {
        var img = new Image();
        img.src = option.imgList[i];
        this.imgList.push(img);
    }
    for (var i = 0; i < option.soundList.length; i++) {
        var sound = new Audio();
        sound.src = option.soundList[i];
        this.soundList.push(sound);
    }
};

// 创建红包
red.prototype.create = function() {

    var img = this.imgList[util.random(0, this.imgList.length - 1)];
    var width = img.width;
    var height = img.height;
    var x = util.random(0, canvas_w - width);
    var y = -height;
    var speed = util.random(-0.1, 0.1, true) + this.dropSpeed;
    var size = 1;
    var sound = this.soundList[util.random(0, this.soundList.length - 1)];
    var isBig = false;

    this.redList.push({
        x: x,
        y: y,
        speed: speed,
        size: size,
        sound: sound,
        img: img,
        width: width,
        height: height,
        isBig: isBig,
        touchTime: null
    })
};

// 销毁红包
red.prototype.destroy = function(index) {
    if (typeof index != 'undefined') {
        this.redList.splice(index, 1);
    } else {
        this.redList = [];
    }
};

// 每一帧变动
red.prototype.move = function() {
    console.log(this.redList.length);
    for (var i = 0; i < this.redList.length; i++) {
        var item = this.redList[i];
        if (item.isBig) {
            if (!item.touchTime) {
                item.touchTime = new Date();
                item.originX = item.x;
                item.originY = item.y;
                item.originWidth = item.width;
                item.originHeight = item.height;
            }
            var nZoom = (1 - Math.abs(new Date() - item.touchTime - 250) / 250) * 0.2;
            item.x = item.originX - nZoom * item.originWidth / 5;
            item.y = item.originY - nZoom * item.originHeight / 5;
            item.width = item.originWidth * (1 + nZoom);
            item.height = item.originHeight * (1 + nZoom);
            if (new Date() - item.touchTime > 500) {
                this.destroy(i);
            }
        } else {
            //console.log((diffframetime * item.speed) << 0);
            item.y += 4;
            //item.y += (diffframetime * item.speed) << 0;
        }
        if (item.x < -item.width || item.y > canvas_h + item.height) {
            //this.destroy(i);
        }
    }
};

// 绘制红包
red.prototype.draw = function() {
    for (var i = 0; i < this.redList.length; i++) {
        var item = this.redList[i];

        ctx.drawImage(item.img, item.x, item.y, item.width, item.height);
    }
};

// 判断获取红包
red.prototype.isGet = function() {
    var isGet = false,
        exportItem = null;
    var a1 = ctx.getImageData(touchX * 2, touchY * 2, 1, 1);
    if (a1.data.toString() !== [0, 0, 0, 0].toString()) {

        for (var i = 0; i < this.redList.length; i++) {
            var item = this.redList[i];
            ctx.beginPath();
            ctx.rect(item.x, item.y, item.width, item.height);
            if (ctx.isPointInPath(touchX * 2, touchY * 2)) {
                isGet = true;
                exportItem = item;
                break;
            }
        }
    }
    return {
        isGet: isGet,
        exportItem: exportItem
    };
};


/**
 * 红包
 * 1.生成的单位时间 100ms
 * 2.生成红包的几率
 * 3.红包的个数
 * Q:红包下降速率快，红包量大如何控制
 * Q:红包量大的概念是页面展示出来的整屏速度吗？
 * A:是的，如果要求数目大的话我要加大生成红包的数目 
 */

window.Redrain = Fn;