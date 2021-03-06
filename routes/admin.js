var express = require('express');
var router = express.Router();
var qr = require('qr-image');
var mysql=require('mysql');
var pinyin = require("pinyin");
const URL=require('url');
var multer = require('multer');
var connection = mysql.createConnection({
    host     : 'localhost',
    port:'3306',
    user     : 'root',
    password : 'admin',
    database : 'storagedb',
    multipleStatements: true,
    connectTimeout:false

    // host     : '192.168.0.127',
    // port:'3306',
    // user     : 'root',
    // password : 'LongBang***',
    // database : 'storagedb',
});


//文件上传参数=======
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // 接收到文件后输出的保存路径（若不存在则需要创建）
        cb(null, './public/uploads');
    },
    filename: function(req, file, cb) {
        var fileName='';

        if(req.body.updateFileName!==undefined){
            fileName=file.originalname;
        }
        // 将保存文件名设置为 时间戳 + 文件原始名，比如 151342376785-123.jpg
        cb(null, file.originalname );
    }
});

var upload = multer({
    storage: storage,
});
//=========文件上传参数

function getInfo(url,callback){
    router.get('/create_qrcode', function (req, res, next) {
        var text = req.query.text;
        try {
            var img = qr.image(text, {size: 10});
            res.writeHead(200, {'Content-Type': 'image/png'});
            img.pipe(res);
        } catch (e) {
            res.writeHead(414, {'Content-Type': 'text/html'});
            res.end('<h1>414 Request-URI Too Large</h1>');
        }
    });

    var statesCounter;
    var states=[];
    var statesList=[];
    var sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';



    //console.log(url)


    connection.query( sql, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }


            states=[];
            statesCounter=-1;
            if(result[0].hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result[0].lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result[0].hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
        if(result[0].needReturn===1){
            statesCounter++;
            states[statesCounter]='需归还物料'
        }
            statesList=states;


        if( states.length===0){
            statesCounter++;
            states[statesCounter]='无'
        }


        var finalresult={
            item:result[0],
            itemStateList:statesList,
        };

        callback(sql,finalresult)

    });

}

function ChangeState(judge,stateName,state,url) {
   // console.log(judge)
    if(judge){

        var modSql = 'UPDATE itemstate SET '+ stateName+' = ? WHERE itemId = '+'\''+url.itemId+'\'';
        var updateNum=state;

        var modSqlParams = [updateNum];
        connection.query(modSql,modSqlParams,function (err, result) {
            if(err){
                console.log('[UPDATE ERROR] - ',err.message);
                return;
            }

        });

    }
}

function addNote(event,itemName,id,changedState){
    var  saveDate= new Date();
    var year= saveDate.getFullYear();
    var month=saveDate.getMonth()+1;
    var day=saveDate.getDate();
    var hour=saveDate.getHours();
    var min=saveDate.getMinutes();
    var sec=saveDate.getSeconds();
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;

    var addNoteSql='INSERT INTO homenote(date,event,itemName,id,changedState) VALUES (?,?,?,?,?)';
    var addNpteSqlParams=[dateOutput,event,itemName,id,changedState ];

    connection.query(addNoteSql,addNpteSqlParams,function (err, result) {
        if(err){
            console.log('[INSERT ERROR] - ',err.message);
            return;
        }

    });



}
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//


/* GET home page. */
router.get('/adminHome', function(req, res, next) {

    var sql='SELECT * FROM homenote ORDER BY date DESC';
    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);


        }
        //console.log(result)
        res.render('adminHome', {
            noteList: result,
            user:req.session.user
        });
    })
});

/* GET home itemManPage. */
router.get('/adItemMan', function(req, res, next) {
    var statesCounter;
    var states=[];
    var statesList=[];
    var sql;
    var url=URL.parse(req.url,true).query;
    //console.log(url)
    if(url.sql===undefined){
        sql='SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0 THEN 1\n' +
            'END AS order_param \n' +
            'FROM storagedb.itemstate, storagedb.item\n' +
            'WHERE itemstate.itemId=item.itemId\n' +
            'ORDER BY  order_param,item.itemId,itemArea DESC ';
        //sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId ORDER BY item.itemArea';
    }else {
        sql=url.sql;
    }

    console.log(sql)
    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }


        //console.log(result);
        for(var i=0;i<result.length;i++){
            states=[];
            statesCounter=-1;
            if(result[i].hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result[i].lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result[i].hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
            if(result[i].needReturn===1){
                statesCounter++;
                states[statesCounter]='需归还物料'
            }
            if(result[i].hasOrder===0&&result[i].lessRest===0&&result[i].hasUncheck===0&&result[i].needReturn===0){
                statesCounter++;
                states[statesCounter]='无'
            }
            statesList[i]=states;
        }

        //console.log(statesList)
        res.render('adItemMan', {
            itemList:result,
            itemStateList:statesList,
            user:req.session.user
        });

    });
});


router.post('/adItemMan', function(req, res,){
    var sql;
    var typeJudge=req.body.type;
    var alarmJudge=req.body.alarm;
    let indexOf =  '\'\%%' + req.body.indexOf + '%\'';

    switch (typeJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM storagedb.itemstate, storagedb.item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'光机类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
        case '2':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM storagedb.itemstate, storagedb.item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'电气类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
        case '3':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM storagedb.itemstate, storagedb.item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'钣金类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
        case '4':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM storagedb.itemstate, storagedb.item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'铸件类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
        case '5':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM storagedb.itemstate, storagedb.item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'其它类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
    }

    switch (alarmJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.hasOrder=0 AND itemstate.lessRest=0 AND itemstate.hasUncheck=0 AND itemstate.needReturn = 0  ORDER BY item.itemId,item.itemArea'; break;
        case '2':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.hasUncheck=1 ORDER BY item.itemId,item.itemArea'; break;
        case '3':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.lessRest=1 ORDER BY item.itemId,item.itemArea'; break;
        case '4':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.hasOrder=1 ORDER BY item.itemId,item.itemArea'; break;
        case '5':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.needReturn=1 ORDER BY item.itemId,item.itemArea'; break;
    }

    //console.log(indexOf);

    if(req.body.indexOfButton){
        sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND itemstate.needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM storagedb.itemstate, storagedb.item\n' +
            'WHERE itemstate.itemId=item.itemId AND (item.itemName Like' +indexOf+' OR item.itemId Like '+indexOf+' OR item.itemModel Like '+indexOf+' OR item.itemSupplier Like '+indexOf+' OR item.itemNote Like '+indexOf+')' +
            'ORDER BY  order_param,item.itemId,itemArea ASC';

        //sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND (item.itemName Like' +indexOf+' OR item.itemId Like '+indexOf+' OR item.itemNote Like '+indexOf+')';
    }

    var returnURL = '/adItemMan?' +sql ;
    res.redirect(returnURL)

});






/* GET  itemPage. */
router.get('/adItem', function(req, res, next) {
    var statesCounter;
    var states=[];
    var statesList=[];
    var url=URL.parse(req.url,true).query;
    var sql1='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';
    var sql2=';SELECT * FROM record WHERE itemId='+'\''+url.itemId+'\''+'ORDER BY date DESC';
    var sql;
    //console.log(url)
    if(url.sql===undefined || url.sql==='undefined'){
        sql=sql1+sql2;
    } else {
        sql=url.sql;
    }


    //console.log(url);
    router.get('/create_qrcode', function (req, res, next) {
        var text = req.query.text;
        try {
            var img = qr.image(text, {size: 10});
            res.writeHead(200, {'Content-Type': 'image/png'});
            img.pipe(res);
        } catch (e) {
            res.writeHead(414, {'Content-Type': 'text/html'});
            res.end('<h1>414 Request-URI Too Large</h1>');
        }
    });



    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        for(var i=0;i<result[0].length;i++){
            states=[];
            statesCounter=-1;
            if(result[0][i].hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result[0][i].lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result[0][i].hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
            if(result[0][i].needReturn===1){
                statesCounter++;
                states[statesCounter]='需归还物料'
            }
            statesList[i]=states;
        }

        if( states.length===0){
            statesCounter++;
            states[statesCounter]='无'
        }


        var  sql2 = 'SELECT * FROM item, itemstate WHERE item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
        connection.query(sql2,function (err, result) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            ChangeState(result[0].itemNum>result[0].itemAlarmSetting,'lessRest',0,url);
            if(result[0].itemNum>result[0].itemAlarmSetting&&result[0].lessRest===1){
                addNote('物料事件更新',result[0].itemName,result[0].itemId,'取消少剩余状态');
            }

            ChangeState(result[0].itemNum<=result[0].itemAlarmSetting,'lessRest',1,url);
            if(result[0].itemNum<=result[0].itemAlarmSetting&&result[0].lessRest===0){
                addNote('物料事件更新',result[0].itemName,result[0].itemId,'少剩余');
            }


        });

        res.render('adItem', {
            item:result[0],
            itemStateList:statesList,
            recordList:result[1],
            user:req.session.user

        });

    });

});


//如果一直出现500报错信息 Node Multer unexpected field 则需要如此操作

router.post('/adItem', upload.single('updateFileName'), function(req, res, next) {

    var url=URL.parse(req.url,true).query;
    var sql;
    //console.log(URL.parse(req.url,true).query);
    var typeJudge=req.body.type;
    let indexOf = '\'%' +'\\'+ req.body.date  + '%\'';
    var checkOriginalSql='SELECT * FROM item WHERE itemId = \''+url.itemId+'\'';

    var originalSql1;
    var updateJson1;
    var originalSql2='UPDATE itemstate SET  itemId=? WHERE itemId = \''+url.itemId+'\'';
    var originalSql3='UPDATE record SET  itemId=? WHERE itemId = \''+url.itemId+'\'';
    var originalSql4;
    var originalSql5;
    var originalSql6;


    var uploadFileName=req.body.updateFileName;
    //console.log(uploadFileName)

    var updateJson2=[req.body.updateId];


    var isUpdate=true;


    if(req.body.updateButton){

            //console.log(req.body.updateId.placeholder)

        var checkItemIdSQL='SELECT * FROM item WHERE itemId=\''+req.body.updateId+'\'';
        var checkItemModelSQL='SELECT * FROM item WHERE itemModel=\''+req.body.updateModel+'\'';
        //var bodyJason=[req.body.updateSupplier,req.body.updateName,req.body.updateId,req.body.updateModel,req.body.updateType];
        //console.log(bodyJason)
        connection.query(checkOriginalSql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            connection.query(checkItemIdSQL,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                connection.query(checkItemModelSQL, function (err, result2) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    }

                    var updatesupplierFinal=req.body.updateSupplier;
                    if(updatesupplierFinal===undefined){
                        updatesupplierFinal=result0[0].itemSupplier;
                    }

                    var updateTypeFinal=req.body.updateType;
                    if(updateTypeFinal===undefined){
                        updateTypeFinal=result0[0].itemType;
                    }

                    if(req.body.updateId===undefined){
                        if(req.file===undefined){//仓管编辑
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=? , itemSupplier=?, itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,result0[0].itemModel,updatesupplierFinal,req.body.updateUnit];
                            if(req.body.updateArea===undefined){  //技术员编辑
                                originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=? , itemSupplier=?, itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                                updateJson1=[req.body.updateName,result0[0].itemId,updateTypeFinal,result0[0].itemArea,result0[0].itemAlarmSetting,req.body.updateNote,req.body.updateModel,updatesupplierFinal,result0[0].itemUnit];
                            }
                        }else{
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?, itemSupplier=? ,itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,result0[0].itemModel,req.file.filename,updatesupplierFinal,req.body.updateUnit];
                            if(req.body.updateArea===undefined){
                                originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?, itemSupplier=? ,itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                                updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,result0[0].itemArea,result0[0].itemAlarmSetting,req.body.updateNote,req.body.updateModel,req.file.filename,updatesupplierFinal,result0[0].itemUnit];

                            }
                        }
                    }else{
                        if(req.file===undefined){//系统管理员编辑
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?,itemSupplier=?,itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[req.body.updateName,req.body.updateId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,req.body.updateModel,updatesupplierFinal,req.body.updateUnit];
                        }else{
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?,itemSupplier=?,itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[req.body.updateName,req.body.updateId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,req.body.updateModel,req.file.filename,updatesupplierFinal,req.body.updateUnit];
                        }
                        originalSql4='SET SQL_SAFE_UPDATES = 0;\n' +
                            'update homenote set id=(case when id=\''+url.itemId+'\' then \''+req.body.updateId+'\' end) where id=\''+url.itemId+'\';\n' ;
                        originalSql5='SET SQL_SAFE_UPDATES = 0;\n' +
                            'update notification set itemId=(case when itemId=\''+url.itemId+'\' then \''+req.body.updateId+'\' end) where itemId=\''+url.itemId+'\';\n';
                        originalSql6='SET SQL_SAFE_UPDATES = 0;\n' +
                            'update orderlist set itemId=(case when itemId=\''+url.itemId+'\' then \''+req.body.updateId+'\' end) where itemId=\''+url.itemId+'\';\n' ;
                    }


                    if (result1.length !== 0&&req.body.updateId!==url.itemId) {
                        isUpdate=false;
                        return res.send('数据更新失败：您正更改的物料【物料编号】已存在于物料列表中。')
                    } else if (result2.length !== 0&&req.body.updateModel!==url.itemModel) {
                        isUpdate=false;
                        return res.send('数据更新失败：您正更改的物料【型号(图号)】已存在于物料列表中。')
                    }else{
                        if( isUpdate){
                            connection.query(originalSql1,updateJson1,function (err, result) {
                                if(err){
                                    console.log('[UPDATE ERROR] - ',err.message);
                                    return ;
                                }
                            });

                            if(req.body.updateId!==undefined){
                                connection.query(originalSql2,updateJson2,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });

                                connection.query(originalSql3,updateJson2,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });
                                connection.query(originalSql4,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });
                                connection.query(originalSql5,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });
                                connection.query(originalSql6,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });


                            }


                            if(req.body.updateModel===undefined&&req.body.updateId===undefined){
                                var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
                            }else if(req.body.updateModel!==undefined&&req.body.updateId===undefined){
                                var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+req.body.updateModel;
                            }
                            else{
                                var flashUrl='adItem?itemId='+req.body.updateId+'&returnSql='+url.returnSql+'&itemModel='+req.body.updateModel;
                            }
                            res.redirect(flashUrl)
                        }
                    }
                });
            });
        });







    }else{
        switch (typeJudge) {
            case '0':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\''+'ORDER BY date DESC'; break;
            case '1':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\' AND type=\'进仓\''+'ORDER BY date DESC'; break;
            case '2':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\' AND type=\'出仓\''+'ORDER BY date DESC'; break;
            case '3':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\' AND type=\'临时进仓\''+'ORDER BY date DESC'; break;
            case '4':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\' AND type=\'归还进仓\''+'ORDER BY date DESC'; break;
        }


        //console.log(indexOf);

        if(req.body.dateButton){
            sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\'AND date LIKE'+indexOf+'ORDER BY date DESC';
        }




        var returnURL = '/adItem?sql='+sql+'&itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
        console.log(returnURL)
        return  res.redirect(returnURL)
    }

});






/* GET  itemAddPage. */
router.get('/adItemAdd', function(req, res, next) {
    res.render('adItemAdd', {user:req.session.user });
});



router.post('/adItemAdd',upload.single('addFileName'), function(req, res, next) {
    var hadId=true;
    var  checkSql = 'SELECT * FROM item';
    var fileName='null';

    connection.query(checkSql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        var pinstrName=req.body.addName;
        var fistzmName=pinyin(pinstrName,{style:pinyin.STYLE_FIRST_LETTER}).toString();
        var itemNameFinal= fistzmName.replace(new RegExp(",",'g'),"").toUpperCase();

        var pinstrType=req.body.addType;
        var fistzmType=pinyin(pinstrType,{style:pinyin.STYLE_FIRST_LETTER}).toString();
        var itemTypeFinal= fistzmType.replace(new RegExp(",",'g'),"").substr(0,1).toUpperCase();


        var pinstrSize=req.body.addSize;
        var fistzmSize=pinyin(pinstrSize,{style:pinyin.STYLE_FIRST_LETTER}).toString();
        var fistzmSizeFinal=fistzmSize.replace(new RegExp(",",'g'),"").toUpperCase();

        var itemIdFinal=itemNameFinal+fistzmSizeFinal+'-'+itemTypeFinal+'-'+( "00000000" + (parseInt(result.length)+1) ).substr( -5 ) ;
        var addModelFinal =req.body.addModel;
        console.log('!!!!!'+fistzmSizeFinal,pinstrSize,fistzmSize)
        if(addModelFinal===''){
            addModelFinal = itemIdFinal;
        }

        var checkItemIdSQL='SELECT * FROM item WHERE itemName=\''+req.body.addName+req.body.addSize+'\''+'AND itemSupplier=\''+req.body.addSupplier+'\'';
        var checkItemModelSQL='SELECT * FROM item WHERE itemModel=\''+addModelFinal+'\'';
        connection.query(checkItemIdSQL,function (err, result1) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            connection.query(checkItemModelSQL,  function (err, result2) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
            if(result1.length!==0){
                hadId=false;
                return  res.send('物料添加失败：您所添加的物料【物料编号】已存在于物料列表中。')
            }else if(result2.length!==0){
                    hadId=false;
                    return  res.send('物料添加失败：您所添加的物料【型号(图号)】已存在于物料列表中。')
            }else{
               // console.log(req.file!==undefined);
                //  console.log(req.file.filename);
                if(req.file!==undefined){
                    fileName=req.file.filename;
                }
                //console.log(fileName);

                if(hadId){

                    var  addSql1 = 'INSERT INTO item(itemId,itemName,itemType,itemNum,itemTemNum,itemUnit,itemArea,itemAlarmSetting,itemNote,itemFileName,itemModel,itemSupplier) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)';
                    var  addSqlParams1 = [itemIdFinal,req.body.addName+req.body.addSize,req.body.addType,0,0,req.body.addUnit,req.body.addArea,req.body.addAlarmSetting,req.body.addNote,fileName,addModelFinal,req.body.addSupplier ];
                    var  addSql2 = 'INSERT INTO itemstate(itemId,hasOrder,lessRest,hasUncheck) VALUES(?,?,?,?)';
                    var  addSqlParams2 = [itemIdFinal,0,1,0 ];
                    connection.query(addSql1,addSqlParams1,   function  (err, result) {
                        if(err){
                            console.log('[INSERT ERROR] - ',err.message);
                            return;
                        }
                        connection.query(addSql2,addSqlParams2,function(err, result) {
                            if(err){
                                console.log('[INSERT ERROR] - ',err.message);
                                return;
                            }
                            // console.log(req.file!==undefined);
                            //  console.log(req.file.filename);
                            if(req.file!==undefined){
                                fileName=req.file.filename;
                            }

                            addNote('物料事件更新',req.body.addName+req.body.addSize,itemIdFinal,'添加新物料');
                            //console.log(fileName)
                        });

                    });
                    var flashUrl='aditem?itemId='+itemIdFinal+'&returnSql=undefined'+'&itemModel='+addModelFinal;
                    return res.redirect('flash?url='+flashUrl)

                    }

                }

            });
        });

    });


});





/* GET QRCodePrint. */
router.get('/qrCodePrint', function(req, res, next) {
    var statesCounter;
    var states=[];
    var statesList=[];

    var url=URL.parse(req.url,true).query;

    var sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';

    console.log(sql)
    router.get('/create_qrcode', function (req, res, next) {
        var text = req.query.text;
        try {
            var img = qr.image(text, {size: 10});
            res.writeHead(200, {'Content-Type': 'image/png'});
            img.pipe(res);
        } catch (e) {
            res.writeHead(414, {'Content-Type': 'text/html'});
            res.end('<h1>414 Request-URI Too Large</h1>');
        }
    });



    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        console.log(result);

            states=[];
            statesCounter=-1;
            if(result.hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result.lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result.hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
            if(result.hasOrder===0&&result.lessRest===0&&result.hasUncheck===0){
                statesCounter++;
                states[statesCounter]='无'
            }
            statesList=states;


        console.log(result)
        res.render('qrCodePrint', {
            itemList:result,
            itemStateList:statesList,
        });

    });

});

/* GET adItemExit */
router.get('/adItemExit', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    getInfo(url,function (err,result) {
        // console.log(result)

        return  res.render('adItemExit', {
            itemList:result.item,
            itemStateList:result.itemStateList,
            user:req.session.user
        });
    })

});


router.post('/adItemExit', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var  date= new Date();
    var year= parseInt(date.getFullYear()) ;
    var month=parseInt(date.getMonth()+1);
    var day=parseInt(date.getDate());
    var hour=parseInt(date.getHours());
    var min=parseInt(date.getMinutes());
    var sec=parseInt(date.getSeconds());

    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    var state='null';
    var returnNum=0;
    if(req.body.reason==='返工（需归还）'||req.body.reason==='借用（需归还）'){
        state='未处理'
        returnNum=req.body.num;
    }


    var  addSqlParams = [url.itemId, '出仓',dateOutput, req.body.manager, 'null',req.body.note,'null',state,req.body.reason,req.body.applicant,'null',req.body.num,'1111-01-01 01:01:01',returnNum];

    //console.log('asasad'+addSqlParams)



    //改====
    var  sql = 'SELECT * FROM item WHERE itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
    connection.query(sql,function (err, result) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            return;
        }

        //console.log(parseInt(req.body.num));

        if(parseInt(req.body.num)>parseInt(result[0].itemNum)){
            return  res.send('出仓失败：您所申请的出仓物料数量大于库存数量。')
        }else{
            connection.query(addSql,addSqlParams,function (err, result1) {
                if(err){
                    console.log('[INSERT ERROR] - ',err.message);
                    return;
                }

                if(req.body.reason==='返工（需归还）'||req.body.reason==='借用（需归还）'){
                    ChangeState(true,'needReturn',1,url);
                    addNote('物料事件更新',result[0].itemName,result[0].itemId,'需归还物料');
                }

                var modSql = 'UPDATE item SET itemNum = ? WHERE itemId = '+'\''+url.itemId+'\'';
                var updateNum=result[0].itemNum-parseInt(req.body.num) ;

                var modSqlParams = [updateNum];
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });

            });
        }

        var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
        res.redirect(flashUrl)
    });
    




//====改
});





/* GET adItemTemEnter */
router.get('/adItemTemEnter', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var orderId=url.orderId;
    var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query(checksql,function (err, result1) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            getInfo(url,function (err,result) {
                // console.log(result)
                return  res.render('adItemTemEnter', {
                    itemList:result.item,
                    itemStateList:result.itemStateList,
                    orderId:orderId,
                    totalNum:result1[0].totalNum,
                    getNum:result1[0].getNum,
                    pendingNum:result1[0].pendingNum,
                    returnNum:result1[0].returnNum,
                    supplier:url.supplier,
                    user:req.session.user
                });
            })
        });
});
router.post('/adItemTemEnter', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var  saveDate= new Date();
    var year= parseInt(saveDate.getFullYear()) ;
    var month=parseInt(saveDate.getMonth()+1);
    var day=parseInt(saveDate.getDate());
    var hour=parseInt(saveDate.getHours());
    var min=parseInt(saveDate.getMinutes());
    var sec=parseInt(saveDate.getSeconds());
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    //console.log(dateOutput)


        orderId=url.orderId;
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query(checksql,function (err, result1) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            if(req.body.enterModel==='临时进仓'){

                if(result1[0].totalNum<parseInt( result1[0].getNum)+parseInt( result1[0].pendingNum)+parseInt( result1[0].returnNum)+parseInt(req.body.saveNum) ){
                    return  res.send('临时进仓失败：进仓数量超过应收数量。');
                }else{
                    var modSql = 'UPDATE orderlist SET pendingNum = ? WHERE orderId = '+'\''+url.orderId+'\'';
                    var modSqlParams = [parseInt( result1[0].pendingNum)+parseInt(req.body.saveNum) ];

//改
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                    itemEnter();
                    OrderState(result1[0].itemName);
                    addNotification('已临时进仓',req.body.saveNum);

                    var flashUrl='adOrder?orderId='+result1[0].orderId;
                    return res.redirect('flash?url='+flashUrl)
                }
            }else if(req.body.enterModel==='退还进仓至临时仓库'){
                if(req.body.saveNum>result1[0].returnNum){
                    return  res.send('临时进仓失败：临时进仓数量超过退回数量。');
                }else{
                    var modSql = 'UPDATE orderlist SET pendingNum = ?, returnNum=? WHERE orderId = '+'\''+url.orderId+'\'';
                    var modSqlParams = [parseInt(result1[0].pendingNum)+parseInt(req.body.saveNum) ,parseInt(result1[0].returnNum)- parseInt(req.body.saveNum)];
//改

                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                    itemEnter();
                    OrderState(result1[0].itemName);
                    addNotification('已退还进仓至临时仓库',req.body.saveNum);
                    var flashUrl='adOrder?orderId='+result1[0].orderId;
                    return res.redirect('flash?url='+flashUrl)
                }
            }
        });


    function itemEnter() {
        var  addSqlParams = [url.itemId, '临时进仓',dateOutput, req.body.saveManager,req.body.saveDeliver,req.body.saveNote,url.orderId,'未处理','null','unll','null',req.body.saveNum,'1111-01-01 01:01:01',0];
        connection.query(addSql,addSqlParams,function (err, result) {
            if(err){
                console.log('[INSERT ERROR] - ',err.message);
                return;
            }

        });


        //改====
        var  sql = 'SELECT * FROM item WHERE itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
        connection.query(sql,function (err, result) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }

            var modSql = 'UPDATE item SET itemTemNum = ? WHERE itemId = '+'\''+url.itemId+'\'';
            var updateNum=result[0].itemTemNum+parseInt(req.body.saveNum) ;

            var modSqlParams = [updateNum];
            connection.query(modSql,modSqlParams,function (err, result) {
                if(err){
                    console.log('[UPDATE ERROR] - ',err.message);
                    return;
                }


            });

        });

    }

    function addNotification(enterModel,addSqlInput) {
        var countSql='SELECT * FROM notification';
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,result0[0].itemId,url.orderId ];
                // console.log(addSqlParams)
                connection.query(addSql,addSqlParams,function (err, result) {
                    if(err){
                        console.log('[INSERT ERROR] - ',err.message);
                        return;
                    }

                });


            });
        });
    }

    function OrderState(itemName) {
        var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result) {
            if(parseInt(result[0].returnNum) ===0){
                var modSql;
                var modSqlParams;
                if(result[0].totalNum===result[0].getNum+result[0].pendingNum&&result[0].arriveDate===null){
                    modSql = 'UPDATE orderlist SET state = ?,arriveDate=? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = ['已到货',dateOutput];
                }else{
                   modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                   modSqlParams = ['已到货'];
                }

//改
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });
                addNote('采购事件更新',itemName,url.orderId,'已到货')




            }
        });
    }

});








/* GET adItemEnter */
router.get('/adItemEnter', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var orderId='无（直接进仓）';
    var supplier='';


    if(url.orderId!==undefined){
        orderId=url.orderId;
        var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query(checksql,function (err, result1) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            getInfo(url,function (err,result) {
                // console.log(result)
                return  res.render('adItemEnter', {
                    itemList:result.item,
                    itemStateList:result.itemStateList,
                    orderId:orderId,
                    totalNum:result1[0].totalNum,
                    getNum:result1[0].getNum,
                    pendingNum:result1[0].pendingNum,
                    returnNum:result1[0].returnNum,
                    supplier:url.supplier,
                    user:req.session.user
                });
            })
        });
    }else{
        if(url.supplier!==undefined){
            supplier=url.supplier;
        }
        getInfo(url,function (err,result) {
            // console.log(result)
            return  res.render('adItemEnter', {
                itemList:result.item,
                itemStateList:result.itemStateList,
                orderId:orderId,
                totalNum:0,
                getNum:0,
                pendingNum:0,
                returnNum:0,
                supplier:supplier,
                user:req.session.user
            });
        })
    }





});

router.post('/adItemEnter', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

    //console.log(dateOutput)
    var orderId='无（直接进仓）';

    if(url.orderId!==undefined){
        orderId=url.orderId;
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query(checksql,function (err, result1) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            if(req.body.enterModel==='直接进仓'){

                if(result1[0].totalNum<parseInt( result1[0].getNum)+parseInt( result1[0].pendingNum)+parseInt( result1[0].returnNum)+parseInt(req.body.saveNum) ){
                    return  res.send('进仓失败：进仓数量超过应收数量。');
                }else{
                    var modSql = 'UPDATE orderlist SET getNum = ? WHERE orderId = '+'\''+url.orderId+'\'';
                    var modSqlParams = [parseInt( result1[0].getNum)+parseInt(req.body.saveNum) ];

//改
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                    itemEnter();
                    addNotification('已进仓',req.body.saveNum);
                    OrderCompeleted(result1[0].itemName);


                    var flashUrl='adOrder?orderId='+url.orderId;
                    return res.redirect('flash?url='+flashUrl)
                }
            }else if(req.body.enterModel==='验收进仓'){
                if(req.body.saveNum>result1[0].pendingNum){
                    return  res.send('进仓失败：验收数量超过待检数量。');
                }else{
                    var modSql = 'UPDATE orderlist SET getNum = ?, pendingNum=? WHERE orderId = '+'\''+url.orderId+'\'';
                    var modSqlParams = [parseInt(result1[0].getNum)+parseInt(req.body.saveNum) ,parseInt(result1[0].pendingNum)- parseInt(req.body.saveNum)];
//改
                    if(parseInt(req.body.saveNum)===result1[0].pendingNum){
                        var modSql2='UPDATE record SET state = ? WHERE orderId ='+'\''+url.orderId+'\'' ;
                        var modSqlParams2 = ['已处理'];

                        connection.query(modSql2,modSqlParams2,function (err, result) {
                            if(err){
                                console.log('[UPDATE ERROR] - ',err.message);
                                return;
                            }

                        });
                    }
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                    var modSql3='UPDATE item SET itemTemNum=? WHERE itemId='+'\''+result1[0].itemId+'\''
                    var modSqlParams3 = [parseInt(result1[0].itemTemNum)-req.body.saveNum];

                    connection.query(modSql3,modSqlParams3,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });

                    itemEnter();
                    addNotification('已验收进仓',req.body.saveNum);
                    OrderCompeleted(result1[0].itemName);

                    var flashUrl='adOrder?orderId='+url.orderId;
                    return res.redirect('flash?url='+flashUrl)
                }
            }else if(req.body.enterModel==='退还进仓'){
                if(req.body.saveNum>result1[0].returnNum){
                    return  res.send('进仓失败：退还数量超过退回数量。');
                }
                else {
                    var modSql = 'UPDATE orderlist SET getNum = ?, returnNum=? WHERE orderId = '+'\''+url.orderId+'\'';
                    var modSqlParams = [parseInt(result1[0].getNum)+parseInt(req.body.saveNum) ,parseInt(result1[0].returnNum)- parseInt(req.body.saveNum)];

//改
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                    itemEnter();
                    addNotification('已退还进仓',req.body.saveNum);
                    OrderCompeleted(result1[0].itemName);



                    var flashUrl='adOrder?orderId='+url.orderId;
                    return res.redirect('flash?url='+flashUrl)
                }
            }
        });
    } else{
       itemEnter()



        var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
        return res.redirect(flashUrl)
    }


    function itemEnter() {
        var supplier=url.supplier;
        if(supplier===''){
            supplier=req.body.saveSupplier;
        }
        var  saveDate= new Date();
        var year= parseInt(saveDate.getFullYear()) ;
        var month=parseInt(saveDate.getMonth()+1);
        var day=parseInt(saveDate.getDate());
        var hour=parseInt(saveDate.getHours());
        var min=parseInt(saveDate.getMinutes());
        var sec=parseInt(saveDate.getSeconds());
        var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
        var  addSqlParams = [url.itemId, '进仓',dateOutput, req.body.saveManager,req.body.saveDeliver,req.body.saveNote,orderId,'null','null','unll','null',req.body.saveNum,'1111-01-01 01:01:01',0];
        connection.query(addSql,addSqlParams,function (err, result) {
            if(err){
                console.log('[INSERT ERROR] - ',err.message);
                return;
            }

        });


        //改====
        var  sql = 'SELECT * FROM item WHERE itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
        connection.query(sql,function (err, result) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }

            var modSql = 'UPDATE item SET itemNum = ? WHERE itemId = '+'\''+url.itemId+'\'';
            var updateNum=result[0].itemNum+parseInt(req.body.saveNum) ;

            var modSqlParams = [updateNum];
            connection.query(modSql,modSqlParams,function (err, result) {
                if(err){
                    console.log('[UPDATE ERROR] - ',err.message);
                    return;
                }


            });

        });



    }

    function addNotification(enterModel,addSqlInput) {
        var  saveDate= new Date();
        var year= parseInt(saveDate.getFullYear()) ;
        var month=parseInt(saveDate.getMonth()+1);
        var day=parseInt(saveDate.getDate());
        var hour=parseInt(saveDate.getHours());
        var min=parseInt(saveDate.getMinutes());
        var sec=parseInt(saveDate.getSeconds());
        if(enterModel==='已完成'){
            sec=parseInt(sec)+1;
        }

        var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
        console.log(dateOutput);
        var countSql='SELECT * FROM notification';
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,result0[0].itemId,url.orderId ];
               // console.log(addSqlParams)
                connection.query(addSql,addSqlParams,function (err, result) {
                    if(err){
                        console.log('[INSERT ERROR] - ',err.message);
                        return;
                    }

                });


            });
        });
    }

    function OrderCompeleted(itemName) {
        var  saveDate= new Date();
        var year= parseInt(saveDate.getFullYear()) ;
        var month=parseInt(saveDate.getMonth()+1);
        var day=parseInt(saveDate.getDate());
        var hour=parseInt(saveDate.getHours());
        var min=parseInt(saveDate.getMinutes());
        var sec=parseInt(saveDate.getSeconds());
        var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
        var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result) {
            if(result[0].totalNum===result[0].getNum){
                var modSql;
                var modSqlParams;
                if(result[0].totalNum===result[0].getNum+result[0].pendingNum&&result[0].arriveDate===null){
                    modSql = 'UPDATE orderlist SET state = ?,arriveDate=? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = ['已完成',dateOutput];
                }else{
                    modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = ['已完成'];
                }

//改
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });
                var checksql='SELECT * FROM orderlist WHERE (state=\'已下单\'OR state=\'申请中\' OR state=\'已到货\' OR state=\'有退回\') AND itemId='+'\''+result[0].itemId+'\'';
                connection.query( checksql,function (err, result2) {

                    if(parseInt(result2.length)===0){
                        ChangeState(true,'hasOrder',0,url);
                        addNote('物料事件更新',itemName,result[0].itemId,'取消有订单未处理状态')
                    }
                })

                addNotification('已完成', ' ')
                addNote('采购事件更新',itemName,url.orderId,'已完成')



            }else{
                if(parseInt(result[0].returnNum) ===0){
                        var modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                        var modSqlParams = ['已到货'];
                        if(result[0].totalNum===result[0].getNum+result[0].pendingNum&&result[0].arriveDate===null){
                            modSql = 'UPDATE orderlist SET state = ?,arriveDate=? WHERE orderId = '+'\''+url.orderId+'\'';
                            modSqlParams = ['已到货',dateOutput];
                        }else{
                            modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                            modSqlParams = ['已到货'];
                        }

//改
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                    addNote('采购事件更新',itemName,url.orderId,'已到货')





                }
            }

        });
    }
//====改


});








/* GET adItemReturn */
router.get('/adItemReturn', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var date=new Date(url.exitDate)

    var y=date.getFullYear();
    var mon=date.getMonth()+1;
    var day=date.getDate();
    var h=date.getHours()-8;
    if(parseInt(h)<0){
        day=day-1;
        h=24+h;
    }
    var min=date.getMinutes();
    var sec=date.getSeconds();


    var getDate=y+"-"+mon+"-"+day+" "+h+':'+min+':'+sec;
    //console.log(getDate)
    getInfo(url,function (err,result) {
        // console.log(result)
        return  res.render('adItemReturn', {
            itemList:result.item,
            itemStateList:result.itemStateList,
            getDate: getDate,
            getNum:url.exitNum,
            supplier:url.supplier,
            user:req.session.user
        });
    })
});


router.post('/adItemReturn', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var  saveDate= new Date();
    var year= parseInt(saveDate.getFullYear()) ;
    var month=parseInt(saveDate.getMonth()+1);
    var day=parseInt(saveDate.getDate());
    var hour=parseInt(saveDate.getHours());
    var min=parseInt(saveDate.getMinutes());
    var sec=parseInt(saveDate.getSeconds());
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
   // console.log(dateOutput)

    var  urlDate= new Date(url.exitDate);
    var urlyear= parseInt(urlDate.getFullYear()) ;
    var urlmonth=parseInt(urlDate.getMonth()+1);
    var urlday=parseInt(urlDate.getDate());
    var urlhour=parseInt(urlDate.getHours())-8;
    if(parseInt(urlhour)<0){
        urlday=urlday-1;
        urlhour=24+urlhour;
    }
    var urlmin=parseInt(urlDate.getMinutes());
    var urlsec=parseInt(urlDate.getSeconds());
    var urldateOutput= urlyear+'-'+urlmonth+'-'+urlday+' '+urlhour+':'+urlmin+':'+urlsec;

    //console.log("asda"+urldateOutput)






    var  sql2 = 'SELECT * FROM record,item WHERE record.itemId=item.itemId AND record.date='+'\''+urldateOutput+'\''; //select id,name From websites=rowDataPacket{id,name}
    connection.query(sql2,function (err, result) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            return;
        }
        //console.log("lalalal"+result[0].num)
        if(parseInt( result[0].returnNum)<parseInt( req.body.num)){
            return  res.send('归还进仓失败：您所申请的归还物料数量大于需归还数量。')
        }else{

            var  addSqlParams = [url.itemId, '归还进仓',dateOutput, req.body.manager,'null',req.body.note,'null','null','null','unll',req.body.returnee,req.body.num,new Date(urldateOutput),0];
            connection.query(addSql,addSqlParams,function (err, result) {
                if(err){
                    console.log('[INSERT ERROR] - ',err.message);
                    return;
                }

            });


            //改====
            var  sql = 'SELECT * FROM item WHERE itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
            connection.query(sql,function (err, result) {
                if(err){
                    console.log('[SELECT ERROR] - ',err.message);
                    return;
                }

                var modSql = 'UPDATE item SET itemNum = ? WHERE itemId = '+'\''+url.itemId+'\'';
                var updateNum=result[0].itemNum+parseInt(req.body.num) ;

                var modSqlParams = [updateNum];
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });
            });

            modSql = 'UPDATE record SET returnNum = ? WHERE date = '+'\''+urldateOutput+'\'';
            modSqlParams = [parseInt(result[0].returnNum) -parseInt(req.body.num)];
            if(parseInt( result[0].returnNum)===parseInt( req.body.num)){
                var modSql = 'UPDATE record SET state = ?, returnNum = ? WHERE date = '+'\''+urldateOutput+'\'';
                var updateState='已处理';
                var modSqlParams = [updateState,parseInt(result[0].returnNum) -parseInt(req.body.num)];


            }
            connection.query(modSql,modSqlParams,function (err, result) {
                if(err){
                    console.log('[UPDATE ERROR] - ',err.message);
                    return;
                }


            });

            var checksql='SELECT * FROM record WHERE (reason=\'借用（需归还）\' OR reason=\'返工（需归还）\') AND state=\'未处理\' AND itemId='+'\''+url.itemId+'\'';
            connection.query( checksql,function (err, result2) {
                //console.log("@@@"+result2.length)
                if(result2.length===0){
                    ChangeState(true,'needReturn',0,url);
                    addNote('物料事件更新',result[0].itemName,result[0].itemId,'取消需归还物料状态');
                }
            })




            var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
            res.redirect(flashUrl)
        }




    });





//====改
});






/* GET adItemReturnSelect */
router.get('/adItemReturnSelect', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var  sql = 'SELECT * FROM record WHERE itemId='+'\''+url.itemId+'\''+'AND state=\'未处理\''+'AND (reason=\'借用（需归还）\''+'OR reason=\'返工（需归还）\')'; //select id,name From websites=rowDataPacket{id,name}
//console.log(sql)
    connection.query(sql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }

       getInfo(url,function (err,result2) {
            // console.log(result)
           // console.log(result1)
            return  res.render('adItemReturnSelect', {
                itemList:result2.item,
                itemStateList:result2.itemStateList,
                recordList:result1,
                user:req.session.user
            });
        });

    });

});














/* GET adOrderMan*/
router.get('/adOrderMan', function(req, res, next) {
    var sql;
    var url=URL.parse(req.url,true).query;
    //console.log(url)
    if(url.sql===undefined){
        sql='SELECT *  ,CASE  WHEN state = \'申请中\' OR state = \'已下单\' OR state = \'有退回\' OR (state = \'已到货\' AND getNum+pendingNum != totalNum) THEN 1\n' +
            'WHEN (state = \'已到货\' AND getNum+pendingNum = totalNum) THEN 2\n' +
            'WHEN state = \'已取消\'  THEN 3\n' +
            'WHEN state = \'已拒绝\'  THEN 4\n' +
            'WHEN state = \'已完成\' THEN 5\n' +
            'END AS order_param \n' +
            'FROM orderlist,item\n' +
            'WHERE orderlist.itemId=item.itemId\n' +
            'ORDER BY  order_param,commingDate,orderDate ASC';
        //sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId  ORDER BY orderlist.orderDate DESC';
    }else {
        sql=url.sql;
    }

    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }


       // console.log(result)
        res.render('adOrderMan', {
            orderList:result,
            user:req.session.user
        });

    });

});

router.post('/adOrderMan', function(req, res, next) {
    var sql;
    var stateJudge=req.body.state;
    let indexOf =  '\'\%%' + req.body.indexOf + '%\'';

    switch (stateJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已下单\' ORDER BY orderlist.orderDate DESC'; break;
        case '2':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'申请中\' ORDER BY orderlist.orderDate DESC'; break;
        case '3':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已拒绝\' ORDER BY orderlist.orderDate DESC'; break;
        case '4':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已到货\' ORDER BY orderlist.orderDate DESC'; break;
        case '5':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'有退回\' ORDER BY orderlist.orderDate DESC'; break;
        case '6':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已完成\' ORDER BY orderlist.orderDate DESC'; break;
        case '7':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已取消\' ORDER BY orderlist.orderDate DESC'; break;

    }


    //console.log(indexOf);

    if(req.body.indexOfButton){

        sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND (orderlist.orderId Like' +indexOf+' OR item.itemName Like '+indexOf+' OR item.itemId Like '+indexOf+' OR orderlist.applyNote Like '+indexOf+' OR orderlist.replyNote Like '+indexOf+')';
    }

    switch (req.body.order) {
        case '0':sql=undefined;break
        case '1':sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId  ORDER BY orderlist.orderDate DESC';break
    }



    //console.log(sql);


    var returnURL = '/adOrderMan?' +sql;
    res.redirect(returnURL)

});


/* GET adOrder*/
router.get('/adOrder', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var sql='SELECT * FROM orderlist,item,itemstate WHERE item.itemId=itemstate.itemId AND orderlist.itemId=item.itemId AND orderlist.orderId='+'\''+url.orderId+'\'';

    connection.query( sql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        var sql1='SELECT * FROM notification WHERE notification.orderId='+'\''+url.orderId+'\''+'ORDER BY noteDate DESC';

        connection.query( sql1,function (err, result2) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }

            ChangeState(result1[0].itemTemNum>0,'hasUncheck',1,result1[0]);
            if(result1[0].itemTemNum>0&&result1[0].hasUncheck===0){
                addNote('物料事件更新',result1[0].itemName,result1[0].itemId,'存在未检测');
            }
            ChangeState(result1[0].itemTemNum<=0,'hasUncheck',0,result1[0]);
            if(result1[0].itemTemNum<=0&&result1[0].hasUncheck===1){
                addNote('物料事件更新',result1[0].itemName,result1[0].itemId,'取消存在未检测状态');
            }

           // console.log(result2);
            res.render('adOrder', {
                orderList:result1,
                notificationList:result2,
                user:req.session.user
            });

        });
    });
});


router.post('/adOrder', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var  saveDate= new Date();
    var year= parseInt(saveDate.getFullYear()) ;
    var month=parseInt(saveDate.getMonth()+1);
    var day=parseInt(saveDate.getDate());
    var hour=parseInt(saveDate.getHours());
    var min=parseInt(saveDate.getMinutes());
    var sec=parseInt(saveDate.getSeconds());
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    if(req.body.approveButton){



        ChangeState(true,'hasOrder',1,url);


        var countSql='SELECT * FROM notification';
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }

                var arriveDateInput=req.body.arriveDateInput;
                if( req.body.arriveDateInput===''){
                    arriveDateInput=result0[0].commingDate;
                }
                var modSql = 'UPDATE orderlist SET state = ?,commingDate = ?,totalNum=?,orderDate=?,replyNote=? WHERE orderId = '+'\''+url.orderId+'\'';
                var modSqlParams = ['已下单', arriveDateInput,req.body.applyNum,dateOutput,req.body.confirmNoteInput];
//改
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });

                ChangeState(true,'hasOrder',1,url);


                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var  addSqlParams = [dateOutput, '采购事件更新','已下单',req.body.applyNum,result0[0].itemId,url.orderId ];
                //console.log(addSqlParams)
                connection.query(addSql,addSqlParams,function (err, result) {
                    if(err){
                        console.log('[INSERT ERROR] - ',err.message);
                        return;
                    }



                });
                addNote('采购事件更新',result0[0].itemName,url.orderId,'已下单')




            });
        });

    }

    if(req.body.confirmButton){
        var modSql = 'UPDATE orderlist SET commingDate = ? WHERE orderId = '+'\''+url.orderId+'\'';
        var modSqlParams = [req.body.arriveDateInput];
//改
        connection.query(modSql,modSqlParams,function (err, result) {
            if(err){
                console.log('[UPDATE ERROR] - ',err.message);
                return;
            }

        });
    }
    function StopOrder(state) {
        var modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
        var modSqlParams = [state];
//改
        connection.query(modSql,modSqlParams,function (err, result) {
            if(err){
                console.log('[UPDATE ERROR] - ',err.message);
                return;
            }


        });

        var countSql='SELECT * FROM notification';
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var  addSqlParams = [dateOutput, '采购事件更新',state,' ',result0[0].itemId,url.orderId ];
                console.log(addSqlParams)
                connection.query(addSql,addSqlParams,function (err, result) {
                    if(err){
                        console.log('[INSERT ERROR] - ',err.message);
                        return;
                    }

                });
                addNote('采购事件更新',result0[0].itemName,url.orderId,state)



                var checksql='SELECT * FROM orderlist WHERE (state=\'已下单\'OR state=\'申请中\' OR state=\'已到货\' OR state=\'有退回\') AND itemId='+'\''+result0[0].itemId+'\'';
                connection.query( checksql,function (err, result2) {
                    //console.log("@@@"+result2.length)
                    if(result2.length===0){
                        var modSql = 'UPDATE itemstate SET hasOrder=? WHERE itemId = '+'\''+result0[0].itemId+'\'';
                        var modSqlParams = [0];
//改
                        connection.query(modSql,modSqlParams,function (err, result) {
                            if(err){
                                console.log('[UPDATE ERROR] - ',err.message);
                                return;
                            }
                            addNote('物料事件更新',result0[0].itemName,result0[0].itemId,'取消有订单未处理状态')

                        });
                    }
                })



            });
        });
    }


    if(req.body.refuseButton){
        StopOrder('已拒绝')
    }

    if(req.body.cancelOrderButton){
        StopOrder('已取消')
    }
    var flashUrl='adOrder?orderId=' +url.orderId;
    res.redirect('flash?url='+flashUrl)

});


/* GET adOrderFix*/
router.get('/adOrderFix', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.orderId='+'\''+url.orderId+'\'';

    connection.query( sql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        var sql1='SELECT * FROM notification WHERE notification.orderId='+'\''+url.orderId+'\''+'ORDER BY noteDate DESC';

        connection.query( sql1,function (err, result2) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }

            // console.log(result2);
            res.render('adOrderFix', {
                orderList:result1,
                notificationList:result2,
                user:req.session.user
            });

        });

    });

});


router.post('/adOrderFix', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var  saveDate= new Date();
    var year= parseInt(saveDate.getFullYear()) ;
    var month=parseInt(saveDate.getMonth()+1);
    var day=parseInt(saveDate.getDate());
    var hour=parseInt(saveDate.getHours());
    var min=parseInt(saveDate.getMinutes());
    var sec=parseInt(saveDate.getSeconds());
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    //console.log(dateOutput)


    orderId=url.orderId;
    var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
    connection.query(checksql,function (err, result1) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            return;
        }
        if(req.body.enterModel==='直接退回'){

            if(result1[0].totalNum<parseInt( result1[0].getNum)+parseInt( result1[0].pendingNum)+parseInt( result1[0].returnNum)+parseInt(req.body.saveNum) ){
                return  res.send('退回失败：退回数量超出数额。');
            }else{
                var modSql = 'UPDATE orderlist SET returnNum = ? WHERE orderId = '+'\''+url.orderId+'\'';
                var modSqlParams = [parseInt( result1[0].returnNum)+parseInt(req.body.saveNum) ];

//改
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });
                OrderState(result1[0].itemName);
                var isFirstSQL='SELECT sum( case when noteState=\'已退回(首次检测)\' or noteState=\'已从临时仓库退回(首次检测)\' then 1 else 0 end) as returnTimes FROM storagedb.notification WHERE orderId=\''+url.orderId+'\'';
                connection.query(isFirstSQL,function (err, result2) {
                    if(err){
                        console.log('[SELECT ERROR] - ',err.message);
                        return;
                    }


                    if(result2[0].returnTimes>0){
                        addNotification('已退回',req.body.saveNum);
                    }else{
                        addNotification('已退回(首次检测)',req.body.saveNum);
                    }


                });


                var flashUrl='adOrder?orderId='+url.orderId;
                return res.redirect('flash?url='+flashUrl)
            }
        }else if(req.body.enterModel==='从临时仓库退回'){
            if(req.body.saveNum>result1[0].pendingNum){
                return  res.send('退回失败：退回数量超过临时仓库中该物料的数量。');
            }else{
                var modSql = 'UPDATE orderlist SET  returnNum=? ,pendingNum = ? WHERE orderId = '+'\''+url.orderId+'\'';
                var modSqlParams = [parseInt(result1[0].returnNum)+parseInt(req.body.saveNum) ,parseInt(result1[0].pendingNum)- parseInt(req.body.saveNum)];
//改

                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });

                var modSql3='UPDATE item SET itemTemNum=? WHERE itemId='+'\''+result1[0].itemId+'\''
                var modSqlParams3 = [parseInt(result1[0].itemTemNum)-req.body.saveNum];

                connection.query(modSql3,modSqlParams3,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });

                if(parseInt(req.body.saveNum)===result1[0].pendingNum){
                    var modSql2='UPDATE record SET state = ? WHERE orderId ='+'\''+url.orderId+'\'' ;
                    var modSqlParams2 = ['已处理'];

                    connection.query(modSql2,modSqlParams2,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                }
                OrderState(result1[0].itemName);
                var isFirstSQL='SELECT sum( case when noteState=\'已退回(首次检测)\' or noteState=\'已从临时仓库退回(首次检测)\' then 1 else 0 end) as returnTimes FROM storagedb.notification WHERE orderId=\''+url.orderId+'\'';
                connection.query(isFirstSQL,function (err, result2) {
                    if(err){
                        console.log('[SELECT ERROR] - ',err.message);
                        return;
                    }


                    if(result2[0].returnTimes>0){
                        addNotification('已从临时仓库退回',req.body.saveNum);
                    }else{
                        addNotification('已从临时仓库退回(首次检测)',req.body.saveNum);
                    }


                });
                var flashUrl='adOrder?orderId='+url.orderId;
                return res.redirect('flash?url='+flashUrl)
            }
        }
    });


    function addNotification(enterModel,addSqlInput) {
        var countSql='SELECT * FROM notification';
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,result0[0].itemId,url.orderId ];
                // console.log(addSqlParams)
                connection.query(addSql,addSqlParams,function (err, result) {
                    if(err){
                        console.log('[INSERT ERROR] - ',err.message);
                        return;
                    }

                });


            });
        });
    }

    function OrderState(itemName) {
        var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result) {

                var modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                var modSqlParams = ['有退回'];

//改
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });
            addNote('采购事件更新',itemName,url.orderId,'有退回')


        });
    }
});

/* GET adItemOrderEnter*/
router.get('/adItemOrderEnter', function(req, res, next) {

    var url=URL.parse(req.url,true).query;
    var orderId='无（直接进仓）';

    var sql;
    //console.log(url)
    if(url.sql===undefined){
        sql='SELECT *  ,CASE  WHEN state = \'申请中\' OR state = \'已下单\' OR state = \'有退回\' OR (state = \'已到货\' AND getNum+pendingNum != totalNum) THEN 1\n' +
            'WHEN (state = \'已到货\' AND getNum+pendingNum = totalNum) THEN 2\n' +
            'WHEN state = \'已拒绝\'  THEN 3\n' +
            'WHEN state = \'已取消\'  THEN 4\n' +
            'WHEN state = \'已完成\' THEN 5\n' +
            'END AS order_param \n' +
            'FROM orderlist,item\n' +
            'WHERE orderlist.itemId=item.itemId AND item.itemId=' +'\''+url.itemId+'\''+
            'ORDER BY  order_param,commingDate,orderDate ASC';
        //sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+'  ORDER BY orderlist.orderDate DESC';
    }else {
        sql=url.sql;
    }

    connection.query( sql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        getInfo(url,function (err,result) {
            // console.log(result)
            return  res.render('adItemOrderEnter', {
                itemList:result.item,
                itemStateList:result.itemStateList,
                orderId:orderId,
                totalNum:0,
                getNum:0,
                pendingNum:0,
                returnNum:0,
                orderList:result1,
                user:req.session.user
            });
        })

    });

});


router.post('/adItemOrderEnter', function(req, res, next) {
    var sql;
    var stateJudge=req.body.state;
    var url=URL.parse(req.url,true).query;
    let indexOf =  '\'\%%' + req.body.indexOf + '%\'';

    switch (stateJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+' AND orderlist.state=\'已下单\' ORDER BY orderlist.orderDate DESC'; break;
        case '2':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'申请中\' ORDER BY orderlist.orderDate DESC'; break;
        case '3':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'已拒绝\' ORDER BY orderlist.orderDate DESC'; break;
        case '4':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'已到货\' ORDER BY orderlist.orderDate DESC'; break;
        case '5':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'有退回\' ORDER BY orderlist.orderDate DESC'; break;
        case '6':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'已完成\' ORDER BY orderlist.orderDate DESC'; break;
        case '7':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'已取消\' ORDER BY orderlist.orderDate DESC'; break;

    }


    //console.log(indexOf);

    if(req.body.indexOfButton){

        sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+' AND (orderlist.orderId Like' +indexOf+' OR item.itemName Like '+indexOf+' OR item.itemId Like '+indexOf+' OR orderlist.applyNote Like '+indexOf+' OR orderlist.replyNote Like '+indexOf+')';
    }
    switch (req.body.order) {
        case '0':sql=undefined;break
        case '1':sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+' ORDER BY orderlist.orderDate DESC';break
    }


    //console.log(sql);


    var returnURL = '/adItemOrderEnter?' +sql+'&itemId='+url.itemId;
    res.redirect(returnURL)
});

/* GET adItemOrder*/
router.get('/adItemOrder', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var orderId='无（直接进仓）';
    getInfo(url,function (err,result) {
        // console.log(result)
        return  res.render('adItemOrder', {
            itemList:result.item,
            itemStateList:result.itemStateList,
            orderId:orderId,
            totalNum:0,
            getNum:0,
            pendingNum:0,
            returnNum:0,
            user:req.session.user
        });
    });

});



router.post('/adItemOrder', function(req, res, next) {
    //增
    var url=URL.parse(req.url,true).query;
    var  saveDate= new Date();
    var year= saveDate.getFullYear();
    var month=saveDate.getMonth()+1;
    var day=saveDate.getDate();
    var hour=saveDate.getHours();
    var min=saveDate.getMinutes();
    var sec=saveDate.getSeconds();
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    var checkSql='SELECT orderId FROM orderlist WHERE orderId LIKE '+'\'\%%'+year.toString()+month.toString() +day.toString()+'%\'';

    connection.query( checkSql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        var addId;
       // console.log(result1)
        if(result1.length===0){
            addId=1;
        }else {
            addId=result1.length+1;
        }
        var prefixId;
        var orderId;
        if(addId<10){
            prefixId='00';
            orderId=year.toString()+month.toString() +day.toString()+prefixId+addId;
        }else if(addId<100&&addId>=10){
            prefixId='0';
            orderId=year.toString()+month.toString() +day.toString()+prefixId+addId;
        }else{
            orderId=year.toString()+month.toString() +day.toString()+addId;
        }
        //console.log(orderId)

        var  addSql = 'INSERT INTO orderlist(orderId,state,applyDate,orderDate,commingDate,itemId,applyNote,replyNote,applier,totalNum,getNum,pendingNum,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var  addSqlParams = [orderId,'申请中',dateOutput,dateOutput,req.body.commingDate,url.itemId,req.body.applyNote,'',req.body.applier,req.body.num,0,0,0];
        connection.query(addSql,addSqlParams,function (err, result) {
            if(err){
                console.log('[INSERT ERROR] - ',err.message);
                return;
            }

            var countSql='SELECT * FROM notification';
            var checksql='SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';
            connection.query( checksql,function (err, result0) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                connection.query( countSql,function (err, result2) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                    }

                    var  addSql1 = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                    var  addSqlParams1 = [dateOutput, '采购事件更新','申请中',req.body.num,url.itemId,orderId ];
                    //console.log(addSqlParams)
                    connection.query(addSql1,addSqlParams1,function (err, result) {
                        if(err){
                            console.log('[INSERT ERROR] - ',err.message);
                            return;
                        }
                    });

                    if(result0[0].hasOrder===0){
                        addNote('物料事件更新',result0[0].itemName,result0[0].itemId,'有订单未处理')
                    }

                    addNote('采购事件更新',result0[0].itemName,orderId,'申请中')
                    ChangeState(true,'hasOrder',1,url);



                });
            });
        });

        return res.redirect('adItemOrderEnter?itemId='+url.itemId);



    });




});


/* GET flash*/
router.get('/flash', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    res.render('flash', {
        url:url.url
    });
});



router.get('/adUser', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  sql = 'SELECT * FROM user WHERE userId='+'\''+url.userId+'\''; //select id,name From websites=rowDataPacket{id,name}
    connection.query(sql,function (err, result) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            return;
        }


        res.render('adUser', {
            userList:result,
            user:req.session.user

        });
    });
});


router.post('/adUser', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  updateSql = 'UPDATE user SET role=? , post=? , contact=? , state=? WHERE userId = \''+url.userId+'\''; //select id,name From websites=rowDataPacket{id,name}
    var updateData=[req.body.updateRole,req.body.updatePost,req.body.updateContact,req.body.updateState];
    console.log(updateData)
    connection.query(updateSql,updateData,function (err, result) {
        if(err){
            console.log('[UPDATE ERROR] - ',err.message);
            return;
        }

    });
    var flashUrl='adUser?userId='+url.userId;
    res.redirect(flashUrl)
});







/* GET adItemSupplierCheck
router.get('/adItemSupplierCheck', function(req, res, next) {
    var url=URL.parse(req.url,true).query;


    var sql;
    //console.log(url)
    if(url.sql===undefined){
        sql='select table1.supplier,table1.totalEnter,table1.totalExit,table1.rentingNum,table1.totalPenNum,table2.returnNum,table2.DATEDIFF,table3.totalOrderNum,table3.orderTimes\n' +
            'from (select  supplier, \n' +
            'sum(case when record.type=\'进仓\' then num else 0 end) as totalEnter,\n' +
            'sum(case when record.type=\'出仓\' AND  state=\'null\' then num else 0 end) as totalExit,\n' +
            'sum(case when record.type=\'出仓\' AND state=\'未处理\' then num else 0 end) as rentingNum,\n' +
            'sum(case when record.type=\'临时进仓\' AND state=\'未处理\' then num else 0 end) as totalPenNum\t\n' +
            'from storagedb.record WHERE record.itemId=\''+url.itemId+'\'\n' +
            'group by supplier ) as table1\n' +
            'left join (SELECT orderList.supplier,\n' +
            'sum(CASE WHEN orderList.state=\'已完成\' AND (notification.noteState=\'已退回(首次检测)\' or notification.noteState=\'已从临时仓库退回(首次检测)\')  then notification.noteContent else 0 end ) as returnNum,\n' +
            'sum(case when notification.notestate=\'已完成\' AND DATEDIFF(orderList.arriveDate,orderList.commingDate)>0 then 1 else 0 end) AS DATEDIFF\n' +
            'FROM storagedb.notification,storagedb.orderList \n' +
            'WHERE notification.orderId=orderList.orderId AND orderList.itemId=\''+url.itemId+'\'\n' +
            'group by orderList.supplier ) as table2\n' +
            'on table1.supplier=table2.supplier\n' +
            'left join (SELECT supplier, sum(case when state=\'已完成\' then totalNum else 0 end) as totalOrderNum,sum(case when state=\'已完成\' AND itemId=\''+url.itemId+'\' then 1 else 0 end) as orderTimes \n' +
            'FROM storagedb.orderlist WHERE itemId=\''+url.itemId+'\'\n' +
            'group by supplier) AS table3\n' +
            'on table2.supplier=table3.supplier\n'+
            'order by CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC';
        //sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+'  ORDER BY orderlist.orderDate DESC';
    }else {
        sql=url.sql;
    }

    connection.query( sql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        getInfo(url,function (err,result) {
            // console.log(result)
            return  res.render('adItemSupplierCheck', {
                itemList:result.item,
                itemStateList:result.itemStateList,
                supplierList:result1,
                user:req.session.user
            });
        })

    });
});


router.post('/adItemSupplierCheck', function(req, res, next) {
    var sql;
    var stateJudge=req.body.state;
    var url=URL.parse(req.url,true).query;
    var originalSql='sql=select table1.supplier,table1.totalEnter,table1.totalExit,table1.rentingNum,table1.totalPenNum,table2.returnNum,table2.DATEDIFF,table3.totalOrderNum,table3.orderTimes\n' +
        'from (select  supplier, \n' +
        'sum(case when record.type=\'进仓\' then num else 0 end) as totalEnter,\n' +
        'sum(case when record.type=\'出仓\' AND  state=\'null\' then num else 0 end) as totalExit,\n' +
        'sum(case when record.type=\'出仓\' AND state=\'未处理\' then num else 0 end) as rentingNum,\n' +
        'sum(case when record.type=\'临时进仓\' AND state=\'未处理\' then num else 0 end) as totalPenNum\t\n' +
        'from storagedb.record WHERE record.itemId=\''+url.itemId+'\'\n' +
        'group by supplier ) as table1\n' +
        'left join (SELECT orderList.supplier,\n' +
        'sum(CASE WHEN orderList.state=\'已完成\' AND (notification.noteState=\'已退回(首次检测)\' or notification.noteState=\'已从临时仓库退回(首次检测)\')  then notification.noteContent else 0 end ) as returnNum,\n' +
        'sum(case when notification.notestate=\'已完成\' AND DATEDIFF(orderList.arriveDate,orderList.commingDate)>0 then 1 else 0 end) AS DATEDIFF\n' +
        'FROM storagedb.notification,storagedb.orderList \n' +
        'WHERE notification.orderId=orderList.orderId AND orderList.itemId=\''+url.itemId+'\'\n' +
        'group by orderList.supplier ) as table2\n' +
        'on table1.supplier=table2.supplier\n' +
        'left join (SELECT supplier, sum(case when state=\'已完成\' then totalNum else 0 end) as totalOrderNum,sum(case when state=\'已完成\' AND itemId=\''+url.itemId+'\' then 1 else 0 end) as orderTimes \n' +
        'FROM storagedb.orderlist WHERE itemId=\''+url.itemId+'\'\n' +
        'group by supplier) AS table3\n' +
        'on table2.supplier=table3.supplier\n'
    switch (stateJudge) {
        case '0':  sql=originalSql+'order by CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;
        case '1':  sql=originalSql+'order by table1.totalEnter DESC, CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;
        case '2':  sql=originalSql+'order by table1.totalExit DESC, CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;
        case '3':  sql=originalSql+'order by table2.returnNum DESC, CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;
        case '4':  sql=originalSql+'order by table2.DATEDIFF DESC, CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;

    }


    //console.log(sql);


    var returnURL = '/adItemSupplierCheck?' +sql+'&itemId='+url.itemId;
    res.redirect(returnURL)
});
*/





module.exports = router;
