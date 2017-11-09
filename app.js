

//           تعريف كائن الطلبات
const request = require('request');
// تعريف كائن الملفات
const fs = require('fs');
// جدول
var list = {};

(function () {

    var express = require('express');
    var app = express();


    var bodyParser = require('body-parser');
    app.use(bodyParser.json()); // support json encoded bodies
    app.use(bodyParser.urlencoded({ extended: true }));


    app.use(express.static('public'));
    app.get('/', function (req, res) {
        res.sendFile( __dirname + "/" + "index.html" );
    });

    app.get('/get',function (req, res) {

        fs.readFile('./user.json',function (err,data) {

            if (err) return console.log(err);

            data.toString();
            res.send(data);
        });

    });

    app.post('/save',function (req, res) {

        console.log(req.body.token);

        var
            token = req.body.token,
            page = req.body.page,
            mess = req.body.mess;
        if (!(token && page && mess))
        {
            return res.send('error');
        }

        var ob = {
            token:token,
            page:page,
            mess:mess
        }
        var json = JSON.stringify(ob,null,4);


        fs.writeFile("./user.json", json, function(err) {
            if(err) {
                return console.log(err);
            }

            res.send(json);
        });




    });

    var server = app.listen(process.env.PORT || 5000, function () {
        var host = server.address().address;
        var port = server.address().port;

        console.log("Example app listening at http://%s:%s", host, port)
    })



    start();


})();


// دالة البدأ
function start() {



    // قراءة ملف المعلومات
    fs.readFile('./user.json', function(err, data) {
        // عند اكمال القراءة

        // اذا حدث خطأ
        if (err) return console.log(err);

        // حذف الفراغات الزائدة من النص اذا وجدت
        data = data.toString().trim();

        // عرض المحتوى في سجل
        console.log(data);

        // محاولة تحويل البيانات الى كائن
        try {
            data = JSON.parse(data);
        }

        // في حالة حصل خطأ بالتحويل
        catch (e) { console.log("error in file"); return }


        // انشاء متغييرات للبيانات
        var mess = data.mess,token = data.token, page = data.page;

        //  التحقق من عمل كود access_toekn
        check(token,function (er, req, body) {
            // في حال حدوث خطأ بالاتصال
            if (er) return console.log(err);

            // تحويل البيانات المستلمة من json  الى كائن
            body = JSON.parse(body);
            // اذا حدث خطأ في الكود
            if (body.error) return console.log(body.error);
            delete body;

            // اذا كان الكود يعمل بشكل صحيح
            // تكوين كائن عملية جديدة
            var ur = new user(token,mess,page);
            // تحديد حدد مرات تكرار العملية
            ur.cm = 10;
            // اضافة العملية الى الجدول
            list[ur.id] = ur;
            // بدء العملية
            ur.start();


        });

    });



}


// دالة تحقق من صحة كود المستخدم
function check(token,fn) {
    // متغيير يحوي قيمة رابط طلب جلب الاي دي مع كود المستخدم
    var url = 'https://graph.facebook.com/v2.10/me?fields=id&access_token='+token;
    delete token;

    // كائن يحوي معلومات الارسال
    var op = {
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        url: url,
    }


    // ارسال المعلومات الى الرابط
    request.get(op, fn
    );
}


/*  صنف لانشاء عملية جديدة */

class user {
    constructor(token,mess,page,time) {

        // تحديد خصائص اساسية
        this.token = token;
        this.mess = mess;
        this.t = time || 5;
        this.times = 1;
        this.post= {};
        this.run = false;
        this.cn = 0;
        this.status = 'stop';
        this.id = page;
        this.cm = 1;


      //  delete token,mess,page,time;
    }

    // خاصية دالة تقوم بالتحقق اذا كان يوجد منشور جديد في الصفحة
    check() {
        // start check

        //---------------

        // متغيير يحوي ايدي الصفحة
        var page = this.id;
        // متغيير يحوي رابط لارسال طلب جلب منشورات الصفحة
        var url = "https://graph.facebook.com/v2.10/" + (page) + "/feed";
        // اضافة كود token الى الرابط
        url += '?access_token=' + this.token;

        // self => this
        var self = this;

        // ارسال البيانات الى الرابط
        request.get({
            headers: {'content-type': 'text/json'},
            url: url,


            // on comple comment
        }, function (error, req, body) {

            // استلام النتائج

            // في حال وجود خطأ بالاتصال
            if (error) {
                console.log(error);

                // اعادة المحاولة
                self.check();

                return;
            }


            // محاولة تحويل البيانات الى كائن
            try {

                body = JSON.parse(body);
            }

            // في حال لم تنجح عملية التحويل
            catch (e) {
                // طباعة معلومات الارسال في السجل
                console.log(req.headers);
            }

            //console.log(body.data);

            // تعرف متغيير يحوي على البيانات المطلوبة
          var  data = body.data;
            // يحتوي متغيير data منشورات الصفحة

            //  عمل تكرار على جميع المنشورات للتحقق من وقت انشاء المنشور
            for (var i in data) {
                // تعريف متغيير يحوي زمن تكوين المنشور
                var d = data[i].created_time;
                // متغيير فترة تكوين المنشور
                var time = new Date().getTime() - Date.parse(d);
                // تعريف متغيير يوحوي زمن تكوين المنشور بالدقائق
                var min = getMin(time);
                console.log('------------------------------');
                console.log('post time :' + min);
                // اذا كان زمن تكوين المنشور بالدقائق اكبر او يساوي الزمن المحدد في العملية المطلوبة
                if (min <= self.t) {


                    // متغيير يحتوي على قيمة اي دي المنشور
                    var post_id = data[i].id;

                    // اذا كان لم يتم التعليق على المنشور
                    if (!(post_id in self.post)) {
                        console.log('----------------------------');
                        console.log('found new post !');
                        console.log('working in comment ...');

                        // اضافة اي دي المنشور الى القائمة ليتعرف عليه في حال تم العمل عليه مسيقا
                        self.post[post_id] = 1;

                        //console.log(self.post);

                        // تنفيذ دالة التعليق على المنشور
                        comment(post_id, self.mess, self.id);
                        return;
                    }

                }


            }

            // اذا كانت العملية تعمل اعادة التحقق
            if (self.run) { setTimeout(function () {
                self.check();
            },1900);

            }

        });
    }

        //--------------
      // end check






        // دالة لبدأ العملية
        start() {

            // جعل خاصية العملية رن صائبة
            this.run = true;
            // بدأ التنصت على المنشورات الجديدة
            this.check(this.id);
            // تحديد حالة العملية تعمل
            this.status = "running";
        }

        // دالة لايقاف العملية
        stop() {

            // جعل خاصية العملية رن غير مفعلة
            this.run = false;
            // تحديد حالة العملية متوقفة
            this.status = 'stop';




        }



}




// دالة لتحويل زمن المنشور بالدقائق
function getMin(millis) {
    var minutes = Math.floor(millis / 60000);
    return minutes;
}






// دالة للتعليق على المنشور

function comment(post_id,mess,id) {


    // متغيير يحوي رابط facebook graph
    var host = 'https://graph.facebook.com';
    // متغيير يحوي رابط التعليق على المنشور
    var url = host+'/v2.10/'+post_id+'/comments';
    // جميع خواص العملية
    var self = list[id];

    // ارسال التعليق
    request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     url,
        form:   {
            access_token:self.token,
            message:mess.toString()
        }

        // on comple comment
    }, function (error, req, body) {

        // اذا حصل خطأ بالاتصال
        if(error)
        {
            console.log(error);
            comment(post_id,mess,id);

            return;
        }


        // تحويل البيانات الى كائن
        body = JSON.parse(body);

        if (body.error)
        {
            console.log(body);
            console.log('err '+ self.id);

            return;
        }

        self.cn++;
        self.cm--;
        console.log('comment success');
        if (self.cm !== 0) self.check();


    });



}