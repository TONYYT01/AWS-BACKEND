const mysql=require("mysql2")
const express=require("express")
const connection=mysql.createConnection({
    host:"database-3.chgcec6outqy.us-east-2.rds.amazonaws.com",
    user:"admin",
    database:"mysql",
    password:"TONYislive01"
})

const app=express()
app.use(express.json())

connection.connect((error)=>{
    if (error) throw error
    console.log("Database connected")
})

app.listen(5000,()=>{
    console.log("server is running")
})