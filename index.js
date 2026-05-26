require("dotenv").config()
const mysql=require("mysql2")
const express=require("express")
const connection=mysql.createConnection({
    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    database:process.env.DB_NAME,
    password:process.env.DB_PASSWORD
})

const app=express()
app.use(express.json())

connection.connect((error)=>{
    if (error) throw error
    console.log("Database connected")
})

app.get("/",(req,res)=>{
    res.send("Backend Running Successfully")
})

app.listen(5000,"0.0.0.0",()=>{
    console.log("server is running")
})