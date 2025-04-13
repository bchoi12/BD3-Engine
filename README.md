# BD3 Engine

## Overview

BD3 Engine is a learning exercise/experiment to build a low-cost online multiplayer game with minimal barrier to entry.

The main game engine is built in Golang because I wanted to learn it, but also because it's reasonably fast and has good support for concurrency. The game engine uses a custom ECS (Entity-Component-System) framework and in-house netcode + physics engine + basic spatial indexing. Each piece is lightweight, so a single 4GB ram server (~$20/month) can run 15+ concurrent games at 62Hz each. The servers currently live on Google Cloud.

The client is built with Typescript and Three.js, which allows it to be run within any modern web browser or exported as a desktop application via tools like Electron.js. I also compiled the main game engine with WebAssembly so it could be executed within the browser to perform client-side prediction.

The netcode leverages WebRTC in addition to WebSocket to emulate a UDP-like data stream. This allows for more fast, precise gameplay.

### Status

Fully playable and able to support scheduled playtests.

Canceled in favor of exploring a [P2P approach](https://github.com/bchoi12/birdtown) as opposed to having centralized game servers. IMO, unfortunately it is extremely difficult for a small development team to manage game servers and not lose lots of money.

### Screenshots

![devlog 40](https://raw.githubusercontent.com/bchoi12/blockdudes3/master/screenshots/devlog40.png)

![devlog 43](https://raw.githubusercontent.com/bchoi12/blockdudes3/master/screenshots/devlog43.png)

![devlog 44](https://raw.githubusercontent.com/bchoi12/blockdudes3/master/screenshots/devlog44.png)

![devlog 45](https://raw.githubusercontent.com/bchoi12/blockdudes3/master/screenshots/devlog45.png)

![devlog 50](https://raw.githubusercontent.com/bchoi12/blockdudes3/master/screenshots/devlog50.png)

### Game engine features
 * built with Golang and deployed to Google Cloud
 * also compiled as a WASM binary to support client-side prediction
 * game state is serialized and compressed before being sent over network
 * custom physics engine with moderate to full support for rectangles, circles, n-gons
 * uses a basic spatial grid for fast object lookups
 * seeded pseudo-random modular level generation for unlimited variations of birdtowns

### Networking features
 * able to run many concurrent games each at 62hz tickrate with support for 10+ players per room
 * custom server-authoritative netcode using a synchronized TCP channel (websocket) and UDP-like channel (WebRTC data connection)
 * fully functional text chat and peer-to-peer voice chat for all players

### Client (browser) features
 * nearly instant load times due to small footprint (<10Mb for all assets)
 * supports all Chromium-based browsers with no additional setup required
 * custom particle system with support for instanced geometry and geometry caching
 * optimized rendering for older machines (e.g. 40 FPS on my 9 year old laptop)
 * custom framework for dynamically adding modular UI elements to the page

### Known issues
 * Firefox and Safari are not supported

## Credits

### Game Engine
 * [golang](https://go.dev/)
 * [Google Cloud](https://cloud.google.com/) and [Heroku](https://www.heroku.com/) for hosting
 * [Gorilla Websocket](https://github.com/gorilla/websocket) for reliable communication and signaling for P2P connections
 * [Pion WebRTC](https://github.com/pion/webrtc) for low latency communication
 * [vmihailenco msgpack](github.com/vmihailenco/msgpack/v5) for data compression

### Client
 * [TypeScript](https://www.typescriptlang.org/)
 * [three.js](https://threejs.org/) for 3D rendering
 * [WebAssembly](https://webassembly.org/) for client-side prediction
 * Websocket for reliable communication
 * WebRTC for low latency communication and voice chat
 * [msgpack](https://msgpack.org/) for data compression
 * [Howler](https://howlerjs.com/) for audio
 * [webpack](https://webpack.js.org/) for bundling code

 ### Others
 * [Blender](https://www.blender.org/) for art
 * [Github](https://github.com/) for version control
