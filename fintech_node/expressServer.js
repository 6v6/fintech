const express = require('express')
const app = express()
const path = require('path')
var request = require('request')
var mysql = require('mysql')
var jwt = require('jsonwebtoken')
var auth = require('./lib/auth')
//const storage = require('node-sessionstorage')
//const store = require('store2')
// var session = require('express-session')
var sessionstorage = require('sessionstorage');

app.set('views', path.join(__dirname, 'views')); // ejs file location
app.set('view engine', 'ejs'); //select view template engine


var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '0525',
    database : 'fintech'
  });

  connection.connect();


app.use(express.static(path.join(__dirname, 'public'))); // to use static asset (design)
app.use(express.json());
app.use(express.urlencoded({extended:false}));//ajax로 데이터 전송하는 것을 허용


// root 라우터
app.get('/', function (req, res) {
    var title = "javascript"
    res.send('<html><h1>'+title+'</h1><h2>contents</h2></html>')
})

// ejs --> view와 logic을 분리
app.get('/ejs', function (req, res) {
    res.render('test')
})

// test 라우터
app.get('/test', function(req, res) {
    res.send('Test')
})

// design
app.get('/design', function(req, res) {
    res.render('designTest');
})

//datasend Router add
app.get('/dataSend', function(req, res){
    res.render('dataSend');
})

app.post('/getTime', function(req, res){
    var nowTime = new Date();
    res.json(nowTime);
})

app.post('/getData',function(req, res){
    console.log(req.body); //ajax로 보낸 데이터를 req.body.데이터의key 값응로 접근
    var userData = req.body.userInputData;
    console.log('userData = ',userData);
    res.json(userData + "!!!!!");
})

app.post('/authTest',auth, function(req, res){
    res.json(req.decoded)
})

/** service strart */
app.get('/signup', function(req, res){
    res.render('signup');
})

app.get('/authResult',function(req, res){
    var authCode = req.query.code;
    console.log(authCode);
    var option = {
        method : "POST",
        url : "https://testapi.openbanking.or.kr/oauth/2.0/token",
        header : {
            'Content-Type' : 'application/x-www-form-urlencoded',
        },
        form : {
            code : authCode,
            client_id : '9Gd2iGZ6uC8C73Sx4StubaH1UIklincOEJAnkf18',
            client_secret : 'c3p6daWMkdGvM24WRCb0W2xdbXEqdCyGdcne7PlC',
            redirect_uri : 'http://localhost:3000/authResult',
            grant_type : 'authorization_code'
        }
    }
    request(option, function(err, response, body){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            var accessRequestResult = JSON.parse(body);
            console.log(accessRequestResult);
            res.render('resultChild', {data : accessRequestResult} )
        }
    })
})

app.get('/login', function(req, res){
    res.render('login');
})

app.get('/main', function(req, res){

    res.render('main');
})

app.get('/balance', function(req, res){
    res.render('balance');
})

app.get('/qrcode', function(req, res){
    res.render('qrcode');
})

app.get('/qr', function(req, res){
    res.render('qrReader');
})

app.get('/error', function(req, res){
    res.render('login');
})



app.post('/signup', function(req, res){
    //data req get db store
    var userName = req.body.userName;
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;
    var userAccessToken = req.body.userAccessToken;
    var userRefreshToken = req.body.userRefreshToken;
    var userSeqNo = req.body.userSeqNo; 
    console.log(userName, userAccessToken, userSeqNo);
    var sql = "INSERT INTO fintech.user (name, email, password, accesstoken, refreshtoken, userseqno) VALUES (?,?,?,?,?,?)";
    connection.query(sql, 
        [userName, userEmail, userPassword, userAccessToken, userRefreshToken, userSeqNo],
        function(err, result){
            if(err){
                console.error(err);
                res.json(0);
                throw err;
            }
            else{
                res.json(1);
            }
        });

})

app.post('/login', function(req, res){
    var userEmail = req.body.userEmail;
    var userPassword = req.body.userPassword;
    var sql = "SELECT * FROM user WHERE email=?";
    connection.query(sql, [userEmail], function(err, result){
        if(err){
            console.error(err);
            res.json(0);
            throw err;
        }
        else{
            if(result.length == 0){
            res.json(3);
            }
            else{
                var dbPassword = result[0].password;
                if(dbPassword == userPassword){
                    var tokenKey = "f@i#n%tne#ckfhlafkd0102test!@#%"
                    jwt.sign(
                    {
                        userId : result[0].id,
                        userEmail : result[0].user_email
                    },
                    tokenKey,
                    {
                        expiresIn : '10d',
                        issuer : 'fintech.admin',
                        subject : 'user.login.info'
                    },
                    function(err, token){
                        console.log('로그인 성공', token)
                        res.json(token)
                    }
                    )
                }
                else{
                    res.json(2);
                }
            }
        }
    })

})

app.post('/list', auth, function(req, res){

    var userId = req.decoded.userId;
   // console.log("test",res.body);
    var sql = "SELECT * FROM user WHERE id = ?"
    connection.query(sql, [userId], function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            console.log(result);
                // api response body 
    var option = {
        method : "GET",
        url : "https://testapi.openbanking.or.kr/v2.0/user/me",
        headers : {
            Authorization : 'Bearer ' + result[0].accesstoken
        },
        qs : {
            user_seq_no : result[0].userseqno
        }
    }
    console.log(option);
    request(option, function(err, response, body){
        if(err){
            console.error(err);
            throw err;
        }
        else {
            var accessRequestResult = JSON.parse(body);
            console.log(accessRequestResult);
            res.json(accessRequestResult)
        }
    })
        }
    })
})


app.post('/balance', auth, function(req, res){
    var userId = req.decoded.userId;
    var fin_use_num = req.body.fin_use_num;

    
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991628990U" + countnum; //이용기관 번호 본인것 입력

    var sql = "SELECT * FROM user WHERE id = ?"
    connection.query(sql, [userId], function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            console.log(result);
            var option = {
                method : "GET",
                url : "https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num",
                headers : {
                    Authorization : 'Bearer ' + result[0].accesstoken
                },
                qs : {
                    bank_tran_id : transId,
                    fintech_use_num : fin_use_num,
                    tran_dtime : '20200515114200',
                }
            }
            request(option, function(err, response, body){
            if(err){
                console.error(err);
                throw err;
            }
            else {
                var accessRequestResult = JSON.parse(body);
                console.log(accessRequestResult);
                res.json(accessRequestResult)
            }
            })
        }
    })
 
})


app.post('/transactionlist', auth, function(req, res){
    var userId = req.decoded.userId;
    var fin_use_num = req.body.fin_use_num;
    
    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991628990U" + countnum; //이용기관 번호 본인것 입력

    var sql = "SELECT * FROM user WHERE id = ?"
    connection.query(sql, [userId], function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            console.log(result);
            var option = {
                method : "GET",
                url : "https://testapi.openbanking.or.kr/v2.0/account/transaction_list/fin_num",
                headers : {
                    Authorization : 'Bearer ' + result[0].accesstoken
                },
                qs : {
                    bank_tran_id : transId,
                    fintech_use_num : fin_use_num,
                    inquiry_type : 'A',
                    inquiry_base : 'D',
                    from_date : '20190101',
                    from_time : '100000',
                    to_date : '20190101',
                    to_time : '100000',
                    sort_order : 'D',
                    tran_dtime : '20190910101921',
                    befor_inquiry_traceinfo : '123'
                }
            }
            request(option, function(err, response, body){
            if(err){
                console.error(err);
                throw err;
            }
            else {
                var accessRequestResult = JSON.parse(body);
                console.log(accessRequestResult);
                res.json(accessRequestResult)
            }
            })
        }
    })

})

app.post('/withdraw', auth, function(req, res){
    var userId = req.decoded.userId;
    var fin_use_num = req.body.fin_use_num;
    var amount = req.body.amount;


    var countnum = Math.floor(Math.random() * 1000000000) + 1;
    var transId = "T991628990U" + countnum; //이용기관 번호 본인것 입력

    var sql = "SELECT * FROM user WHERE id = ?"
    connection.query(sql, [userId], function(err, result){
        if(err){
            console.error(err);
            throw err;
        }
        else{
            console.log(result);
            var option = {
                method : "POST",
                url : "https://testapi.openbanking.or.kr/v2.0/transfer/withdraw/fin_num",
                headers : {
                    'Content-Type' : "application/json; charset=UTF-8",
                    Authorization : 'Bearer ' + result[0].accesstoken
                },
                json : {
                    "bank_tran_id" : transId,
                    "cntr_account_type": "N",
                    "cntr_account_num" :"1270658396",
                    "dps_print_content" :"쇼핑몰환불",
                    "fintech_use_num" : fin_use_num,
                    "wd_print_content" :"오픈뱅킹출금",
                    "tran_amt" : amount,
                    "tran_dtime" : "20190910101921",
                    "req_client_name" : "injeong",
                    "req_client_bank_code" : "097",
                    "req_client_account_num" : "1270658396",
                    "req_client_fintech_usenum" : fin_use_num,
                    "req_client_num" : "JEONGINJEONG1234",
                    "transfer_purpose" : "TR",
                    "recv_client_name" : "김오픈",
                    "recv_client_bank_code" : "097",
                    "recv_client_account_num" : "1100758778"
                }
            }
            request(option, function(err, response, body){
            if(err){
                console.error(err);
                throw err;
            }
            else {
                console.log(body);
                if(body.rsp_code == "A0000"){
                    res.json(body)
                }
            }
            })
        }
    })
})


app.listen(3000)
