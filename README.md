# Crash Gambling Simulator 

A simulation of the popular online casino game "crash" with accurate casino odds. 

![showcase](https://i.imgur.com/bpXV3zI.png)Demo Link - [Here](https://poetic-mooncake-6b40f0.netlify.app/)

## Created With

* Node.js
* Express.js
* React.js
* Socket.io
* MongoDB


### Setup and Run Client 

    // Navigate to client directory 
    $ cd ./client
    
    // install packages
    $ npm i 
    
    // start client (localhost:3000)
    $ npm start
    
    // For running in production
    $ npm run build
    $ npm start

### Setup and Run Server

    // Navigate to server directory 
    $ cd ./backend
    
    // install packages
    $ npm i 
    
    // install nodemon for development
    $ npm i -D nodemon
    
    // start node server (localhost:4000) and socket.io server (localhost:3001) 
    $ npm start 

### Environment Variables 
* MONGOOSE_DB_LINK - URL to MongoDB server 
* PASSPORT_SECRET -  Secret for Passport.js authorization and authentication 



