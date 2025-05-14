
const mysql=require('mysql2');
const db = mysql.createConnection({
    host: '192.168.241.128',
    user: 'admin',
    password: 'Admin@123#',
    database: 'flutter_app',


});

db.connect((err) =>{
    if (err) {
        console.error('error connect', err);
        return;

      }
        console.log('connect to db success');
      });

module.exports = db;
