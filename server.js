import mysql from "mysql2";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors()); // 允许所有来源的请求
const port = 3001;

// 创建数据库连接
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456789",
  database: "gp-gpmall",
  port: 3306,
});

// 连接到数据库
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack);
    return;
  }
  console.log("Connected to the database.");
});

// 定义API路由来获取表结构
app.get("/api/table-structure/:tableName", (req, res) => {
  const tableName = req.params.tableName;
  const query = `DESCRIBE ${tableName}`;
  if (!tableName) {
    res.status(400).send("Table name is required");
  }

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error executing query:", err.stack);
      res.status(500).send("Error executing query");
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(results);
  });
});


// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
