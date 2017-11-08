

var request = require('request');
var fs = require('fs');
var list = {}



function start() {




    fs.readFile('./user.json', function(err, data) {
        if (err) return console.log(err);

        data = data.toString().trim();

        console.log(data);

        try {
            data = JSON.parse(data);
        }
        catch (e) { console.log("error in file"); return }

        var mess = data.mess,token = data.token, page = data.page;

        check(token,function (er, req, body) {
            if (er) return console.log(err);

            body = JSON.parse(body);
            if (body.error) return console.log(body.error);
            delete body;

            // new user
            var ur = new user(token,mess,page);
            ur.cm = 2;
            list[ur.id] = ur;
            ur.start();


        });

    });



}



function check(token,fn) {
    var url = 'https://graph.facebook.com/v2.10/me?fields=id&access_token='+token;
    delete token;
    var op = {
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        url: url,
    }

    request.get(op, fn
    );
}


function user(token,mess,page,time) {
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

    var self = this;

    delete token,mess,page,time;





    this.check = function (page) {

        page = this.id;
        var url = "https://graph.facebook.com/v2.10/"+(page)+"/feed";
        url += '?access_token=' + this.token;



        request.get({
            headers: {'content-type' : 'text/json'},
            url:     url,


            // on comple comment
        }, function (error, req, body) {

            if (error)
            {
                console.log(error);

                self.check();

                return;
            }



            try {

                body = JSON.parse(body);
            }

            catch (e) {
                console.log(req.headers);
            }

            //console.log(body.data);
            data = body.data;
            for (var i in data) {
                var d = data[i].created_time;
                var   time = new Date().getTime() - Date.parse(d);
                var min= getMin(time);
                console.log('post time :' + min);
                if (min <= self.t) {

                    var post_id = data[i].id;
                    if (! (post_id in self.post))
                    {
                        console.log('found new post !');
                        console.log('working in comment ...');
                        self.post[post_id] = 1;

                        //console.log(self.post);
                        comment(post_id,self.mess,self.id);
                        return;
                    }

                }
                if (self.run) self.check();
            }

        });
    }

    this.start = function () {
        this.run = true;
        this.check(this.id);
        this.status = "running";
    }

    this.stop = function () {
        this.run = false;
        this.status = 'stop';
    }


}



function getMin(millis) {
    var minutes = Math.floor(millis / 60000);
    return minutes;
}




start();




function comment(post_id,mess,id) {


    var host = 'https://graph.facebook.com'
    var url = host+'/v2.10/'+post_id+'/comments';
    var self = list[id];

    request.post({
        headers: {'content-type' : 'application/x-www-form-urlencoded'},
        url:     url,
        form:   {
            access_token:self.token,
            message:mess.toString()
        }

        // on comple comment
    }, function (error, req, body) {

        if(error)
        {
            console.log(error);
            comment(post_id,mess,id);

            return;
        }


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