var app = getApp();
var toast = require('../../template/toast/index.js');
var util = require("../../utils/util.js");

Page({
    scopeData:{
        pageNum:1,
        pageSize:20,
        leftHeight:0,
        rightHeight:0,
        hids:[]
    },
    data : {
        toast:{
            show: false,
            isMask: false,
            content: ''
        },
        loadmore: {
            isLoading : false,//正在加载 则显示加载动画 同时触发底部不更新 加载完毕 设置为false
            hideOverTip : false,
            isOver : false//全部加载完毕
        },
        isEmpty:false,
        leftList:[],
        rightList:[]
    },

    onLoad: function(e){
        this.getList();
        var login = require("../../modules/login/index.js");
        if(!login.isLogin()){
            login.doLogin();
        }else{
            app.globalData.userInfo = login.getUserInfo();
        }
    },

    getList: function(){
        var self = this;
        if(self.data.loadmore.isLoading || self.data.loadmore.isOver){
            return;
        }

        self.setData({
            "loadmore.isLoading" : true,
        });
        util.request({
            url : app.globalData.domain.request+"/wx.php?m=weapp&act=GetPhotoList",
            data : {
                page : self.scopeData.pageNum,
                pageSize : self.scopeData.pageSize
            },
            complete : function(){
                var data = {
                    "loadmore.isLoading" : false
                }
                if(!self.data.leftList.length){
                    data.isEmpty = true;
                }
                self.setData(data);
            },
            success : function(res){

                util.checkAjaxResult({
                    data : res.data,
                    success : function(rt){
                        var data = {},
                            item,imgInfo,
                            res = rt.result.items,
                            length = res.length,
                            curPage = self.scopeData.pageNum;

                        if(length){
                            for(var i=0; i<length; i++){
                                item = res[i];
                                if(~self.scopeData.hids.indexOf(item.hid)){//去除重复
                                    continue;
                                }
                                self.scopeData.hids.push(item.hid);
                                imgInfo = item.src.match(/wh(\d+)x(\d+)\.\w+$/);
                                if(self.scopeData.leftHeight<=self.scopeData.rightHeight){
                                    self.data.leftList.push(item);
                                    self.scopeData.leftHeight += Math.round(Number(imgInfo[2])/Number(imgInfo[1])*750);

                                }else{
                                    self.data.rightList.push(item);
                                    self.scopeData.rightHeight += Math.round(Number(imgInfo[2])/Number(imgInfo[1])*750);
                                }
                              //console.log(self.scopeData.leftHeight,self.scopeData.rightHeight,Math.round(Number(imgInfo[2])/Number(imgInfo[1])*750))
                            }
                            data = {
                                leftList : self.data.leftList,
                                rightList : self.data.rightList
                            };

                            if(length < self.scopeData.pageSize){
                                data.loadmore = {isOver:true};

                                if(curPage < 2){
                                    data.loadmore.hideOverTip = true//不足一页不显示“没有了”
                                }else{
                                    setTimeout(function(){
                                        self.setData({
                                            "loadmore.hideOverTip" : true
                                        });
                                    },3500);
                                }
                            }else{
                                ++self.scopeData.pageNum;
                            }
                        }
                        else {
                            data = {
                                loadmore:{isOver : true}
                            }
                            if(curPage === 1){
                                data.isEmpty = true;
                                data.loadmore.hideOverTip = true;
                            }
                        }

                        self.setData(data);
                    }
                });
            }
        });

    },
    /**
     * 设置分享
     */
    onShareAppMessage: function () {
        return {
            title: '贝比秀秀',
            desc: '萌娃如云，不看后悔',
            path: '/pages/index/index'
        }
    },

    goItem: function(e){
        var id = e.currentTarget.dataset.hid;
        wx.navigateTo({
            url:'/pages/item/index?id='+id
        });
    },

    onShow: function () {
        this.setData({
            loadmore : {isOver:false,isLoading:false}
        })
    }
});