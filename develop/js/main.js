$(function () {
	// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
	// MIT license
	(function() {
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
        // 透明背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        // 红包列表
        this.rds = [];
        // 记录当前时间红包降落点 防止红包重叠
        this.initDir = null;
        // 已获取红包个数
        this.get_rds = 0;        
        // 活动开关（控制红包）
        this.isStarting = false;

        // 背景图片 红包图片
        this.image_bg = options.image_bg;
        this.imgage_rd = options.imgage_rd;
        // 点击红包的音效列表
        this.sounds = options.sounds;
        // 几率
        this.odds = options.odds;
        // 结束的回掉函数
        this.overCallback = options.overCallback;
        // 单位时间下降距离(速度) 变化速度
        this.v = options.v;
        this.dv = options.dv;
    }

    RedRain.prototype = {
        // 初始化画布
        init: function() {
            var _this = this;
            // _this.countDown();
            _this.startGame();
            _this.getRed();
            _this.setAudio();
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

        // 开始游戏
        startGame: function(){
            var _this = this;
            var sum = 0;
            var remaintTime = 0;
            var startV = _this.v;
            _this.isStarting = true;
            var timer = setInterval(function(){
                var nNandom = Math.random();
                sum ++;
                // 跟据时间变化速度
                _this.v = (50 - Math.abs(50 - sum)) * _this.dv / 50 + startV;
                if (nNandom < _this.odds) {
                    _this.createRed();
                }
                if (sum > 100) {
                    clearInterval(timer);
                }
            }, 100);
            _this.drawCanvas()
        },

        // 创建红包
        createRed: function() {
            var _this = this;
            var img = new Image();
            // 随机图片
            var oImg = _this.imgage_rd[util.random(0,_this.imgage_rd.length - 1)];
            img.src = oImg.url;
            // 随机下落点
	        function randomAddr(oImg){
	            var x = util.random(0, _this.WIDTH - oImg.width);
	            if (Math.abs(x - _this.initDir) < oImg.width) {
	                randomAddr(oImg);
	            } else {
	                _this.initDir = x;
	                return x
	            }
	        };
            var x = randomAddr(oImg);
            // 下降总距离
            var y = -oImg.height;

            var rdItem = [img, x, y, oImg.width, oImg.height, oImg.url];
            img.onload = function() {
                _this.rds.push(rdItem);
            };
        },

        // 绘制canvas
        drawCanvas: function(){
            var _this = this;
            var ctx = this.ctx;
            var date = new Date();
            var originDate = date; //初始时间
            var originTime = 10; //初始倒计时
            // canvas绘制使用requestAnimationFrame
            function downTimer(){
            	if (originTime <= 0) {
            		_this.endGame();
            		return;
            	}
            	requestAnimationFrame(downTimer);
            	var now = new Date();  
            	var d = now - date;
            	date = now;
            	// 计算左上角倒计时
            	var djs = 10 - Math.floor((now - originDate)/1000);
            	if(originTime != djs){
            		$(".remaint-time span").html(djs);
            		originTime = djs;
            	}
            	// 清除整屏
                ctx.clearRect(0, 0, _this.WIDTH, _this.HEIGHT);
                // 重新绘制红包
                _this.rds.forEach(function(item, index){
                    var rd = item;
                    ctx.drawImage(rd[0], rd[1], rd[2], rd[3], rd[4]);
                    if (rd[2] > _this.HEIGHT) {
                        //清除红包
                        _this.destroyRed(index);
                    } else {
                        rd[2] += d * _this.v
                    }
                })
            }
            downTimer();
        },

        // 点击获取红包
        getRed: function(){
            var _this = this;
            $(_this.canvas).on("touchstart", function(e){
	            if (!_this.isStarting) {
	            	return;
	            }
                var touch = e.originalEvent.targetTouches[0]; 
                var cx = touch.clientX;
                var cy = touch.clientY;
                $(_this.rds).each(function(index, item){
                    if (cx > item[1] && cx < item[1] + item[3] && cy > item[2] && cy < item[2] + item[4]) {
                        _this.get_rds++;
                    	_this.getEffect(item);
                        _this.destroyRed(index);
                        $("audio").each(function(index, el) {
                        	el.pause();
							el.currentTime = 0;
                        });
                        $('#audio' + util.random(0,1))[0].play();
		                $(".red-sum span").html(_this.get_rds);
		                return false;
                    }
                })
            })
        },

        // 红包销毁
        destroyRed: function(index){
        	this.rds.splice(index, 1);
        },

        // 中奖效果
        getEffect: function(item){
        	var _this = this;
        	var rdDiv = $('<div class="red"></div>');
        	var rdDivId = 'rd' + _this.get_rds;
        	rdDiv.attr("id", rdDivId)
        	rdDiv.css({
        		width: item[3] + 'px',
        		height: item[4] + 'px',
        		background: "url(" + item[5] + ") no-repeat",
        		backgroundSize: 'cover',
        		position: "absolute",
        		top: item[2] + 'px',
        		left: item[1] + 'px',
				animation: 'index-btn-scale .2s linear infinite'
        	})
        	util.appendChildDom(rdDiv, $('body'));
        	setTimeout(function(){
        		$('body>div#' + rdDivId).remove();
        	}, 200)
        },

        // 音效生成
        setAudio: function(index){
    		var obj = {};
        	$(this.sounds).each(function(index, item) {
        		var audio = $('<audio></audio>');
        		audio.attr({
        			id: 'audio' + index,
        			src: item,
        			preload: "auto"
        		})
        		// audio.src = item;
        		util.appendChildDom(audio, $('body'));
        	})
        },

        //结束游戏
        endGame: function() {
        	var _this = this;
            _this.isStarting = false;
            _this.overCallback(_this.get_rds)
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
        image_bg: [{
        	url: "img/redpacket_background@2x.png"
        }],
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
        // 点击音效
        sounds: ['mp3/hb.mp3','mp3/jy.mp3'],
        // 单个红包出现几率
        odds: 0.6,
        overCallback: function(sum){
        	console.log("游戏结束,你中了" + sum)
        },
        // 速度/ms+速度差=最高速度
        v: 0.5,
        dv: 0
    } 


    window.RedRain = RedRain;
    var rr = new RedRain("canvas", options);

    rr.init();
});
