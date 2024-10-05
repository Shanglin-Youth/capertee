// ==UserScript==
// @name         普法助手
// @namespace    Shanglin-Youth
// @version      2.3
// @description  全国学生“学宪法 讲宪法”活动自动答题脚本,因缺少测试账号无法保证每年都能用，欢迎大家提供测试账号以支持此脚本长期可用，测试账号登录信息请发送至我们的邮箱admin@shanglin.cloud
// @author       Shanglin-Youth
// @match        *://static.qspfw.moe.gov.cn/*
// @icon         https://pfzs.shanglin.cloud/files/logo32.ico
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
    time = 5e3, // 答题间隔时间，最好为5秒
    save_key = "xfxws2024",
    num = {"A": 1,"B": 2, "C": 3, "D": 4};

(function() {
    if (window.location.pathname.indexOf('learn_exam.html') != -1) {
        Swal.fire('提示','点击确定开始考试','info').then(()=>{
            Swal.fire({
                position: 'top-end',
                title: '脚本将在5秒后开始自动作答！',
                showConfirmButton: false,
                timer: 4000
            })
            getExam();
            let t = setInterval( function() {
                doExam(t)
            },time);
        })
    } else if (window.location.pathname.indexOf('learn-practice.html') != -1) {
        Swal.fire('提示','点击确定开始练习,脚本会自动收录本练习题目数据','info').then(()=>{
            getAnswer(columnId);
            let t = setInterval( function() {
                doQuestion(t)
            },time);
        })
    } else if (window.location.pathname.indexOf('learn_practice_list.html') != -1) {
        Swal.fire('提示','<div style="font-size: 13px;">脚本最后更新时间：2024.09.12<br />使用说明：<br /><div><span style="color: red;">1.脚本题库数据托管于本地，请在做综合评价前逐个完成练习，收集答案！！！</span><br />2.脚本运行故障如综合测评无操作等，请使用Edge浏览器+ScriptCat。<br />3.问题联系邮箱admin@shanglin.com<br />4.脚本数据来自本网站后端返回的明文JSON数据包，脚本不涉及任何逆向操作！<br />5.脚本仅供学习交流，请勿用于商业用途，否则后果自负！</div></div>')
    } else if (window.location.pathname.indexOf('evaluation.html') != -1) {
       
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
        // 清除Interval的定时器
        clearInterval(t);
        setTimeout(function(){Swal.fire('提示','答题完成','info')},time / 2);
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

    $('#ne21ans')[0] ? $('#ne21ans').html('<p style="color: red;">正在搜索答案~</p>') : $('#exam_question').append('<div id="ne21ans"><p style="color: red;">正在搜索答案~</p></div>')

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