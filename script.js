let token;
let jsonBlob;
let mostRecentPost = "None";
let mostRecentPoster = "None";
let mostRecentPostOrigin = "None";
let mostRecentPostID = "None";
let cloudlink;

let username = ""
let password = ""

function connectToWebSocket() {
  cloudlink = new WebSocket("wss://server.meower.org");
  cloudlink.onmessage = onMessage;
  cloudlink.onopen = () => console.log("WebSocket connection opened.");
  cloudlink.onerror = (error) => console.error("WebSocket error:", error);
  return new Promise((resolve, reject) => {
    cloudlink.addEventListener("open", () => { resolve()
    })
  })
}

function login(username, password) {
  //console.log("log", username, password)
  const authPacket = {
    cmd: "direct",
    val: {
      cmd: "authpswd",
      val: { username: username, pswd: password }
    }
  };
  cloudlink.send(JSON.stringify(authPacket));
  return new Promise((resolve, reject) => {
    cloudlink.addEventListener("message", (event) => {
      if (JSON.parse(event.data).val == "I:100 | OK") {resolve()}
    })
  })
}

function sendMessage(message, channel) {
  console.log(message);
  let url = 'https://api.meower.org/home';
  if (channel !== 'home') {
    url = `https://api.meower.org/posts/${channel}`;
  }

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Token': token
    },
    body: JSON.stringify({
      content: message
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    console.log('Message sent successfully:', data);
  })
  .catch(error => {
    console.error('There was a problem sending the message:', error);
    console.log(error);
  });
}

function onMessage(event) {
  const packet = JSON.parse(event.data);
  handleIncomingPacket(packet); 
  console.log("Received packet:", packet.val, packet);
  if (packet.val.payload && packet.val.payload.token) { 
    token = packet.val.payload.token;
    console.log("Token:", token);
  } else {
    console.log("Token not found in the received packet.");
  }
}

function onPing(sender, channel, id, text){
  console.info(`Received message ${text} from ${sender} in ${channel} with id ${id}`);
}

function handleIncomingPacket(packet) {
  if (packet.val.t) {
    if (packet.val.u === "Discord") {
      const parts = packet.val.p.split(": ");
      if (parts.length === 2) {
        mostRecentPost = parts[1].trim();
        mostRecentPoster = parts[0].trim();
      }
    } else {
      mostRecentPost = packet.val.p;
      mostRecentPoster = packet.val.u;
    }
    mostRecentPostOrigin = packet.val.post_origin;
    mostRecentPostID = packet.val.post_id;
    if (packet.val.p.toLowerCase().includes(`@${username.toLowerCase()}`)) {
      onPing(packet.val.u, packet.val.post_origin, packet.val._id, packet.val.p);
    }
  }
}

async function run(){
  await connectToWebSocket();
  await login(username, password);
  sendMessage("Hello, world!", "home");
}

run()
