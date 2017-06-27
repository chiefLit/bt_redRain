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
        var canvas = util.createCanvas(this.WIDTH, this.HEIGHT, "canvas", $('body'))[0];
        this.ctx = canvas.getContext('2d');
        // 背景图片 红包图片
        this.image_bg = options.image_bg;
        this.imgage_rd = options.imgage_rd;
        this.rd_width = options.rd_width;
        this.rd_height = options.rd_height;
        // 几率
        this.odds = options.odds;
        // 红包列表
        this.rds = [];
        // 记录当前时间红包降落点 防止红包重叠
        this.initDir = null;
    }

    RedRain.prototype = {
        //初始化画布
        init: function() {
            var _this = this;
            // _this.setBg();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0)';
            _this.startGame();
                // _this.startGame();
        },

        // 随机下落地址
        randomAddr: function(oImg){
            var x = util.random(0, this.WIDTH - oImg.width);
            if (Math.abs(x - this.initDir) < oImg.width/2) {
                this.randomAddr(oImg);
            } else {
                this.initDir = x;
                return x
            }
        },

        //创建红包
        createRed: function() {
            var _this = this;
            var img = new Image();
            // 随机图片
            var oImg = _this.imgage_rd[util.random(0,_this.imgage_rd.length - 1)];
            img.src = oImg.url;
            // 下降总距离
            var y = 0;
            // 随机下落点
            var x = _this.randomAddr(oImg);

            var ops = {
                img: img,
                x: _this.randomAddr(oImg),
                y: 0,
                ox: oImg.width,
                oy: oImg.height
            };
            // 单位时间下降距离
            var unitDir = 3;
            img.onload = function() {
                var ctx = _this.ctx;
                var downTimer = setInterval(function(){
                    ctx.clearRect(x, y-unitDir, oImg.width, oImg.height);//清除上一次的痕迹
                    ctx.beginPath();
                    ctx.drawImage(img, x, y, oImg.width, oImg.height);
                    ctx.closePath();
                    // ctx.fill();
                    if (y > _this.HEIGHT) {
                        clearInterval(downTimer);
                    } else {
                        y += unitDir
                    }
                }, 1)
            };
        },

        //开始游戏
        startGame: function(){
            var _this = this;
            var sum = 0;
            var timer = setInterval(function(){
                var nNandom = Math.random();
                sum ++;
                if (nNandom < _this.odds) {
                    _this.createRed();
                }
                if (sum >= 100) {
                    clearInterval(timer);
                    _this.endGame()
                }
            }, 100);
        },

        // 动画
        animate: function(){
        },

        //结束游戏
        endGame: function() {

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
        rd_width: 50,
        rd_height: 50,
        //单个红包出现记录
        odds: 0.6
    } 


    window.RedRain = RedRain;
    var rr = new RedRain("canvas", options);
    rr.init();
});
