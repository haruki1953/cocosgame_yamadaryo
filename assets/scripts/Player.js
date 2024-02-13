cc.Class({
    extends: cc.Component,

    properties: {
        // 主角跳跃高度
        jumpHeight: 0,
        // 主角跳跃持续时间
        jumpDuration: 0,
        // 辅助形变动作时间
        squashDuration: 0,
        // 最大移动速度
        maxMoveSpeed: 0,
        // 加速度
        accel: 0,
        // 跳跃音效资源
        jumpAudio: {
            default: null,
            type: cc.AudioClip
        },
    
        //主角方向
        playerROL:{ 
            set: function(v) {
                if(v > 0) { //右
                    if(this.playerDirection != 1){  
                        //方向与输入不同时执行，下同
                        this.myAnimPlay('playerIdleRight');
                        this.playerDirection = 1;
                    }   
                } else {    //左
                    if(this.playerDirection != -1){
                        this.myAnimPlay('playerIdleLeft');
                        this.playerDirection = -1;
                    }
                }
            },
            get: function() {
                return this.playerDirection;
            },
        }
    },

    // use this for initialization
    onLoad: function () {
        this.enabled = false;
        // 加速度方向开关
        this.accLeft = false;
        this.accRight = false;
        // 主角当前水平方向速度
        this.xSpeed = 0;
        // screen boundaries
        this.minPosX = -this.node.parent.width/2;
        this.maxPosX = this.node.parent.width/2;

        // 初始化跳跃动作
        this.jumpAction = this.setJumpAction();

        // 初始化键盘输入监听
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        // 触摸监听
        var touchReceiver = cc.Canvas.instance.node;
        touchReceiver.on('touchstart', this.onTouchStart, this);
        touchReceiver.on('touchend', this.onTouchEnd, this);
        
        // 初始化动画组件
        this.anim = this.getComponent(cc.Animation);

        //主角方向
        this.playerDirection = 1; //1为右，-1为左
        
        //初始化当前动画
        this.nowAnimState = this.anim.play('playerIdleRight');
    },
    // called every frame
    update: function (dt) {
        // 根据当前加速度方向每帧更新速度
        if (this.accLeft) {
            this.xSpeed -= this.accel * dt;
        } else if (this.accRight) {
            this.xSpeed += this.accel * dt;
        }
        // 限制主角的速度不能超过最大值
        if ( Math.abs(this.xSpeed) > this.maxMoveSpeed ) {
            // if speed reach limit, use max speed with current direction
            this.xSpeed = this.maxMoveSpeed * this.xSpeed / Math.abs(this.xSpeed);
        }

        // 根据当前速度更新主角的位置
        this.node.x += this.xSpeed * dt;

        // limit player position inside screen
        if ( this.node.x > this.node.parent.width/2) {
            this.node.x = this.node.parent.width/2;
            this.xSpeed = 0;
        } else if (this.node.x < -this.node.parent.width/2) {
            this.node.x = -this.node.parent.width/2;
            this.xSpeed = 0;
        }
    },

    onDestroy () {
        // 取消键盘输入监听
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        
        var touchReceiver = cc.Canvas.instance.node;
        touchReceiver.off('touchstart', this.onTouchStart, this);
        touchReceiver.off('touchend', this.onTouchEnd, this);
    },

    onKeyDown (event) {
        switch(event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.accLeft = true;
                this.accRight = false;
                this.playerROL = -1;  //设置主角方向 下同
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.accLeft = false;
                this.accRight = true;
                this.playerROL = 1;
                break;
        }
    },

    onKeyUp (event) {
        switch(event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.accLeft = false;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.accRight = false;
                break;
        }
    },

    onTouchStart (event) {
        var touchLoc = event.getLocation();
        if (touchLoc.x >= cc.winSize.width/2) {
            this.accLeft = false;
            this.accRight = true;
            this.playerROL = 1;  //设置主角方向 下同
        } else {
            this.accLeft = true;
            this.accRight = false;
            this.playerROL = -1;
        }
    },

    onTouchEnd (event) {
        this.accLeft = false;
        this.accRight = false;
    },

    setJumpAction: function () {
        // 跳跃上升
        var jumpUp = cc.moveBy(this.jumpDuration, cc.v2(0, this.jumpHeight)).easing(cc.easeCubicActionOut());
        // 下落
        var jumpDown = cc.moveBy(this.jumpDuration, cc.v2(0, -this.jumpHeight)).easing(cc.easeCubicActionIn());
        // 形变
        var squash = cc.scaleTo(this.squashDuration, this.node.scaleX, 0.6);
        var stretch = cc.scaleTo(this.squashDuration, this.node.scaleX, 1.2);
        var scaleBack = cc.scaleTo(this.squashDuration, this.node.scaleX, 1);
        // 添加一个回调函数，用于在动作结束时调用我们定义的其他方法
        var callback = cc.callFunc(this.playJumpSound, this);
        // 不断重复，而且每次完成落地动作后调用回调来播放声音
        return cc.repeatForever(cc.sequence(squash, stretch, jumpUp, scaleBack, jumpDown, callback));
    },

    playJumpSound: function () {
        // 调用声音引擎播放声音
        cc.audioEngine.playEffect(this.jumpAudio, false);
    },

    getCenterPos: function () {
        var centerPos = cc.v2(this.node.x, this.node.y + this.node.height/2);
        return centerPos;
    },

    startMoveAt: function (pos) {
        this.enabled = true;
        this.xSpeed = 0;
        this.node.setPosition(pos);
        this.node.runAction(this.setJumpAction());
    },

    stopMove: function () {
        this.node.stopAllActions();
    },
    
    //播放主角得分动画（仅主角）
    playPlayerScoreAnim: function(){
        if(this.playerROL > 0) {    //右
            this.myAnimPlay('playerEatRight');
        } else {    //左
            this.myAnimPlay('playerEatLeft');
        }
    },

    //eat动画播放完毕后根据当前方向重新播放待机动画,参数为eat动画方向
    eatAnimEnd: function(v) {
        if (this.playerROL > 0) {   //右
            this.myAnimPlay('playerIdleRight');
        } else {
            this.myAnimPlay('playerIdleLeft');
        }
        
    },

    /*
    封装动画播放器，播放时赋值给动画状态nowAnimState。
    同时控制动画：
    1. 播放Eat动画时不要被Idle动画打断：如果正在播放Eat而又要播放Idle动画，则直接返回fales
    2. 根据状态播放动画（暂时没有实现）
    */
    myAnimPlay: function(animName) {
        //1
        if((this.nowAnimState.name == 'playerEatRight' || 
        this.nowAnimState.name == 'playerEatLeft') && 
        this.nowAnimState.isPlaying == true){
            if(animName == 'playerIdleRight' || 
            animName == 'playerIdleLeft'){
                return false;
            }
        }
            
        this.nowAnimState = this.anim.play(animName);
    },
});
