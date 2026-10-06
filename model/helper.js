require("dotenv").config();
// mysql2 supports the caching_sha2_password login used by MySQL 8+ (the old `mysql` package does not)
const mysql = require("mysql2");

module.exports = async function db(query, params = []) {
  const results = {
    data: [],
    error: null
  };
  let promise = await new Promise((resolve, reject) => {
    const DB_HOST = process.env.DB_HOST;
    const DB_USER = process.env.DB_USER;
    const DB_PASS = process.env.DB_PASS;
    const DB_NAME = process.env.DB_NAME;

    const con = mysql.createConnection({
      host: DB_HOST || "127.0.0.1",
      user: DB_USER || "root",
      password: DB_PASS,
      database: DB_NAME || "mvp",
      multipleStatements: true
    });

    con.connect(function(err) {
      // reject instead of throwing so a DB problem returns a 500 rather than crashing the server
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      console.log("Connected!");

      con.query(query, params, function(err, result) {
        if (err) {
          results.error = err;
          console.log(err);
          reject(err);
          con.end();
          return;
        }

        if (Array.isArray(result)) {
          // SELECT: push each row to data
          result.forEach(row => results.data.push(row));
        } else if (result.affectedRows === 0) {
          results.error = "Action not complete";
          reject(results.error);
          con.end();
          return;
        }

        con.end();
        resolve(results);
      });
    });
  });

  return promise;
};
