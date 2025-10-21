import express from 'express'
import logger from 'morgan'
import dotenv from 'dotenv'

import pkg from 'pg'
const { Client } = pkg;

import { Server } from 'socket.io'
import { createServer } from 'node:http'
import { url } from 'node:inspector';

dotenv.config()
const port = process.env.PORT ?? 3000

const db = new Client({
    connectionString: "postgresql://neondb_owner:npg_OU08uRhEfBtd@ep-small-water-ae0ytnxt-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    ssl: { rejectUnauthorized: false } // necesario para Neon
});

await db.connect()
const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery:{}
})


await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
    `
)


io.on('connection', (socket) => {
    console.log('user has connected')

    socket.on('disconnect', () => {
        console.log('Usser has disconnected')
    })

    socket.on('chat message', async(msg) => {
        let result 
        try {
            result = await db.query(
                `INSERT INTO messages (content) VALUES ($1) RETURNING *`,
                [msg]
            )
            
            const insertedMessage = result.rows[0]
            io.emit('chat message', msg, insertedMessage.id.toString())
        } catch (e){
            console.error('Error saving message:', e)
        }
    })
})

app.use(logger('dev'))

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(port, () => {
    console.log(`Server running on port ${port}`)
})