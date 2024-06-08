const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));
const ejs = require('ejs');
const { emitWarning } = require('process');
const fs = require('fs');
//필요한 모듈을 가져온다.
const mongoclient = require('mongodb').MongoClient;
const ObjId = require('mongodb').ObjectId;
const mongodb_url = "mongodb+srv://mushroom1052:zealot1004@myboard.bypr5hz.mongodb.net/?retryWrites=true&w=majority&appName=myboard";
//mongoDB 클리이언트 모듈을 가져와 ObjectId를 통해 서버와 연결해준다.
let mydb;
mongoclient.connect(mongodb_url)
.then(client => {
    mydb = client.db('myboard');
}) // mongoDB의 myboard 데이터를 mydb에 저장한다.
app.use(express.static('public'));
//public이라는 정적파일 제공을 위해 사용한다.

let session = require("express-session"); //세션을 설정해준다.
app.use(session({
    secret:'akf8y23iub29', //세션의 암호화키
    resave :false, //세션 접속시마다 세션식별자의 발급 여부를 false로 설정한다.
    saveUninitialized : true //세션 사용전까지 세션 식별자를 발급하지 않게 true로 설정한다.
}))


let multer = require('multer');//파일과 이미지 업로드를 위해 multer를 설정한다.
let storage = multer.diskStorage({
    destination: function(req, file, done){
        done(null, './public/image') //이미지 파일 경로를 image폴더로 설정한다.
    },
    filename: function(req, file, done){
        done(null, file.originalname) //파일이름은 원래 이름 그대로 저장한다.
    }
})
let textstore = multer.diskStorage({
    destination: function(req, file, done){
        done(null, './public/text') //txt파일 저장 경로를 text폴더로 설정한다.
    },
    filename: function(req, file, done){
        done(null, file.originalname)//파일이름은 원래 이름 그래도 저장한다.
    }
})
let textupload = multer({storage : textstore}); //텍스트 파일 업로드 객체를 생성한다.
let upload = multer({storage : storage}); //이미지 파일 업로드 객체를 생성한다.

let imagepath = '' //이미지 경로 변수를 공백으로 설정해준다.
let textpath = ''

app.set('view engine', 'ejs'); //.ejs를 사용하기 위해 뷰 엔진을 설정해준다.

app.listen(3000, function(){
    console.log("포트 3000으로 서버 대기중")
}); //서버 실행

app.get('/', function(req, res){
    res.render('home.ejs', {user:req.session.user});
}); // home을 렌더링 하면서 로그인에 필요한 세션 유저 정보를 전달해준다.

app.get("/signup", function(req, res){
    res.render("signup.ejs");
}); //signup을 렌더링해준다.

app.get('/login', function(req, res){
    console.log(req.session);
    if(req.session.user){ //세션 유저 정보가 존재할때 세션 유저 정보와 list.ejs를 렌더링해준다.
        console.log('세션 유지');
        res.render('list.ejs', {user: req.session.user});
    }else{ //세션이 없을시 login.ejs를 렌더링하여 다시 로그인하도록 한다.
        res.render("login.ejs");
    }
});

app.get('/logout', function(req, res){
    console.log("로그아웃");
    req.session.destroy(); //로그아웃시 간단히 destroy를 이용해 세션을 없앤다.
    res.render('home.ejs', {user: null}); //유저 정보를 없애서 home을 렌더링해준다.
});

app.get('/list', function(req, res){
    mydb.collection('post').find().toArray().then(result => {
        console.log(result);
        res.render('list.ejs', {data:result});
    }); //mongoDB의 myboard의 데이터를 전달하여 list를 렌더링 해준다.
});

app.get('/write', function(req, res){
    res.render('write.ejs'); //글작성 write를 렌더링한다.
});

app.get('/content/:id', function(req, res){ //리스트에서 게시글을 선택했을시 내용을 보여주는 페이지
    console.log(req.params.id); 
    req.params.id = new ObjId(req.params.id); //콘솔에 게시글 id를 출력하고 이를 objectid로 변환한다.
    mydb
    .collection("post")
    .findOne({_id : req.params.id })
    .then((result) => {
        console.log(result);
        res.render("content.ejs", {data:result});//데이터를 전달하여 content를 렌더링한다.
    });
});

app.get('/edit/:id', function(req, res){ //게시글 선택후 수정 페이지
    req.params.id = new ObjId(req.params.id); //수정할 게시글 id를 objectid로 변환해 저장
    mydb
    .collection("post")
    .findOne({_id: req.params.id})
    .then((result) => {
        console.log(result);
        res.render("edit.ejs", {data: result}); //데이터를 전달하여 edit를 렌더링하여 edit에서 기존의 게시글 내용이 보이게 한다.
    });
});

app.get('text/: filename', function(req,res){ //text 파일을 읽기위한 페이지 라우트
    const filepath = './public/text/' + req.params.filename; //읽어올 파일 경로를 설정해준다.
    fs.readFile(filepath, 'utf8', function(err,data){
        if(err){
            return console.log(err);
        }
        res.send(data); //fs를 통하여 파일내용을 전송해준다.
    })
})

app.post("/signup", function(req, res){
    console.log(req.body.userid);
    console.log(req.body.userpw);
    console.log(req.body.username);
    console.log(req.body.useremail);
    //콘솔에 여러 사용자 데이터 표시
    mydb
    .collection("account") //myboard에 새로 만든 account에 입력데이터들을 저장한다.
    .insertOne({
        userid: req.body.userid,
        userpw: req.body.userpw,
        username: req.body.username,
        useremail: req.body.useremail,
    })
    .then((result) => {
        console.log("회원가입 성공");
    });
    res.redirect("/"); //홈페이지를 다시 렌더링한다.
});

app.post('/login', function(req, res){
    console.log("아이디: "+req.body.userid);
    console.log("비밀번호: "+req.body.userpw);
    
    mydb
    .collection("account")
    .findOne({userid : req.body.userid, userpw : req.body.userpw})
    // myboard의 account에서 userid와 userpw를 찾는다.
    .then((result) => {
        if(result){
            req.session.user = result; //세션에 사용자 정보를 저장한다.
            console.log('새로운 로그인');
            res.render('home.ejs', {user: req.session.user}); //user정보를 home과 함께 렌더링한다.
        }else{
            res.render('login.ejs'); //입력정보가 존재하지 않을때 login을 다시 렌더링한다.
        }
    });
});

app.post('/photo', upload.single('picture'), function(req, res){//이미지 업로드릉 처리한다.
    console.log(req.file.path);
    imagepath ='/image/' + req.file.originalname;
     //파일 원래 이름으로 image폴더에 저장한다.
})

app.post('/text', textupload.single('txtfile'), function(req, res){ //텍스트파일 업로드를 처리한다.
    console.log(req.file.path);
    textpath = '/text/' + req.file.originalname;
    //파일의 원래 이름으로 text 폴더에 저장한다.
})

app.post('/save', function(req, res){ //save 처리가 들어왔을때 게시글을 저장한다.
    console.log(req.body.title);
    console.log(req.body.content);
    console.log(req.body.someDate);
    mydb.collection('post').insertOne(
        {title:req.body.title, content:req.body.content, date: req.body.someDate, path: imagepath, path2: textpath}
        //post형식으로 제목, 내용, 작성일, 이미지 경로, 텍스트 경로를 저장한다.
    ).then(result => {
        console.log(result);
        console.log('게시글 작성 완료');
    })
    imagepath = '';
    textpath = '';
    res.redirect('/list');//작성후 이미지나 텍스트 경로를 초기화한뒤 list를 다시 렌더링한다.
});

app.post('/edit', function(req, res){ //edit 처리가 들어왔을시 게시글을 수정한다.
    console.log(req.body);
    req.body.id = new ObjId(req.body.id); //게시글의 id를 objectid로 바꾼다.
    mydb
    .collection("post")
    .updateOne({_id : req.body.id}, {$set : {title : req.body.title, content : req.body.content, date : req.body.someDate, path: imagepath, path2: textpath}})
    //post 형식으로 기존 데이터의 제목, 내용, 작성일, 파일 경로를 새로 update한다.
    .then((result) => {
        console.log("수정완료");
        imagepath = '';
        textpath = '';
        res.redirect('/list'); //수정후 이미지나 텍스트 경로를 초기화 한뒤 list를 렌더링한다.
    })
    .catch((err) => {
        console.log(err);
    });
});

app.post("/delete", function(req, res){//delete 처리가 들어왔을때 게시글을 삭제한다.
    console.log(req.body._id);
    req.body._id = new ObjId(req.body._id); //삭제할 게시글 id를 objectid로 변환한다.
    mydb.collection('post')
    .deleteOne({_id: req.body._id }) //다른데이터를 지우지 않고 단순 id만 지우면 데이터가 삭제된다.
    .then(result => {
        console.log('삭제 완료');
        res.status(200).send();
        res.redirect('/list'); //삭제후 list를 다시 렌더링한다.
    })
    .catch(err => {
        console.log(err);
        res.status(200).send();
    })
});

