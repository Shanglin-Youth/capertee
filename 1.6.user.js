// ==UserScript==
// @name         普法助手
// @namespace    Shanglin-Youth
// @version      1.6
// @description  全国学生“学宪法 讲宪法”活动自动答题脚本,因缺少测试账号无法保证每年都能用，欢迎大家提供测试账号以支持此脚本长期可用，测试账号登录信息请发送至我们的邮箱admin@shanglin.cloud
// @author       Shanglin-Youth
// @match        *://static.qspfw.moe.gov.cn/*
// @icon         https://pfzs.shanglin.cloud/files/logo.png/
// @connect      cx.gocos.cn
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
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
    time = 3000, // 答题间隔时间，最好为3000mss
    num = {"A": 1,"B": 2, "C": 3, "D": 4};

(function() {
    if (window.location.pathname == '/xf2022/learn_exam.html') {
        Swal.fire('宪法小助手提示','点击确定开始考试')
        getExam();
        let t = setInterval( function() {
            doExam(t)
        },time);
    } else if (window.location.pathname == '/xf2022/learn-practice.html') {
        Swal.fire('宪法小助手提示','点击确定开始练习')
        getAnswer(columnId);
        let t = setInterval( function() {
            doQuestion(t)
        },time);
    }
})();

// 解析url参数
function getQueryVariable(variable) {
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
};

// 正则匹配
function getStr(str, start, end) {
    let res = str.match(new RegExp(`${start}(.*?)${end}`))
    return res ? res[1] : null
}

// 获取答案
function getAnswer(columnId) {
    var html = $("html").html(),
        taskId = getStr(html,'&taskId=','`,')

    $.ajax({
        url: _self.config.practice.host + _self.config.practice.practice + "?columnId="+ columnId + "&taskId=" + taskId,
        headers: _self.config.apiConfig.header,
        async: false,
        success: function (res) {
            const { data, status } = res;
            if (status === "0") {
                var question_data = res.data
                var questionBankList = data.questionBankList
                answer_list = questionBankList;
                upload(question_data)
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
        // 清除Interval的定时器
        clearInterval(t);
        setTimeout(function(){alert('答题完成')},time / 2)
    } else{
        setTimeout(function(){$('#next_question').click()},time / 2);
    };
}

// 获取考试题目
function getExam(){
    var html = $("html").html(),
        taskId = getStr(html,'taskId=','`,');
    $.ajax({
        url: _self.config.wexam.host + _self.config.wexam.getPaper + "?taskId=" + taskId,
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
    var cur_topic = $('#currentTopic').text(),
        tol_topic = $('#totalTopic').text(),
        questionInfo = exam_list[cur_topic - 1];
    $.ajax({
        url: 'https://api.gocos.cn/index.php/cxapi/xf/getAnswer?v=2',
        type: 'POST',
        data: {
            'question': questionInfo.content,
            'answerops':questionInfo.answerOptions,
            'topicId': questionInfo.id
        },
        async: false,
        success: function (res) {
            if (res.code == 1) {
                var data = res.data;
                var answer = data[0].answer
                $('#exam_answer > div:nth-child(' + num[answer] + ')').click();
            } else {
                var msg = res.msg;
                alert(msg)
            }
        },
        error: function (err) {
        }
    });
    if (cur_topic == tol_topic) {
         // 清除Interval的定时器
         clearInterval(t);
         setTimeout(function(){alert('答题完成')},time / 2);
    } else{
         setTimeout(function(){$('#next_question').click()},time / 2);
    };

}

function upload(question_data) {
    $.ajax({
        url: 'https://api.gocos.cn/index.php/cxapi/xf/upload',
        type: 'POST',
        data: {'data': question_data},
        async: true,
        success: function (res) {
        },
        error: function (err) {
        }
    });
}