var userInfo = {};
const BASE_DEVICE_WIDTH = 750
const EPS = 0.0001
var width = 0
var dpr = 1
wx.getSystemInfo({
    success: function(res) {
        width = res.windowWidth;
        dpr = res.pixelRatio;
    }
});
module.exports = {
    loginMod: null,
    loadModule: function (name) {
        return require("../" + name + "/index");
    },
    transformByDPR: function(a) {
        a = a / BASE_DEVICE_WIDTH * width
        a = Math.floor(a + EPS)

        return a
    },
    getUserInfo: function () {
        if (this.loginMod && !userInfo.id) {
            userInfo = this.loginMod.getUserInfo();
        }
        return userInfo;
    },
    resetUserInfo: function () {
        userInfo = {};
    },
    toType: function (obj) {
        return Object.prototype.toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
    },
    isString: function (val) {
        return this.toType(val) === "string";
    },
    isArray: function (val) {
        return Array.isArray(val); // || Object.prototype.toString.call(val) === '[object Array]'
    },
    isObject: function (val) {
        return val === Object(val);
    },
    isPlainObject: function (obj) {
        if (this.toType(obj) !== "object" || obj.nodeType) {
            return false;
        }

        try {
            if (obj.constructor &&
                !{}.hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
                return false;
            }
        } catch (e) {
            return false;
        }
        return true;
    },
    isFunction: function (val) {
        return Object.prototype.toString.call(val) === '[object Function]';
    },
    isNumeric: function (val) {
        return typeof (val) === 'number';
    },

    extend: function () {
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        // Handle a deep copy situation
        if (typeof target === "boolean") {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (typeof target !== "object" && !this.isFunction(target)) {
            target = {};
        }

        // extend $ itself if only one argument is passed
        if (length === i) {
            return target;
        }

        for (; i < length; i++) {
            // Only deal with non-null/undefined values
            if ((options = arguments[i]) != null) {
                // Extend the base object
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (this.isPlainObject(copy) || (copyIsArray = this.isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && this.isArray(src) ? src : [];

                        } else {
                            clone = src && this.isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = this.extend(deep, clone, copy);

                        // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        return target;
    },

    request: function (opt,noCheckUser) {
        var _this = this;
        if (opt.showLoading !== false) {
            wx.showToast({
                mask: opt.showMask || false,
                title: '加载中',
                icon: 'loading',
                duration: 10000
            });
        }
        var data = opt.data || {};
/*
        this.getUserInfo();
        if (userInfo.id && !noCheckUser) {
            data.userId = userInfo.id;
            data.token = userInfo.token;
        }
*/
        //data.debug_port = 'sandbox1';
        function requestFail(res) {
            opt.fail && opt.fail(res);
        }

        function requestSuccess(rt) {
            if(rt.statusCode > 400)  {
                requestFail(rt)
            } else if (opt.succOption) {
                opt.succOption.data = rt.data;
                _this.checkAjaxResult(opt.succOption, opt);
            } else {
                opt.success && opt.success(rt);
            }
        }  

        wx.request({
            url: opt.url,
            data: data,
            method: opt.method || "GET",
            complete: function () {
                wx.hideToast();
                opt.complete && opt.complete();
            },
            success: requestSuccess,
            fail: requestFail
        });
    },



    showModal: function (content, success) {
        if (typeof content == 'object') {
            var opt = content;
        } else if (typeof content == 'string') {
            var opt = {
                title: content,
                success: success
            }
        } else {
            return;
        }
        wx.showModal({
            title: opt.title || '',
            content: opt.content || '',
            showCancel: opt.showCancel || false,
            confirmText: opt.confirmText || '确定',
            success: function (res) {
                typeof opt.success == 'function' && opt.success(res);
            }
        })
    },

    checkAjaxResult: function (obj, opt) {
        var _this = this,
            data = obj.data,
            code = Number(data.status.status_code);

        if (code === 120) {
            //console.log("登录已过期，请重新登录");
            if (_this.loginMod) { //登录失效自动静默登录
                _this.resetUserInfo();
                _this.loginMod.config.loginCb.success = function () {
                    _this.request(opt);
                    _this.loginMod.config.loginCb.success = null;
                }
                _this.loginMod.doLogin();
            } else {
                _this.showModal({
                    title: '登录已过期，请重新登录',
                    success: function (res) {
                        if (res.confirm) {
                            _this.loginMod && _this.loginMod.doLogout();
                        }
                    }
                });
            }
            return;
        }

        if (code === 0) {
            obj.success && obj.success(data);
        } else {
            if (obj.error) {
                obj.error(data);
            } else if (data.status.status_reason) {
                _this.showModal(data.status.status_reason);
            }
        }
    },

    /**
     *  对象赋值拷贝
     * 
     * @param {object} target and other objects 
     * @returns {object} 拷贝后的对象
     */
    assign: function (target) {

      if (typeof Object.assign == 'function') {
        return Object.assign.apply(null, Array.prototype.slice.call(arguments));
      }

      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      target = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source != null) {
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
      }
      return target;
    },
}
