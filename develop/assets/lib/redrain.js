/**
 * 红包雨-canvas
 * 依赖jQuery
 * 
 * @author liting
 * @since 2017-06-30
 */
$(function () {
    // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
    (function () {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
        }
        if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
        if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }());

    // 阻止touchmove对页面的映像
    (function forbidOverMove() {
        window.ontouchmove = function (e) {
            e.preventDefault && e.preventDefault();
            e.returnValue = false;
            e.stopPropagation && e.stopPropagation();
            return false;
        }
    })();

    // 红包雨util
    var util = {
        //向已知dom后添加新元素
        appendChildDom: function (domChild, domParent) {
            domParent.append(domChild);
        },
        //创建空的canvas
        createCanvas: function (width, height, id, parentDOM) {
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
        random: function (start, end, type) {
            if (type) {
                return Math.random() * (end - start) + start;
            } else {
                return (Math.random() * ((end - start + 1)) << 0) + start;
            }
        },
        // 设置背景图片
        setBackground: function (url, node) {
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
    var Fn = function (name, options, callback_countdown, callback_gameover) {
        this.WIDTH = options.WIDTH || $(window).width() * 1;
        this.HEIGHT = options.HEIGHT || $(window).height() * 2;

        // 旋转平移参数
        this.nRotate = 35;
        this.nTranslateX = 100;
        this.nTranslateY = -300;

        // 创建画布
        this.canvas = util.createCanvas(this.WIDTH, this.HEIGHT, "canvas", $('.rdgame-wrapper'))[0];
        this.ctx = this.canvas.getContext('2d');
        this.nDevicePixelRatio = 2 || window.devicePixelRatio;
        // Retina屏抗锯齿
        if (this.nDevicePixelRatio) {
            this.canvas.style.width = this.WIDTH + "px";
            this.canvas.style.height = this.HEIGHT + "px";
            this.canvas.height = this.HEIGHT * this.nDevicePixelRatio;
            this.canvas.width = this.WIDTH * this.nDevicePixelRatio;
            this.ctx.scale(this.nDevicePixelRatio, this.nDevicePixelRatio);
        }
        // 透明背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        this.ctx.rotate(this.nRotate * Math.PI / 180);
        this.ctx.translate(this.nTranslateX, this.nTranslateY);

        // 红包列表
        this.redList = [];
        // 记录当前时间红包降落点 防止红包重叠
        this.currDropPoint = null;
        // 已获取红包个数
        this.nGetRedTotal = 0;
        // 活动开关（控制红包）
        this.isStartGame = false;

        // 背景图片 红包图片
        this.backgroundUrl = options.backgroundUrl;
        this.redImages = options.redImages;
        // 点击红包的音效列表
        this.sounds = options.sounds;
        // 几率
        this.redOdds = options.redOdds;
        // 都秒结束的回掉函数
        this.callback_countdown = callback_countdown;
        // 结束的回掉函数
        this.callback_gameover = callback_gameover;
        // 单位时间下降距离(速度) 变化速度
        this.dropSpeed = options.dropSpeed;
        // 事件间隔
        this.timeInterval = options.timeInterval;
        this.dv = options.dv;

        this.init();
    };

    // 初始化画布
    Fn.prototype.init = function () {
        var _this = this;
        util.setBackground(_this.backgroundUrl, $('.rdgame-wrapper'));
        _this.countdown();
        // _this.gameStart();
        _this.setAudios();
        _this.setRedImages();
    };

    // 音效生成
    Fn.prototype.setAudios = function () {
        var obj = {};
        var isLoading = false;

        $(this.sounds).each(function (index, item) {
            var audio = $('<audio></audio>');
            audio.attr({
                id: 'audio' + index,
                src: item,
                preload: "auto"
            })
            util.appendChildDom(audio, $('body'));
        })
        var audios = $("audio");
        audios.each(function(index, el){
            try{
                el.paly();
                el.pause();
            } catch(e) {
                console.log()
            }
        })
    };

    // 红包图片生成
    Fn.prototype.setRedImages = function () {
        var _this = this;
        $(_this.redImages).each(function (index, item) {
            var img = new Image();
            $(img).attr({
                // id: 'img' + index,
                src: item.url
            });
            $(img).hide();
            util.appendChildDom(img, $('body'));
            img.onload = function () {
                var canvas = util.createCanvas(item.width, item.height, "canvas", $('body'))[0];
                var ctx = canvas.getContext('2d');
                // Retina屏抗锯齿
                if (_this.nDevicePixelRatio) {
                    canvas.style.width = item.width + "px";
                    canvas.style.height = item.height + "px";
                    canvas.height = item.height * _this.nDevicePixelRatio;
                    canvas.width = item.width * _this.nDevicePixelRatio;
                    ctx.scale(_this.nDevicePixelRatio, _this.nDevicePixelRatio);
                }
                ctx.drawImage(img, 0, 0, item.width, item.height);
                $(canvas).attr({
                    "id": "img" + index,
                });
            };
        })
    };

    // 游戏开始倒计时
    Fn.prototype.countdown = function () {
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
        ]
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
        var countInterval = setInterval(function () {
            if (time_meter < 1) {
                clearInterval(countInterval);
                $('body>div.count').remove();
                _this.callback_countdown();
                // 开始
                _this.gameStart();
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

    // 开始游戏
    Fn.prototype.gameStart = function () {
        var _this = this;
        var sum = 0;
        var remaintTime = 0;
        // var startV = _this.dropSpeed;
        var timer = setInterval(function () {
            var nNandom = Math.random();
            sum++;
            // 跟据时间变化速度
            // _this.dropSpeed = (50 - Math.abs(50 - sum)) * _this.dv / 50 + startV;
            if (nNandom < _this.redOdds) {
                // console.log(sum)
                _this.createRed();
            }
            if (sum > 10000 / _this.timeInterval) {
                clearInterval(timer);
            }
        }, _this.timeInterval);
        _this.isStartGame = true;
        _this.drawCanvas();
        _this.getRed();
    };

    // 添加红包
    Fn.prototype.createRed = function () {
        var _this = this;
        var nIndex = util.random(0, _this.redImages.length - 1);
        // 随机图片
        var oImg = _this.redImages[nIndex];
        // 随机下落点
        function randomAddr(oImg) {
            var x = util.random(0, _this.WIDTH - oImg.width);
            if (Math.abs(x - _this.currDropPoint) < oImg.width) {
                // _this.currDropPoint = x + oImg.width;
                randomAddr(oImg)
            } else {
                _this.currDropPoint = x;
            }
            return x << 0
        };
        var x = randomAddr(oImg);
        // 下降总距离
        var y = -oImg.height;

        // 给红包一个单独的速度
        // var speed = _this.dropSpeed;
        var speed = util.random(-0.1, 0.1, true) + _this.dropSpeed;
        // 红包单位
        var redItem = [$("#img" + nIndex)[0], x, y, oImg.width, oImg.height, speed, false];
        _this.redList.push(redItem);
    };

    // 绘制canvas
    Fn.prototype.drawCanvas = function () {
        var _this = this;
        var ctx = this.ctx;
        // 方案三
        var diffframetime = 0;
        var lastframetime;
        var nCountDown = 10; //倒计时
        function gameLoop(){
            requestAnimationFrame(gameLoop);
            var now = new Date();
            diffframetime = now - lastframetime;
            lastframetime = now;
            if (diffframetime > 10000) {
                _this.endGame();
                return;
            }
            // 填写倒计时
            var djs = 10 - Math.floor(diffframetime / 1000);
            if (nCountDown != djs) {
                nCountDown = djs;
                $(".remaint-time span").html(nCountDown);
            }
            // 清除整屏
            _this.ctx.clearRect(0, 0, _this.WIDTH, _this.HEIGHT);
            // 重新绘制红包
            _this.redList.forEach(function (item, index) {
                if (item[6]) {
                    // 红包已经被点击的效果
                    item[7] = item[7] || now;
                    //系数(0-0.2)
                    var nZoom = (1 - Math.abs(now - item[7] - 250) / 250) * 0.2;
                    ctx.drawImage(
                        item[0],
                        item[1] - nZoom * item[3] / 5,
                        item[2] - nZoom * item[4] / 5,
                        item[3] * (1 + nZoom),
                        item[4] * (1 + nZoom)
                    );
                    if (now - item[7] > 500) {
                        _this.destroyRed(index);
                    }
                } else {
                    // 红包正在下落的效
                    ctx.drawImage(item[0], item[1], item[2], item[3], item[4]);
                    // ctx.beginPath(); 
                    // ctx.strokeStyle="#f00";/*设置边框*/ 
                    // ctx.fillStyle="#F00";/*设置填充颜色*/ 
                    // ctx.fillRect(item[1], item[2] << 0, item[3], item[4]); 
                    if (item[2] > _this.HEIGHT + 200) {
                        //清除红包
                        _this.destroyRed(index);
                    } else {
                        item[2] += (diffframetime * item[5]) << 0
                    }
                }
            });
        }
        gameLoop();
        // 方案一 requestAnimationFrame
        // function getReqCallback() {
        //     var count = 0;
        //     var start = null;
        //     var lastTimestamp = null; // 记录上一次时间
        //     var delta = 0; // 每一帧时间间隔
        //     var nCountDown = 10; //倒计时
        //     return function req(timestamp) {
        //         if (start === null) {
        //             start = timestamp;
        //             lastTimestamp = timestamp;
        //         }
        //         count++;
        //         delta = timestamp - lastTimestamp;

        //         var djs = 10 - Math.floor((timestamp - start) / 1000);

        //         if (nCountDown != djs) {
        //             nCountDown = djs;
        //             $(".remaint-time span").html(nCountDown);
        //         }

        //         // 清除整屏
        //         _this.ctx.clearRect(0, 0, _this.WIDTH, _this.HEIGHT);
        //         // 重新绘制红包
        //         // $(_this.redList).each(function (index, item) {
        //         _this.redList.forEach(function (item, index) {
        //             if (item[6]) {
        //                 // 红包已经被点击的效果
        //                 item[7] = item[7] || timestamp;
        //                 //系数(0-0.2)
        //                 var nZoom = (1 - Math.abs(timestamp - item[7] - 250) / 250) * 0.2;
        //                 ctx.drawImage(
        //                     item[0],
        //                     item[1] - nZoom * item[3] / 5,
        //                     item[2] - nZoom * item[4] / 5,
        //                     item[3] * (1 + nZoom),
        //                     item[4] * (1 + nZoom)
        //                 );
        //                 if (timestamp - item[7] > 500) {
        //                     _this.destroyRed(index);
        //                 }
        //             } else {
        //                 // 红包正在下落的效
        //                 ctx.drawImage(item[0], item[1], item[2], item[3], item[4]);
        //                 // ctx.beginPath(); 
        //                 // ctx.strokeStyle="#f00";/*设置边框*/ 
        //                 // ctx.fillStyle="#F00";/*设置填充颜色*/ 
        //                 // ctx.fillRect(item[1], item[2] << 0, item[3], item[4]); 
        //                 if (item[2] > _this.HEIGHT + 200) {
        //                     //清除红包
        //                     _this.destroyRed(index);
        //                 } else {
        //                     item[2] += (delta * item[5]) << 0
        //                 }
        //             }
        //         });
        //         lastTimestamp = timestamp;
        //         if (timestamp - start < 10000) {
        //             requestAnimationFrame(req);
        //         } else {
        //             // _this.ctx.clearRect(0, 0, _this.WIDTH, _this.HEIGHT);
        //             _this.endGame();
        //         }
        //     }
        // }
        // requestAnimationFrame(getReqCallback());
        // 方案二 setInterval
        // var times = 0;
        // var d = 6; // now - date;
        // var timer = setInterval(function(){
        //     if (times*d >= 10000) {
        //         // 清除整屏
        //         _this.ctx.clearRect(0, 0, _this.WIDTH, _this.HEIGHT);
        //         clearInterval(timer);
        //         _this.endGame();
        //         return;
        //     }
        //     var a = 10 - (times * 6 / 1000) << 0;
        //     if (originTime != a) {
        //         originTime = a;
        //         $(".remaint-time span").html(a);
        //     }
        //     // 清除整屏
        //     _this.ctx.clearRect(0, 0, _this.WIDTH, _this.HEIGHT);
        //     // 重新绘制红包
        //     _this.redList.forEach(function(item, index){
        //         if (item[6]) {
        //             // 红包已经被点击的效果
        //             var tZoom = tZoom || times;
        //             //系数(0-0.2)
        //             var nZoom = (1 - Math.abs((times-tZoom) * 6 - 250) / 250) * 0.2;
        //             ctx.drawImage(
        //                 item[0], 
        //                 item[1] - nZoom * item[3] / 5, 
        //                 item[2] - nZoom * item[4] / 5, 
        //                 item[3] * (1 + nZoom), 
        //                 item[4] * (1 + nZoom)
        //             );
        //             if (times * 6 > 500) {
        //                 _this.destroyRed(index);
        //             }
        //         } else {
        //             // 红包正在下落的效果
        //             // ctx.drawImage(item[0], item[1], item[2]);
        //             ctx.beginPath(); 
        //             ctx.strokeStyle="#f00";/*设置边框*/ 
        //             ctx.fillStyle="#F00";/*设置填充颜色*/ 
        //             ctx.fillRect(item[1], item[2] << 0, item[3], item[4]);
        //             if (item[2] > _this.HEIGHT + 200) {
        //                 //清除红包
        //                 _this.destroyRed(index);
        //             } else {
        //                 // item[2] += d * _this.dropSpeed
        //                 item[2] += d * item[5]
        //             }
        //         }
        //     });
        //     times++;
        // }, 6)
    };

    // 点击屏幕获取红包
    Fn.prototype.getRed = function () {

        var _this = this;
        $(_this.canvas).on("touchstart", function (e) {
            e.preventDefault();
            if (!_this.isStartGame) {
                return;
            }
            var touch = e.originalEvent.targetTouches[0];
            var cx = touch.clientX * 2;
            var cy = touch.clientY * 2;
            var a1 = _this.ctx.getImageData(cx, cy, 1, 1);
            if (a1.data.toString() !== [0, 0, 0, 0].toString()) {
                $(_this.redList).each(function (index, item) {
                    _this.ctx.beginPath();
                    _this.ctx.rect(item[1], item[2], item[3], item[4]);
                    if (_this.ctx.isPointInPath(cx, cy)) {
                        if (item[6]) {
                            return;
                        }
                        item[6] = true;
                        _this.nGetRedTotal++;
                        // _this.getEffect(item, index);
                        $("audio").each(function (index, el) {
                            el.pause();
                            el.currentTime = 0;
                        });
                        var nIndex = util.random(0, 1);
                        $('#audio' + nIndex)[0].play();
                        $(".red-sum span").html(_this.nGetRedTotal);
                        return false;
                    }
                })
            }
        })
    };

    // 红包销毁
    Fn.prototype.destroyRed = function (index) {
        this.redList.splice(index, 1);
    };

    // 结束游戏
    Fn.prototype.endGame = function () {
        var _this = this;
        _this.isStartGame = false;
        // 清除整屏
        // _this.ctx.clearRect(0, 0, _this.WIDTH, _this.HEIGHT);
        _this.callback_gameover(_this.nGetRedTotal)
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


    var actNo = 12;    //期数
    var timeInterval = 100;  //时间间隔
    var probability = 0.6; //出现几率

    var options = {
        WIDTH: $(window).width() * 1.3,
        HEIGHT: $(window).height() * 2,
        //背景图片 红包图片
        backgroundUrl: "./assets/img/redpacket_background@2x.png",
        redImages: [{
        //     url: "./assets/img/hongbao.png",
        //     width: 26,
        //     height: 32
        // }, {
            url: "./assets/img/redpacket_person1@2x.png",
            width: 58,
            height: 102
        }, {
            url: "./assets/img/redpacket_person2@2x.png",
            width: 84,
            height: 71
        }, {
            url: "./assets/img/redpacket_person3@2x.png",
            width: 72,
            height: 71
        }, {
            url: "./assets/img/redpacket_person4@2x.png",
            width: 92,
            height: 71
        }],
        // 点击音效
        sounds: ['./assets/mp3/hb.mp3', './assets/mp3/jy.mp3'],
        // 单个红包出现几率
        redOdds: probability,
        // 平均速度+速度差=最高速度
        dropSpeed: 0.5,
        // 多少时间生成一个
        timeInterval: timeInterval,
        // timeInterval: timeInterval,
        dv: 0
    }

    // 读秒结束&游戏开始
    function fnCountdown() {
    }
    // 游戏结束
    function fnGameover(num) {
    }
    var rd = new Redrain("canvas", options, fnCountdown, fnGameover);
})
