var nebulas = require("nebulas"),
    NebPay = require("nebpay"),
    Account = nebulas.Account,
    HttpRequest = nebulas.HttpRequest,
    Neb = nebulas.Neb;
    
var nasConfig = {
  mainnet: {
      chainID:'1',
      contractAddress: "n1xarNBZfx1JWdF677rMbR7MD8477u4KSif",
      host: "https://mainnet.nebulas.io",
      payHost: "https://pay.nebulas.io/api/mainnet/pay"
  },
  testnet: {
      chainID:'1001',
      contractAddress: "n1tZRxpoi414WJZn4WXok6QAoLi25rbgaPv",
      host: "https://testnet.nebulas.io",
      payHost: "https://pay.nebulas.io/api/pay"
  }
}
var neb = new Neb();
var chainInfo=nasConfig.mainnet;

neb.setRequest(new HttpRequest(chainInfo.host));
var nasApi = neb.api;

var nebPay = new NebPay();

var account;
var user;
var isMobile;
var dappAddress=chainInfo.contractAddress;
var wait,transSerial,transTimer;
var lastID;
var wait;
let GET_LIMIT=5;

window.App = {
  start: function () {

    this.getAccount();
  },
  get: function (func,args,callback) {
    var self = this
    nasApi.call({
        chainID: chainInfo.chainID,
        from: dappAddress,
        to: dappAddress,
        value: 0,
        gasPrice: 1000000,
        gasLimit: 2000000,
        contract: {
            function: func,
            args: args
        }
    }).then(function (resp) {
        console.log('----'+resp.result)
        if(callback) callback(JSON.parse(resp.result))
    })
},

transReceipt:function(cb){
  var self=this;
  if(wait>10){
    $.hidePreloader();
    $.toast('超时，请自行刷新查看！');
    return ;
  }
  $.showPreloader('交易确认中...'+wait)
  
  this.get("transReceipt","[\""+transSerial+"\"]",function(result){
    if(result){
      console.log('result='+JSON.stringify(result))
      $.hidePreloader();
      if(cb)cb(result);
    }else{
      wait++;
      setTimeout(() => {
        self.transReceipt(cb);
      }, 5000);
    }
  });
},

login:function(){
  var self=this;
  var addr=$('#wallet-address').val().trim();
  if(addr==""){
    return $.toast('地址不能为空！',500);
  }
  var args= "[\""+addr+"\"]";
  $.showPreloader('登录验证中...')
  this.get("login",args,function(result){
    $.hidePreloader();
    if(result){
      account=result.address;
      localStorage.setItem("account",account)
      self.closePopup();
      self.getBaseData();
    }else self.openRegisPop();
  })
  
},



openRegisPop:function(){
  $.popup('.popup-regis');
},


openProfilePop:function(){
  if(!this.checkUser()) return;
  if(user.avatar)$('#prof-avatar').attr('src',user.avatar);
  $('#prof-name').text(user.name);
  $('#prof-fans').text(user.fans);
  $('#prof-like').text(user.like);

  $.popup('.popup-profile');
},
openloginPop:function(){
  $.popup('.popup-login');

  
},
openPostPop:function(){
  if(!this.checkUser()) return;
  $.popup('.popup-post');

},



register:function(){
  var self=this;
  transSerial=this.getRandCode(10);
  var name=$('#reg-name').val().trim();
  var imgUrl=$('#reg-avatar')[0].src;
  if(name==""||name.length>10){
    return $.toast('昵称输入错误！',500);
  }
  imgUrl=imgUrl.indexOf('default.png') > -1?"":imgUrl;
  var callArgs= "[\""+name+"\",\""+imgUrl+"\",\""+transSerial+"\"]";
  nebPay.call(dappAddress, "0", "register", callArgs,{    
    listener: self.registerCB
  });
  
  if(isMobile) this.getRegister()
  
},

registerCB:function(cb){
  if(cb.txhash) App.getRegister()
},
getRegister:function(){
  var self=this;
  wait=0;
  this.transReceipt(function(result){
    if(result){
      account=result;
      self.closePopup();
      self.getBaseData();
      //$.toast(account+' OK !');
      localStorage.setItem("account",account)
    }
  })
},


closePopup:function(){
  $.closeModal();
},

openApp:function(){
  var appParams = {
		category: "jump",
		des: "confirmTransfer",
		pageParams: "{}"
	};
	var url = "openapp.NASnano://virtual?params=" + JSON.stringify(appParams);
	// window.location.href = url;
  // var url = "openapp.NASnano://virtual?params=1";
  alert(url);
	window.location.href = url
},



getBaseData:function(){
  var self=this;
  lastID=0;
  // this.checkUser();
  var args= "[\""+account+"\"]";
  $.showPreloader('数据加载中...')
  this.get("getBaseData",args,function(result){
    $.hidePreloader();
    if(result){
      console.log(result);
      user=result.user;
      self.initStatus(result.statuses);
      if(user.avatar)$('#my-avatar').attr('src',user.avatar);
    }
  })
},

  getStatuses:function(){
    var self=this;
    // this.checkUser();
    var args= "["+lastID+"]";
    $.showPreloader('数据加载中...')
    this.get("getStatuses",args,function(result){
      $.hidePreloader();
      if(result){
       self.initStatus(result);
      }
    })
  },

  

  initStatus:function(statuses){
    // console.log(statuses);
    var self=this;
    var html = lastID>0? $('.all-status').html():'';
    statuses.forEach(s => {
      lastID=s.id;
      var like=s.like==null?'':s.like;
      var date=self.toDate(s.time);
      var image=s.image&&self.checkUrl(s.image)?'<img src="'+s.image+'" width="100%">':'';
      var avatar=s.author.avatar&&self.checkUrl(s.author.avatar)?s.author.avatar:'./image/default.png';
     
      html += '<div class="content-status "><div class="card facebook-card"><div class="card-header no-border"><a class="button pull-right '+(s.author.follow?'disabled':'')+'" onclick="'+(s.author.follow?'App.unfollow('+s.author.id+')':'App.follow('+s.author.id+')')+'">'+(s.author.follow?'已关注':'关注')+'</a><div class="facebook-avatar"><img src="'+avatar+'" width="34" height="34"></div><div class="facebook-name">'+s.author.name+'</div><div class="facebook-date">'+date+'</div></div><div class="card-content"><div class="content-block"><p>'+s.text+'</p></div>'+image+'</div><div class="card-footer no-border"><a href="#" class="link " onclick="App.likeStatus('+s.id+')">赞 '+like+'</a><a href="#" class="link"># '+s.id+'</a></div></div></div>';
    });
    var moreBtn='<button class="button more-btn" onclick="App.getStatuses()">加载更多</button>'
    var nullText='没有更多了';
    $('.status-bottom').html(statuses.length>=GET_LIMIT?moreBtn:nullText);
    $('.all-status').html(html);
  },


  postStatus:function(){
    var self=this;
    var text=$('#post-text').val().trim();
    var imgUrl=$('#post-image')[0].src;
    if(text=="") return $.toast('文本不能为空！',500)
    if(text.length>255){
      return $.toast('文本太长了，限制255个字符',500)
    }
    imgUrl=imgUrl.indexOf('none')>-1?"":imgUrl;
    transSerial=this.getRandCode(10);
    var callArgs= "[\""+text+"\",\""+imgUrl+"\",\""+transSerial+"\"]";
    nebPay.call(dappAddress, "0", "postStatus", callArgs, {    
        listener: self.postStatusCB
    });
    if(isMobile) this.getPostStatus();
  },

  postStatusCB:function(cb){
    if(cb.txhash) App.getPostStatus();
  },
  getPostStatus:function(){
    var self=this;
    wait=0;
    this.transReceipt(function(result){
      if(result){
        self.closePopup();
        self.getBaseData();
        $.toast('发布成功！')
      }
    })
  },

  likeStatus:function(id){
    var self=this;
    if(!self.checkUser())return
    transSerial=this.getRandCode(10);
    var callArgs= "["+id+",\""+transSerial+"\"]";
    nebPay.call(dappAddress, "0", "likeStatus", callArgs, {    
        listener: self.likeStatusCB
    });
    if(isMobile) this.getLikeStatus();
  },

  likeStatusCB:function(cb){
    if(cb.txhash) App.getLikeStatus();
  },
  getLikeStatus:function(){
    var self=this;
    wait=0;
    this.transReceipt(function(result){
      if(result){
        self.getBaseData();
        $.toast('点赞成功！')
      }
    })
  },

  unfollow:function(id){
    var self=this;
    $.confirm('要取消关注吗？',function(){
      self.follow(id);
    })
  },
  
  follow:function(id){
    var self=this;
    if(!self.checkUser())return
    transSerial=this.getRandCode(10);
    var callArgs= "["+id+",\""+transSerial+"\"]";
    nebPay.call(dappAddress, "0", "follow", callArgs, {    
        listener: self.followCB
    });
    if(isMobile) this.getFollow();
  },

  followCB:function(cb){
    if(cb.txhash) App.getFollow();
  },
  getFollow:function(){
    var self=this;
    wait=0;
    this.transReceipt(function(result){
      if(result){
        self.getBaseData();
        $.toast('操作成功！');
      }
    })
  },
 
  checkUrl:function(str) {
    var RegUrl = new RegExp(); 
    RegUrl.compile("^[A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+$"); 
    return RegUrl.test(str);
  }, 

  
  toDate:function(ts){
    var date = new Date(ts*1000);
    var Y = date.getFullYear() + '-';
    var M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
    var D = (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate()) + ' ';
    var h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
    var m = (date.getMinutes() <10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
    var s = (date.getSeconds() <10 ? '0' + date.getSeconds() : date.getSeconds());
    return h+m+s+'　'+Y+M+D;
},  

  getRandCode:function(len){
    var d,e,b = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",c = "";
    for (d = 0;d<len; d ++) {
        e = Math.random() * b.length, e = Math.floor(e), c += b.charAt(e);
    }
    return c;  
  },

  checkUser:function(){
    if(browser.versions.qq||browser.versions.weixin){
      var img='./image/'+(browser.versions.ios?'ios':'android')+'.png';
      $('#jump-device').attr('src',img)
       $.popup('.popup-jump');
       return false;
    }
    if(!account&&isMobile){
      this.openloginPop();
      return false;
    } 
    if(!user) {
      this.openRegisPop()
      return false
    }
    return true;
  },

  getAccount:function(){
    var self=this;
    account=localStorage.getItem('account');
    console.log('local='+account);
    if(isMobile) return self.getBaseData();
    window.addEventListener('message', function (e) {
        if (e.data && e.data.data) {
            if (e.data.data.account) {
                account= e.data.data.account
                self.getBaseData();
                console.log('extwallet='+account)
            }
        }
    })

    window.postMessage({
        "target": "contentscript",
        "data": {},
        "method": "getAccount",
    }, "*");
  },

  base64Image : function (img, width) {
    var canvas = document.createElement("canvas");
    var scale = img.height/img.width;
    var height=parseInt(width*scale)
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // var ext = img.src.substring(img.src.lastIndexOf(".")+1).toLowerCase();  
    var dataURL = canvas.toDataURL("image/jpeg",0.7); 
    return dataURL;
  },
  upload:function(img,imgid){
    var self=this;
    var img=img.files[0];
    console.log(img);
   
    if(!(/jpeg|jpg|png|gif|bmp/.test(img.type))){
        return alert('格式错误，请上传图片');
    }
    
    var fromdata=new FormData();
    fromdata.append('smfile',img);
    $.ajax({
          url: "https://sm.ms/api/upload",
          type: 'POST',
          cache: false,
          data: fromdata,
          processData: false,
          contentType: false,
          dataType:"json",
          beforeSend: function(){
              // uploading = true;
              console.log('开始')
              $.showPreloader('图片上传中...')
          },
          success : function(resp) {
            console.log(resp);
            $.hidePreloader();
            $.toast("上传成功！")
            var url=resp.data.url;
            $('#'+imgid).attr('src',url);
            console.log('url='+url);
          },
          error:function(){
            weui.topTips('上传失败了，请重试！')
          }
    });
    // var imgUrl=window.URL.createObjectURL(img);
    // var image = new Image();
    // image.src = imgUrl;  
    // image.onload = function(){  
    //   var base64 = self.base64Image(image,300);  
    //   console.log(base64); 
    //   $('#avatar').attr("src",base64);
    //   $('#avatarData').text(base64);
    // } 
  }
};

var browser = {
  versions: function() {
      var u = navigator.userAgent,
          app = navigator.appVersion;
      return { //移动终端浏览器版本信息
          trident: u.indexOf('Trident') > -1, //IE内核
          presto: u.indexOf('Presto') > -1, //opera内核
          webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
          gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
          mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
          ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
          android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或uc浏览器
          iPhone: u.indexOf('iPhone') > -1, //是否为iPhone或者QQHD浏览器
          iPad: u.indexOf('iPad') > -1, //是否iPad
          webApp: u.indexOf('Safari') == -1, //是否web应该程序，没有头部与底部
          weixin: u.indexOf('MicroMessenger') > -1, //是否微信   
          qq: u.match(/\sQQ/i) !== null//u.indexOf("MQQBrowser")>-1  //是否QQ 
      };
  }(),
  language: (navigator.browserLanguage || navigator.language).toLowerCase()
}

window.addEventListener('load', function () {
  
  isMobile=browser.versions.mobile;
  console.log("isMobile"+isMobile);
  if(typeof(webExtensionWallet) === "undefined"&&!isMobile){
    $("#noExtension").removeClass("hide");
    $(".mainPage").addClass('hide');
  }else{
      App.start();
      // $.init();
  }
});
