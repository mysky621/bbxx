var app = getApp();
var toast = require('../../template/toast/index.js');
var util = require("../../utils/util.js");

Page({
    scopeData:{
        id:0,
        userId:'',
        from: '',
        imgs:[]
    },
    data : {
        toast:{
            show: false,
            isMask: false,
            content: ''
        },
        items:[],
        indicatorDots: true,
        autoplay: true,
        interval: 5000,
        duration: 500,
        group : {},
        praiseUser: [],
        praiseStatus:false,
        from:'',
        height:'0'
    },

    onLoad: function(e){
        var self = this,
          hid = e.id;
        this.scopeData.id = hid;
        this.scopeData.from = e.from || '';

        var login = require("../../modules/login/index.js");
        if(login.isLogin()){
            if(!app.globalData.userInfo.id){
                app.globalData.userInfo = login.getUserInfo();
            }
            this.scopeData.userId = app.globalData.userInfo.id;
        }else {
            login.setConfig({
              loginCb:{
                success: function(data){
                  self.scopeData.userId = app.globalData.userInfo.id;
                }
              },
            })
            login.doLogin();
        }
        //console.log(this.scopeData)
        if(!hid){
            self.showError("参数有误");
        }else{
            this.getData(hid);
        }
    },

    getData: function(hid){
        var self = this;
        util.request({
            url : app.globalData.domain.request+"/wx.php?m=weapp&act=GetPhotoByHid",
            data : {
                hid : hid
            },
            success : function(res){
                //这里需要将proxy的接口数据进行过滤 再次检测实际接口的数据
                util.checkAjaxResult({
                    data : res.data,
                    success : function(rt){
                        var data = {},
                            group = rt.result.group,
                            praiseUser = rt.result.praiseUser,
                            items = rt.result.items,
                            length = items.length,
                            imgInfo,curHeight,
                            height = 0;

                        if(length){
                            group.title && wx.setNavigationBarTitle({title:group.title});
                            for(var key in items){
                                self.scopeData.imgs.push(items[key].src);
                                self.data.items.push(items[key]);
                                imgInfo = items[key].src.match(/wh(\d+)x(\d+)\.\w+$/);
                                curHeight = imgInfo[2]*710/imgInfo[1];
                                if(curHeight>height){
                                    height = curHeight;
                                }
                            }
                            if(group.praiseIds){
                                group.praiseIds = group.praiseIds.split(',');
                            }

                            data = {
                                from: self.scopeData.from,
                                height: height+'rpx',
                                items : self.data.items,
                                group : group,
                                praiseUser: praiseUser || [],
                                praiseStatus:self.scopeData.userId?(~group.praiseIds.indexOf(self.scopeData.userId)?true:false):false
                            };
                            //console.log(data)
                            if(self.data.items.length<=1){
                                data.indicatorDots = false;
                            }
                            self.setData(data);
                        } else {
                            self.showError("该相册不存在");
                        }
                    }
                });
            },
            fail : function(){
                self.showError("获取相片列表失败");
            }
        });

    },

    praise: function(e){
        var self = this;
        if(this.data.praiseStatus){
           return;
        }
        if(!this.scopeData.userId){
            var msg = '点赞需要你授权允许使用你微信个人资料哦，请退出并删除小程序后再试';
            toast.show(this,msg);
            return;
        }

        util.request({
            url : app.globalData.domain.request+"/wx.php?m=weapp&act=Praise",
            data : {
                hid : self.scopeData.id,
                userid: self.scopeData.userId
            },
            success : function(res){
                //这里需要将proxy的接口数据进行过滤 再次检测实际接口的数据
                util.checkAjaxResult({
                    data : res.data,
                    success : function(rt){
                        self.data.praiseUser || (self.data.praiseUser=[])
                        self.data.praiseUser.push({
                            id:app.globalData.userInfo.id,
                            name:app.globalData.userInfo.nickName,
                            img:app.globalData.userInfo.avatarUrl
                        });
                        self.setData({
                            praiseUser: self.data.praiseUser,
                            praiseStatus:true
                        });
                    }
                });
            },
            fail : function(){
                toast.show(self,'出错了哦');
            }
        });

    },
    /**
     * 设置分享
     */
    onShareAppMessage: function () {
        var self = this;
        return {
            title: self.data.group.title || '相册详情',
            desc: '萌娃如云，不看后悔',
            path: '/pages/item/index?from=share&id='+self.scopeData.id
        }
    },
    goUserHome: function(e){
      var id = e.currentTarget.dataset.id;
      wx.redirectTo({
        url:'/pages/my/list?userid='+id
      });
    },

    previewImage: function (e) {
        var url = e.currentTarget.dataset.url;
        wx.previewImage({
            current: url,
            urls: this.scopeData.imgs // 需要预览的图片http链接列表
        })

    },
    showError: function(msg){
        toast.show(this,msg);
        wx.navigateBack();
    }
});