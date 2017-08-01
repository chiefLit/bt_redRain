/**
 * 红包雨-canvas
 * 依赖jQuery
 * 
 * @author liting
 * @since 2017-06-30
 */

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
    //随机数创建
    random: function(start, end, type) {
        if (type) {
            return Math.random() * (end - start) + start;
        } else {
            return (Math.random() * ((end - start + 1)) << 0) + start;
        }
    }
};

var rAF = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
        window.setTimeout(callback, 1000 / 60)
    };

//jq扩展
$.fn.extend({
    /**
     * css各浏览器前缀补充赋值
     * @param  {String} name 属性名
     * @param  {String} val  属性值
     * @return {void}
     */
    cssPreFixer: function(o) {
        $(this).each(function() {
            var oProp = {};
            for (var item in o) {
                var sName = item.charAt(0).toUpperCase() + item.substring(1, item.length); //首字母转大写
                oProp[item] = oProp["webkit" + sName] = oProp["o" + sName] = oProp["moz" + sName] = oProp["ms" + sName] = o[item];
            }
            $(this).css(oProp);
        });
    }
});

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
var isFirst = true;
var Fn = function(options, callback_countdown, callback_gameover) {
    // 宽高
    this.nWinWidth = $(window).width();
    this.nWinHieght = $(window).height();
    // 背景图片列表
    //this.imgUrlList = options.imgList;
    // 提前在初始化的3秒倒计时的时候把图片预加载好
    this.imgUrlList = [];
    var imgList = options.imgList;
    for (var i = 0; i < imgList.length; i++) {
        var img = new Image();
        img.src = imgList[i];
        this.imgUrlList.push(img);
    }
    this.data = options.data;
    // 多少时间创建红包 & 单次创建红包的几率
    this.timeInterval = options.timeInterval || 300;
    this.redOdds = options.redOdds || 0.6;

    // 创建红包数 & 已获取红包个数
    this.nCreateNum = 0;
    this.nGetRedNum = 0;

    // 是否开始 & 是否结束
    this.isStartGame = false;
    this.isGameover = false;

    // 读秒结束回调函数
    this.callback_countdown = callback_countdown;
    // 结束的回掉函数
    this.callback_gameover = callback_gameover;

    // 最快最慢
    this.slowSpeed = options.slowSpeed;
    this.fastSpeed = options.fastSpeed;

    // 音频列表
    this.soundList = [];
    for (var i = 0; i < options.soundList.length; i++) {
        //var sound = new Audio();
        // var sound = document.createElement('audio');
        // sound.src = options.soundList[i];
        // sound.preload = "auto";
        // sound.type = "audio/mpeg";
        // //sound.preload = "metadata";
        // // sound.style.display = "none";
        // //sound.play();
        // //sound.pause();
        // sound.currentTime = 0;
        // this.soundList.push(sound);
        var sound = $('<audio></audio>');
        sound.attr({
            src: options.soundList[i],
            type: "audio/mpeg",
            preload: "auto",
        })
        sound.currentTime = 0;
        this.soundList.push(sound);
    }
    this.init();
};

// 初始化画布
Fn.prototype.init = function() {
    var _this = this;
    var odds = _this.redOdds;
    var msec = _this.slowSpeed;
    // 开始倒计时
    _this.countdown(function() {
        // 结束倒计时
        var nCountDown = 10;
        var gameoverTimer = setInterval(function() {
            nCountDown--;
            var nZoom = (5 - Math.abs(nCountDown - 5)) * 0.2; //0>1>0
            msec = _this.slowSpeed - (_this.slowSpeed - _this.fastSpeed) * nZoom;
            $(".remaint-time span").html(nCountDown);
            if (nCountDown <= 0) {
                //结束游戏
                _this.isGameover = true;
                clearInterval(gameoverTimer);
                _this.callback_gameover && _this.callback_gameover(_this.nGetRedNum);
                return;
            }
        }, 1000)
        // 定时随机生成红包
        var createTimer = setInterval(function() {
            if (_this.isGameover) {
                clearInterval(createTimer);
                return;
            }
            if (Math.random() < odds) {
                // 随机速度
                var delta = 0;
                delta = util.random(-500, 500);
                _this.create(msec + delta);
            }
        }, _this.timeInterval);
        // 绑定touch事件
        $('body').on("touchstart", '.red', function(e) {
            _this.touchHandler(this, e);
        });
        $('body').on("touchstart", function(e) {
            if (isFirst) {
                isFirst = false;
                for (var i = 0; i < _this.soundList.length; i++) {
                    _this.soundList[i][0].play();
                    _this.soundList[i][0].pause();
                }
            }
        });
    });
};


// 设置动画
Fn.prototype.setTransform = function(element, duration, tanslateX, tanslateY) {
    if (!element) {
        return;
    }
    rAF(function() {
        element.cssPreFixer({
            transitionDuration: duration + "ms",
            transform: "translate3d(" + tanslateX + "px, " + tanslateY + "px, 0px) rotate(35deg)"
        });

    });
};

// 红包移动
Fn.prototype.animate = function(element, duration, tanslateX, tanslateY) {
    var _this = this;
    for (var i = 0; i < 10000; i++) {
        _this.setTransform(element, 0, i, i);
    }
    //_this.setTransform(element, duration, tanslateX, tanslateY);
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
    };
    span.css(spanStyle);

    div.html(span);
    util.appendChildDom(div, $('body'));
    // util.appendChildDom(span, div);
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
        span.css(spanStyle);


        time_meter--;
    }, 1000)
};

// 创建红包
Fn.prototype.create = function(msec) {
    var _this = this;
    var red = $("<div class='red'></div>");
    var img = _this.imgUrlList[util.random(0, _this.imgUrlList.length - 1)].cloneNode(true);
    //img.src = _this.imgUrlList[util.random(0, _this.imgUrlList.length - 1)];
    var nWidth = img.width;
    var nHeight = img.height;
    red.cssPreFixer({
        'position': "absolute",
        'width': nWidth + "px",
        'height': nHeight + "px",
        'top': -nHeight + "px",
        //top: "0px",
        'left': util.random(_this.nWinWidth / 3, _this.nWinWidth * 5 / 3 - nWidth) + "px",
        'zIndex': 5,

        'transform': "translate3d(0px, 0px, 0px) rotate(35deg)",
        'transformOrigin': "center center",
        'animation': "an-move " + msec + "ms linear"
    });

    red.attr({
        "id": 'red' + _this.nCreateNum
        // "data-born": new Date().getTime()
    });
    /*red.cssPreFixer({
        transitionProperty: "all"
    });*/


    _this.nCreateNum++;
    $(img).css({
        "position": 'absolute',
        "top": 0,
        "right": 0,
        "bottom": 0,
        "left": 0
    });

    red.html(img);
    util.appendChildDom(red, $(".rdgame-wrapper"));
    //_this.animate(red, msec, -_this.nWinWidth, _this.nWinHieght);

    // 绑定动画结束事件
    red.on("webkitAnimationEnd", function() {
        this.remove();
    })
};

// touch事件
Fn.prototype.touchHandler = function(node, e) {
    var _this = this;
    if (_this.isGameover) {
        return;
    }
    e.preventDefault && e.preventDefault(); // 里面有图片
    var currNode = $(node);
    // 判断
    if (currNode.attr('data-get')) {
        return;
    }
    currNode.attr({ "data-get": 'true' });
    // 随机播放音频
    var currSound = _this.soundList[util.random(0, 1)][0];
    currSound.pause();
    currSound.currentTime = 0;
    currSound.play();

    // 停止动画
    currNode.cssPreFixer({
        'zIndex': 6,
        'animationPlayState': 'paused'
    });

    // 已获得红包数增长
    _this.nGetRedNum++;
    $(".red-sum span").html(_this.nGetRedNum);

    // 添加动画
    var currImg = currNode.children('img')[0];
    var oCss = {
        'animation': "index-btn-scale .6s linear",
        // 'webkitAnimation': "index-btn-scale .6s linear",
    }
    setTimeout(function() {
        $(currImg).cssPreFixer(oCss);
    })
    // 动画结束删除红包
    $(currImg).on("webkitAnimationEnd", function() {
        currNode.remove();
    })
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
// return Fn;