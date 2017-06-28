$(function () {
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
        random: function(start, end) {
            return Math.floor(Math.random() * (end - start + 1)) + start;
        }
    };

    var RedRain = function (name, options, callback) {
        this.WIDTH = options.WIDTH || $(window).width();
        this.HEIGHT = options.HEIGHT || $(window).height();
        // 创建画布
        this.canvas = util.createCanvas(this.WIDTH, this.HEIGHT, "canvas", $('body'))[0];
        this.ctx = this.canvas.getContext('2d');
        // 背景图片 红包图片
        this.image_bg = options.image_bg;
        this.imgage_rd = options.imgage_rd;
        // 点击红包的音效列表
        this.sounds = options.sounds;
        // 几率
        this.odds = options.odds;
        // 红包列表
        this.rds = [];
        // 记录当前时间红包降落点 防止红包重叠
        this.initDir = null;
        // 单位时间下降距离(速度) 变化速度
        this.v = options.v;
        this.dv = options.dv;
        // 已获取红包个数
        this.rdSum = 0;
        // 结束的回掉函数
        this.overCallback = options.overCallback;
        // 活动开关（控制红包）
        this.isStarting = false;
    }

    RedRain.prototype = {
        //初始化画布
        init: function() {
            var _this = this;
            // 透明背景
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0)';
            // _this.countDown();
            _this.startGame();
            _this.getRed();
        },

        // 开始游戏
        startGame: function(){
            var _this = this;
            var sum = 0;
            var remaintTime = 0;
            var startV = _this.v;
            _this.isStarting = true;
            var timer = setInterval(function(){
                var nNandom = Math.random();
                remaintTime = 10 - Math.floor(sum/10);
                // 赋红包个数值
                $(".remaint-time span").html(remaintTime);
                sum ++;
                // 速度变化
                _this.v = (50 - Math.abs(50 - sum)) * _this.dv / 50 + startV;
                if (nNandom < _this.odds) {
                    _this.createRed();
                }
                if (sum >= 100) {
                    clearInterval(timer);

	                // 赋红包个数值
	                $(".remaint-time span").html(0);
                    _this.endGame()
                }
            }, 100);
            _this.animate()
        },

        // 创建红包
        createRed: function() {
            var _this = this;
            var img = new Image();
            // 随机图片
            var oImg = _this.imgage_rd[util.random(0,_this.imgage_rd.length - 1)];
            img.src = oImg.url;
            // 随机下落点
            var x = _this.randomAddr(oImg);
            // 下降总距离
            var y = -oImg.height;

            var rdItem = [img, x, y, oImg.width, oImg.height];
            img.onload = function() {
                _this.rds.push(rdItem);
            };
        },

        // 随机下落地址
        randomAddr: function(oImg){
            var x = util.random(0, this.WIDTH - oImg.width);
            if (Math.abs(x - this.initDir) < oImg.width) {
                this.randomAddr(oImg);
            } else {
                this.initDir = x;
                return x
            }
        },

        // 下落动画
        animate: function(){
            var _this = this;
            var ctx = this.ctx;
            var downTimer;
            downTimer = setInterval(function(){
                ctx.clearRect(0, 0, _this.WIDTH, _this.HEIGHT);//清除整屏
                _this.rds.forEach(function(item, index){
                    var rd = item;
                    // ctx.clearRect(rd[1], rd[2] - _this.v, rd[3], rd[4]);//清除上一次的痕迹
                    // ctx.beginPath();
                    ctx.drawImage(rd[0], rd[1], rd[2], rd[3], rd[4]);
                    // ctx.closePath();
                    
                    if (rd[2] > _this.HEIGHT) {
                        //清除红包
                        _this.rds.splice(index, 1);
                    } else {
                        rd[2] += _this.v
                    }
                })
            }, 1)
        },

        // 中奖效果
        getEffect: function(item){
        	console.log(item);
        },

        // 点击获取红包
        getRed: function(){
            var _this = this;
            if (!_this.isStarting) {
            	true
            }
            $(_this.canvas).on("touchstart", function(e){
                var touch = e.originalEvent.targetTouches[0]; 
                var cx = touch.clientX;
                var cy = touch.clientY;
                _this.rds.forEach(function(item, index){
                    if (cx > item[1] && cx < item[1] + item[3]) {
                        if (cy > item[2] && cy < item[2] + item[4]) {
                        	_this.getEffect(item);
                            _this.rds.splice(index, 1);
                            _this.rdSum++;
			                $(".red-sum span").html(_this.rdSum);
                            return;
                        }
                    }
                })
            })
        },
        

        // 音效生成
        setAudio: function(index){
            var audio = $('<audio></audio>');


            if (index != null) {
                return this.sounds[index]
            } else {
                return this.sounds[util.random(0, this.sounds.length - 1)]
            }
        },

        //结束游戏
        endGame: function() {
        	var _this = this;
            _this.isStart = false;
            _this.overCallback(_this.rdSum)
        },

        // 游戏开始倒计时
        countDown: function(){
            var _this = this;
            var time_meter = 3;
            var countInterval = setInterval(function(){
                if (time_meter < 1) {
                    clearInterval(countInterval);
                    $('body>div.count').remove();
                    // 开始
                    _this.startGame();
                    return
                }
                var div = $('<div class="count">' + time_meter + '</div>');
                div.css({
                    display: "inline",
                    width: $(window).width(),
                    height: $(window).height(),
                    position: "fixed",
                    zIndex: 99999,
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    background: "rgba(255,255,255,0.5)",
                    lineHeight: $(window).height() + 'px',
                    textAlign: 'center',
                    fontSize: '80px'
                });
                $('body>div.count').remove();
                util.appendChildDom(div, $('body'));
                time_meter--;
            }, 1000)
        },
    }

    // 红包
    // 1.生成的单位时间 100ms
    // 2.生成红包的几率
    // 3.红包的个数
    // Q:红包下降速率快，红包量大如何控制
    // Q:红包量大的概念是页面展示出来的整屏速度吗？
    // A:是的，如果要求数目大的话我要加大生成红包的数目 
    
    //红包雨参数
    var options = {
        WIDTH: $(window).width(),
        HEIGHT: $(window).height(),
        //背景图片 红包图片
        image_bg: "img/redpacket_background@2x.png",
        imgage_rd: [{
            url: "img/redpacket_person1@2x.png",
            width: 58,
            height: 102
        },{
            url: "img/redpacket_person2@2x.png",
            width: 84,
            height: 71
        },{
            url: "img/redpacket_person3@2x.png",
            width: 72,
            height: 71
        },{
            url: "img/redpacket_person4@2x.png",
            width: 92,
            height: 71
        }],
        //点击音效
        sounds: ['mp3/hb.mp3','mp3/jy.mp3'],
        //单个红包出现几率
        odds: 1,
        overCallback: function(sum){
        	console.log("游戏结束,你中了" + sum)
        },
        // 速度+速度差=最高速度
        v: 3,
        dv: 2
    } 


    window.RedRain = RedRain;
    var rr = new RedRain("canvas", options);

    rr.init();
});
