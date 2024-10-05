// ==UserScript==
// @name         普法助手
// @namespace    Shanglin-Youth
// @version      2.5
// @description  全国学生“学宪法 讲宪法”活动自动答题脚本,因缺少测试账号无法保证每年都能用，欢迎大家提供测试账号以支持此脚本长期可用，测试账号登录信息请发送至我们的邮箱admin@shanglin.cloud
// @author       Shanglin-Youth
// @connect      *
// @match        *://static.qspfw.moe.gov.cn/*
// @icon         https://pfzs.shanglin.cloud/files/logo32.ico
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @license      MIT
// @require      https://cdn-js.shanglin.cloud/jquery.min.js
// @require      https://cdn-js.shanglin.cloud/sweetalert2.all.min.js
// @require      https://cdn-js.shanglin.cloud/crypto-js.min.js
// @require      https://cdn-js.shanglin.cloud/xlsx.full.min.js
// @downloadURL none
// ==/UserScript==

var _self = unsafeWindow,
    $ = _self.jQuery || top.jQuery,
    Swal = Swal || window.Swal,
    columnId = getQueryVariable("columnId"),
    answer_list = [],
    exam_list = [],
    time = 1e3, // 答题间隔时间，最好为 5 秒
    save_key = "xfxws2024",
    num = {"A": 1,"B": 2, "C": 3, "D": 4};

(function() {
    'use strict';
    var element, input, imgIndex, canvasIndex, inputIndex, captchaType;
    var localRules = [];
    var queryUrl = "http://no-captcha.shanglin.cloud:2024/api/ocr/"
    var exist = false;
    var iscors = false;
    var inBlack = false;
    var firstin = true;
    //判断是否为验证码（预设规则）
    function isCode(){
        if (element.height >= 100 || element.height == element.width)
            return false;
        var attrList = ["id", "title", "alt", "name", "className", "src"];
        var strList = ["code", "Code", "CODE", "captcha", "Captcha", "CAPTCHA", "yzm", "Yzm", "YZM", "check", "Check", "CHECK", "random", "Random", "RANDOM", "veri", "Veri", "VERI", "验证码", "看不清", "换一张"];
        for (var i = 0; i < attrList.length; i++) {
            for (var j = 0; j < strList.length; j++) {
                // var str = "element." + attrList[i];
                var attr = element[attrList[i]];
                if (attr.indexOf(strList[j]) != -1) {
                    return true;
                }
            }
        }
        return false;
    }
    //判断是否为验证码输入框（预设规则）
    function isInput(){
        var attrList = ["placeholder", "alt", "title", "id", "className", "name"];
        var strList = ["code", "Code", "CODE", "captcha", "Captcha", "CAPTCHA", "yzm", "Yzm", "YZM", "check", "Check", "CHECK", "random", "Random", "RANDOM", "veri", "Veri", "VERI", "验证码", "看不清", "换一张"];
        for (var i = 0; i < attrList.length; i++) {
            for (var j = 0; j < strList.length; j++) {
                // var str = "input." + attrList[i];
                var attr = input[attrList[i]];
                if (attr.indexOf(strList[j]) != -1) {
                    // console.log(attr);
                    return true;
                }
            }
        }
        return false;
    }
    //按已存规则填充
    function codeByRule(){
        var code = "";
        var src = element.src;
        if (firstin){
            firstin = false;
            if (src.indexOf('data:image') != -1) {
                // console.log(src);
                code = src.split("base64,")[1];
                GM_setValue("tempCode", code);
                if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                    // console.log("preCode:" + GM_getValue("preCode"))
                    // console.log("tempCode:" + GM_getValue("tempCode"))
                    GM_setValue("preCode", GM_getValue("tempCode"));
                    p1(code).then((ans) => {
                        if (ans != "")
                            writeIn1(ans);
                        else
                            codeByRule();
                    });
                }
            }
            else if (src.indexOf('blob') != -1) {
                const image = new Image()
                image.src = src;
                image.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = image.width
                    canvas.height = image.height
                    const context = canvas.getContext('2d')
                    context.drawImage(image, 0, 0, image.width, image.height);
                    code = canvas.toDataURL().split("base64,")[1];
                    GM_setValue("tempCode", code);
                    if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                        GM_setValue("preCode", GM_getValue("tempCode"));
                        p1(code).then((ans) => {
                            if (ans != "")
                                writeIn1(ans);
                            else
                                codeByRule();
                        });
                    }
                }
            }
            else {
                try {
                    var img = element;
                    if (img.src && img.width != 0 && img.height != 0) {
                        var canvas = document.createElement("canvas");
                        var ctx = canvas.getContext("2d");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0, img.width, img.height);
                        code = canvas.toDataURL("image/png").split("base64,")[1];
                        GM_setValue("tempCode", code);
                        if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                            // console.log("preCode:" + GM_getValue("preCode"))
                            // console.log("tempCode:" + GM_getValue("tempCode"))
                            GM_setValue("preCode", GM_getValue("tempCode"));
                            p1(code).then((ans) => {
                                if (ans != "")
                                    writeIn1(ans);
                                else
                                    codeByRule();
                            });
                        }
                    }
                    else {
                        codeByRule();
                    }
                }
                catch(err){
                    return;
                }
            }
        }
        else {
            if (src.indexOf('data:image') != -1) {
                // console.log(src);
                code = src.split("base64,")[1];
                GM_setValue("tempCode", code);
                if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                    // console.log("preCode:" + GM_getValue("preCode"))
                    // console.log("tempCode:" + GM_getValue("tempCode"))
                    GM_setValue("preCode", GM_getValue("tempCode"));
                    p1(code).then((ans) => {
                        writeIn1(ans);
                    });
                }
            }
            else if (src.indexOf('blob') != -1) {
                const image = new Image()
                image.src = src;
                image.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = image.width
                    canvas.height = image.height
                    const context = canvas.getContext('2d')
                    context.drawImage(image, 0, 0, image.width, image.height);
                    code = canvas.toDataURL().split("base64,")[1];
                    GM_setValue("tempCode", code);
                    if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                        GM_setValue("preCode", GM_getValue("tempCode"));
                        p1(code).then((ans) => {
                            writeIn1(ans);
                        })
                    }
                }
            }
            else {
                var canvas = document.createElement("canvas");
                var ctx = canvas.getContext("2d");
                element.onload = function() {
                    // console.log("img.onload");
                    canvas.width = element.width;
                    canvas.height = element.height;
                    ctx.drawImage(element, 0, 0, element.width, element.height);
                    code = canvas.toDataURL("image/png").split("base64,")[1];
                    GM_setValue("tempCode", code);
                    if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                        // console.log("preCode:" + GM_getValue("preCode"))
                        // console.log("tempCode:" + GM_getValue("tempCode"))
                        GM_setValue("preCode", GM_getValue("tempCode"));
                        p1(code).then((ans) => {
                            writeIn1(ans);
                        });
                    }
                }
            }
        }
    }

    function canvasRule(){
        setTimeout(function(){
            // console.log(element.toDataURL("image/png"));
            try {
                var code = element.toDataURL("image/png").split("base64,")[1];
                GM_setValue("tempCode", code);
                if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                    // console.log("preCode:" + GM_getValue("preCode"))
                    // console.log("tempCode:" + GM_getValue("tempCode"))
                    GM_setValue("preCode", GM_getValue("tempCode"));
                    p1(code).then((ans) => {
                        writeIn1(ans);
                    });
                }
            }
            catch(err){
                canvasRule();
            }
        }, 100);
    }

    //寻找网页中的验证码
    function findCode(k){
        var code = '';
        var codeList = document.getElementsByTagName('img');
        // console.log(codeList);
        for (var i = k; i < codeList.length; i++) {
            var src = codeList[i].src;
            element = codeList[i];
            if (src.indexOf('data:image') != -1) {
                if (isCode()) {
                    firstin = false;
                    code = src.split("base64,")[1];
                    // console.log('code: ' + code);
                    GM_setValue("tempCode", code);
                    if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                        // console.log("preCode:" + GM_getValue("preCode"))
                        // console.log("tempCode:" + GM_getValue("tempCode"))
                        GM_setValue("preCode", GM_getValue("tempCode"));
                        p(code, i).then((ans) => {
                            writeIn(ans);
                        });
                    }
                    break;
                }
            }
            else {
                if (isCode()) {
                    if (firstin){
                        firstin = false;
                        var img = element;
                        if (img.src && img.width != 0 && img.height != 0) {
                            var canvas = document.createElement("canvas");
                            var ctx = canvas.getContext("2d");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0, img.width, img.height);
                            code = canvas.toDataURL("image/png").split("base64,")[1];
                            try{
                                code = canvas.toDataURL("image/png").split("base64,")[1];
                            }
                            catch(err){
                                //console.log(err);
                                findCode(i + 1);
                                return;
                            }
                            // console.log(code);
                            GM_setValue("tempCode", code);
                            if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                                iscors = isCORS();
                                // console.log("preCode:" + GM_getValue("preCode"))
                                // console.log("tempCode:" + GM_getValue("tempCode"))
                                GM_setValue("preCode", GM_getValue("tempCode"));
                                p(code, i).then((ans) => {
                                    if (ans != "")
                                        writeIn(ans);
                                    else
                                        findCode(i);
                                });
                                return;
                            }
                        }
                        else{
                            findCode(i);
                            return;
                        }
                    }
                    else {
                        var canvas = document.createElement("canvas");
                        var ctx = canvas.getContext("2d");
                        element.onload = function(){
                            canvas.width = element.width;
                            canvas.height = element.height;
                            ctx.drawImage(element, 0, 0, element.width, element.height);
                            try{
                                code = canvas.toDataURL("image/png").split("base64,")[1];
                            }
                            catch(err){
                                //console.log(err);
                                findCode(i + 1);
                                return;
                            }
                            // console.log(code);
                            GM_setValue("tempCode", code);
                            if (GM_getValue("tempCode") != GM_getValue("preCode")) {
                                iscors = isCORS();
                                // console.log("preCode:" + GM_getValue("preCode"))
                                // console.log("tempCode:" + GM_getValue("tempCode"))
                                GM_setValue("preCode", GM_getValue("tempCode"));
                                p(code, i).then((ans) => {
                                    writeIn(ans);
                                });
                                return;
                            }
                        }
                        break;
                    }
                }
            }
        }
    }

    //寻找网页中的验证码输入框
    function findInput(){
        var inputList = document.getElementsByTagName('input');
        // console.log(inputList);
        for (var i = 0; i < inputList.length; i++) {
            input = inputList[i];
            if (isInput()) {
                return true;
            }
        }
    }

    //将识别结果写入验证码输入框（预设规则）
    function writeIn(ans){
        if (findInput()) {
            ans = ans.replace(/\s+/g,"");
            input.value = ans;
            if (typeof(InputEvent)!=="undefined"){
                input.value = ans;
                input.dispatchEvent(new InputEvent('input'));
                var eventList = ['input', 'change', 'focus', 'keypress', 'keyup', 'keydown', 'select'];
                for (var i = 0; i < eventList.length; i++) {
                    fire(input, eventList[i]);
                }
                input.value = ans;
            }
            else if(KeyboardEvent) {
                input.dispatchEvent(new KeyboardEvent("input"));
            }
        }
    }

    //识别验证码（预设规则）
    function p(code, i){
        return new Promise((resolve, reject) =>{
            const datas = {
                "img_base64": String(code),
            }
            GM_xmlhttpRequest({
                method: "POST",
                url: queryUrl + "image",
                data: JSON.stringify(datas),
                headers: {
                    "Content-Type": "application/json",
                },
                responseType: "json",
                onload: function(response) {
                    // console.log(response);
                    if (response.status == 200) {
                        if (response.responseText.indexOf("触发限流策略") != -1)
                            topNotice(response.response["msg"]);
                        try{
                            var result = response.response["result"];
                            console.log("识别结果：" + result);
                            return resolve(result);
                        }
                        catch(e){
                            if (response.responseText.indexOf("接口请求频率过高") != -1)
                                // console.log(response.responseText)
                                topNotice(response.responseText);
                        }
                    }
                    else {
                        try {
                            if (response.response["result"] == null)
                                findCode(i + 1);
                            else
                                console.log("识别失败");
                        }
                        catch(err){
                            console.log("识别失败");
                        }
                    }
                }
            });
        });
    }

    var imgSrc = "";
    //监听页面变化
    setTimeout(function(){
        const targetNode = document.body;
        const config = { attributes:true, childList: true, subtree: true};
        const callback = function() {
            if (inBlack) return;
            try {
                if (iscors){
                    if (element == undefined) {
                        pageChange();
                    }
                    if (element.src != imgSrc) {
                        console.log("【自动识别填充验证码】页面/验证码已更新，正在识别...");
                        imgSrc = element.src;
                        pageChange();
                    }
                }
                else {
                    console.log("【自动识别填充验证码】页面/验证码已更新，正在识别...");
                    pageChange();
                }
            }
            catch(err) {
                return;
                //pageChange();
            }
        }
        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }, time);

    //判断是否跨域
    function isCORS(){
        try {
            if (element.src.indexOf('http') != -1 || element.src.indexOf('https') != -1) {
                if (element.src.indexOf(window.location.host) == -1) {
                    console.log("检测到当前页面存在跨域问题");
                    return true;
                }
                //console.log("当前页面不存在跨域问题");
                return false;
            }
        }
        catch(err){
            return;
        }
    }

    //将url转换为base64（解决跨域问题）
    function p2(){
        return new Promise((resolve, reject) =>{
            GM_xmlhttpRequest({
                url: element.src,
                method: "GET",
                headers: {'Content-Type': 'application/json; charset=utf-8','path' : window.location.href},
                responseType: "blob",
                onload: function(response) {
                    // console.log(response);
                    let blob = response.response;
                    let reader = new FileReader();
                    reader.onloadend = (e) => {
                        let data = e.target.result;
                        element.src = data;
                        return resolve(data);
                    }
                    reader.readAsDataURL(blob);
                }
            });
        });
    }

    //此段逻辑借鉴Crab大佬的代码，十分感谢
    function fire(element,eventName){
        var event = document.createEvent("HTMLEvents");
        event.initEvent(eventName, true, true);
        element.dispatchEvent(event);
    }

    function FireForReact(element, eventName) {
        try {
            let env = new Event(eventName);
            element.dispatchEvent(env);
            var funName = Object.keys(element).find(p => Object.keys(element[p]).find(f => f.toLowerCase().endsWith(eventName)));
            if (funName != undefined) {
                element[funName].onChange(env)
            }
        }
        catch (e) {}
    }

    //判断当前页面是否存在规则，返回布尔值
    function compareUrl(){
        return new Promise((resolve) => {
            let rules = GM_getValue("captchaRules", []);
            let currentUrl = window.location.href.split("?")[0];
            let matchedRule = rules.find(rule => rule.url === currentUrl);
            if (matchedRule) {
                localRules = matchedRule;
                resolve(true);
            } else {
                localRules = [];
                resolve(false);
            }
        });
    }

    //开始识别
    function start(){
        compareUrl().then((isExist) => {
            if (isExist) {
                exist = true;
                console.log("【自动识别填充验证码】已存在该网站规则");
                if (localRules["type"] == "img") {
                    captchaType = localRules["captchaType"];
                    imgIndex = localRules["img"];
                    inputIndex = localRules["input"];
                    element = document.getElementsByTagName('img')[imgIndex];
                    // console.log(element.src);
                    if (localRules["inputType"] == "textarea") {
                        input = document.getElementsByTagName('textarea')[inputIndex];
                    }
                    else {
                        input = document.getElementsByTagName('input')[inputIndex];
                        var inputList = document.getElementsByTagName('input');
                        // console.log(inputList);
                        if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                            inputIndex = parseInt(inputIndex) + 1;
                            input = inputList[inputIndex];
                        }
                    }
                    // console.log(input);
                    if (element && input) {
                        iscors = isCORS();
                        // console.log(input);
                        // console.log(element);
                        if (iscors) {
                            p2().then(() => {
                                // console.log(data);
                                codeByRule();
                            });
                        }
                        else {
                            codeByRule();
                        }
                    }
                    else
                        pageChange();
                }
                else if (localRules["type"] == "canvas") {
                    captchaType = localRules["captchaType"];
                    canvasIndex = localRules["img"];
                    inputIndex = localRules["input"];
                    element = document.getElementsByTagName('canvas')[canvasIndex];
                    if (localRules["inputType"] == "textarea") {
                        input = document.getElementsByTagName('textarea')[inputIndex];
                    }
                    else {
                        input = document.getElementsByTagName('input')[inputIndex];
                        var inputList = document.getElementsByTagName('input');
                        // console.log(inputList);
                        if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                            inputIndex = parseInt(inputIndex) + 1;
                            input = inputList[inputIndex];
                        }
                    }
                    iscors = isCORS();
                    if (iscors) {
                        p2().then(() => {
                            // console.log(data);
                            canvasRule();
                        });
                    }
                    else {
                        canvasRule();
                    }
                }
            }
            else {
                console.log("【自动识别填充验证码】不存在该网站规则，正在根据预设规则自动识别...");
                findCode(0);
            }
        });
    }

    //页面变化执行函数
    function pageChange(){
        if (exist) {
            if (localRules["type"] == "img" || localRules["type"] == null) {
                element = document.getElementsByTagName('img')[imgIndex];
                if (localRules["inputType"] == "textarea") {
                    input = document.getElementsByTagName('textarea')[inputIndex];
                }
                else {
                    input = document.getElementsByTagName('input')[inputIndex];
                    var inputList = document.getElementsByTagName('input');
                    if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                        input = inputList[inputIndex];
                    }
                }
                // console.log(element);
                // console.log(input);
                iscors = isCORS();
                if (iscors) {
                    p2().then(() => {
                        // console.log(data);
                        codeByRule();
                    });
                }
                else {
                    codeByRule();
                }
            }
            else if (localRules["type"] == "canvas") {
                element = document.getElementsByTagName('canvas')[canvasIndex];
                if (localRules["inputType"] == "textarea") {
                    input = document.getElementsByTagName('textarea')[inputIndex];
                }
                else {
                    input = document.getElementsByTagName('input')[inputIndex];
                    var inputList = document.getElementsByTagName('input');
                    if (inputList[0] && (inputList[0].id == "_w_simile" || inputList[0].id == "black_node")) {
                        input = inputList[inputIndex];
                    }
                }
                // console.log(element);
                // console.log(input);
                iscors = isCORS();
                if (iscors) {
                    p2().then(() => {
                        // console.log(data);
                        canvasRule();
                    });
                }
                else {
                    canvasRule();
                }
            }
        }
        else {
            findCode(0);
        }
    }

    var url = window.location.href;
    var imgSrc = "";
    var startstudy = document.querySelector('button[type = "button"]');
    if (window.location.pathname.indexOf('learn_exam.html') != -1) {
        Swal.fire('提示','点击确定开始考试','info').then(()=>{
            Swal.fire({
                position: 'top-end',
                title: '正在自动作答！',
                showConfirmButton: false,
                timer: 10000
            })
            getExam();
            let t = setInterval( function() {
                doExam(t)
            },time);
        })
    } else if (window.location.pathname.indexOf('learn-practice.html') != -1) {
        setTimeout(function function_name(argument) {
            if ($(".inside-pages-title:contains(' 课后练习 ')") != null) {
                getAnswer(columnId);
                let t = setInterval( function() {
                    doQuestion(t)
                },time);
            }
        }, time);
    } else if (window.location.pathname.indexOf('learn_practice_list.html') != -1) {
        setTimeout( function() {$(".red").click();},time);
    } else if (window.location.pathname.indexOf('/user/') != -1) {
        setTimeout(function() {
            start();
            createFileInput();
            readFile();
            readAndWriteStudentInfo();
            //登录按钮以及同意条款的点击
            //$(function dianji(){
            //    var denglu = document.querySelector('button[type = "submit"]');
            //var tongyi = document.querySelector('input[type = "radio"]');
            //tongyi.value=True;
            //    console.log('5555');
            //    denglu.click();
            //    console.log('6666');
            //});
        }, time);
    } else if (window.location.pathname.indexOf('learning-page.html') != -1) {
        setTimeout(function function_name(argument) {
            if ($(".inside-pages-title:contains(' 课程学习 ')") != null) {
                $("#afterClassPractice").click();
            }
        }, time);
    } else if (window.location.pathname.indexOf('evaluation.html') != -1) {
        window.location.href="https://static.qspfw.moe.gov.cn/user/#/user/login?redirect=%2Factivity";
    }
})();

function createFileInput() {
    var courseGradeDetail = document.querySelector(".main");
    var fileInputHTML = '<div><input type="file" id="file-input" accept=".xls,.xlsx"></div>';
    courseGradeDetail.insertAdjacentHTML("afterbegin", fileInputHTML);
    var clearButton = document.createElement("button");
    clearButton.textContent = "清除缓存 ";
    clearButton.addEventListener("click", function() {
        localStorage.removeItem("students");
    });
    var file = document.querySelector("#file-input");
    file.parentNode.appendChild(clearButton);
}

function readFile() {
    var fileInput = document.getElementById("file-input");
    fileInput.addEventListener("change", function() {
        var file = fileInput.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            var data = e.target.result;
            parseExcelData(data);
        };
        reader.readAsBinaryString(file);
    });
}

function parseExcelData(data) {
    var workbook = XLSX.read(data, {type: "binary"});
    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var json = XLSX.utils.sheet_to_json(sheet, {header: 1});
    var students = {};
    for (var i = 1; i < json.length; i++) {
        var row = json[i];
        var id = row[0];
        var name = row[1];
        var password = row[2];
        if (students[id]) {
            continue;
        }
        students[id] = {name: name, password: password};
    }
    var studentsString = JSON.stringify(students);
    localStorage.setItem("students", studentsString);
}

function readAndWriteStudentInfo() {
    var students = JSON.parse(localStorage.getItem("students") || "{}");
    var keys = Object.keys(students || []);
    if (keys.length == 0) {
        return;
    }
    var id = keys[0];
    var name = students[id].name;
    var paw = students[id].password;
    copy_text = id;
    var loginInfo = document.getElementById("formLogin_loginInfo");
    var userName = document.getElementById("formLogin_userName");
    var password = document.getElementById("formLogin_password");
    var captcha = document.getElementById("formLogin_captcha");
    $(".ant-radio-input").click();
    loginInfo.dispatchEvent(new Event('focus'))//获取焦点
    loginInfo.value = id;//赋值
    loginInfo.dispatchEvent(new Event('input'));//触发input事件
    loginInfo.dispatchEvent(new Event('blur'));//失去焦点
    userName.dispatchEvent(new Event('focus'));//获取焦点
    userName.value = name;//赋值
    userName.dispatchEvent(new Event('input'));//触发input事件
    userName.dispatchEvent(new Event('blur'));//失去焦点
    password.dispatchEvent(new Event('focus'));//获取焦点
    password.value = paw;//赋值
    password.dispatchEvent(new Event('input'));//触发input事件
    password.dispatchEvent(new Event('blur'));//失去焦点
    delete students[id];
    localStorage.setItem("students", JSON.stringify(students));
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if(pair[0] == variable){return pair[1];}
    }
    return(false);
};

function getStr(str, start, end) {
    let res = str.match(new RegExp(`${start}(.*?)${end}`))
    return res ? res[1] : null
}

function getAnswer(columnId) {
    // var html = $("html").html(),
    //     taskId = getStr(html,'&taskId=','`,')

    $.ajax({
        url: _self.config.practice.host + _self.config.practice.practice + "?columnId="+ columnId + "&taskId=" + _self.config.taskId,
        headers: _self.config.apiConfig.header,
        async: false,
        success: function (res) {
            const { data, status } = res;
            if (status === "0") {
                var question_data = res.data
                var questionBankList = data.questionBankList
                answer_list = questionBankList;
                upload(answer_list)
            } else if (status === "1") {
                //无效的columnId（下个接口是chapterId）
                alert("请先学习当前模块");
                window.history.go(-1);
            } else if (status === "-2") {
                alert("请重新登陆");
            } else {

            }
        },
        error: function (err) {
        }
    });
}

// 答题操作
function doQuestion(t) {
    var cur_topic = $('#currentTopic').text(),
        tol_topic = $('#totalTopic').text(),
        answer = answer_list[cur_topic - 1].answer;
    $('#exam_answer > div:nth-child(' + num[answer] + ')').click();
    if (cur_topic == tol_topic) {
        // 清除 Interval 的定时器
        clearInterval(t);
        //setTimeout(function(){Swal.fire(' 宪法小助手提示 ',' 答题完成 ','info')},time / 2);
        if ($("#next_exam").css("display")  != 'none') {
            nextExam();
        } else {
            toEvaluation();
        }

    } else{
        setTimeout(function(){$('#next_question').click()},time / 2);
    };
}

// 获取考试题目
function getExam(){
    // var html = $("html").html(),
    //     taskId = getStr(html,'taskId=','`,');
    $.ajax({
        url: _self.config.wexam.host + _self.config.wexam.getPaper + "?taskId=" + _self.config.taskId,
        headers: _self.config.apiConfig.header,
        async: false,
        success: function (res) {
            const { data, status, message } = res;
            if (status === "0") {
                var question_data = res.data;
                var paper = question_data.paper;
                var paperInfo = paper.paperInfo;
                exam_list = paperInfo;
            } else {
                alert('获取考试题目失败！')
            }
        },
        error: function (err) {
        }
    });
}

// 考试答题操作
function doExam(t){
    let db_json = []
    if (GM_getValue(save_key) && JSON.parse(GM_getValue(save_key)).length >= 0) {
        db_json = JSON.parse(GM_getValue(save_key))
    } else {
        Swal.fire('提示','无题库数据，请先收集答案或自己作答！','info')
        return
    }

    $('#ne21ans')[0] ? $('#ne21ans').html('<p style="color: red;"> 正在搜索答案 ~</p>') : $('#exam_question').append('<div id="ne21ans"><p style="color: red;"> 正在搜索答案 ~</p></div>')

    var cur_topic = $('#currentTopic').text(),
        tol_topic = $('#totalTopic').text(),
        questionInfo = exam_list[cur_topic - 1];


    ans_index = []
    ops = questionInfo.answerOptions.split("@!@")
    for (var i = 0; i < ops.length; i++) {
        hash_tmp = MD555(questionInfo.content+"|"+ops[i])
        db_json.forEach((item)=>{
            if (item.hash == hash_tmp) {
                ans_index.push(i)
            }
        })
    }

    if (ans_index.length == 0) {
        Swal.fire('提示','无题库数据，请先收集答案或自己作答！','info')
        return
    }

    ans_index.forEach((item1)=>{
        $('#ne21ans').html('<p style="color: red;">参考答案：'+ ops[item1] + '</p>')
        $('#exam_answer > div:nth-child(' + (item1+1) + ')').click();
    })

    if (cur_topic == tol_topic) {
        // 清除Interval的定时器
        clearInterval(t);
        setTimeout(function(){Swal.fire('提示','答题完成,请自己点击交卷！','info')},time / 2);
    } else{
        setTimeout(function(){$('#next_question').click()},time / 2);
    };

}

function upload(question_data) {
    let db_json = []
    if (GM_getValue(save_key) && JSON.parse(GM_getValue(save_key)).length >= 0) {
        db_json = JSON.parse(GM_getValue(save_key))
    }
    question_data.forEach((item)=>{
        let question = item.content
        let ans_index = []
        item.answer.split().forEach(((item1)=>{
            let index_tmp = "ABCDEFG".indexOf(item1)
            ans_index.push(index_tmp)
        }))
        let ans_ops = item.answerOptions.split("@!@")
        ans_index.forEach((item3)=>{
            db_json.push({
                "hash":MD555(question+"|"+ans_ops[item3]),
                "question": question,
                "answer": ans_ops[item3]
            })
        })
    })

    let dbJson = uniqueByField(db_json,"hash")
    GM_setValue(save_key,JSON.stringify(dbJson))
    console.log(JSON.parse(GM_getValue(save_key)))
}

function MD555(str) {
    return CryptoJS.MD5(str).toString()
}

function uniqueByField(array, field) {
    const seen = new Set();
    return array.filter((item) => {
        const key = item[field];
        return seen.has(key) ? false : seen.add(key);
    });
}