const HotPocket = require("hotpocket-js-client");
const { v4: uuidv4 } = require("uuid");
const EventEmitter = require("node:events");
const eventEmitter = new EventEmitter();

async function clientApp(nodeUrls) {
    const userKeyPair = await HotPocket.generateKeys();
    const benchmarkId = uuidv4();
    const client = await HotPocket.createClient(
        nodeUrls.split(","),
        userKeyPair
    );

    // Establish HotPocket connection.
    if (!(await client.connect())) {
        console.log("Connection failed.");
        return;
    }
    console.log("HotPocket Connected.\n\n");

    // Handle smart contract outputs.
    client.on(HotPocket.events.contractOutput, (result) => {
        let done = false;

        console.log("Received outputs:");
        result.outputs.forEach((o) => {
            console.log(o);
            done = o.toString().split(";")[0] === "BENCHMARKRESULTS";
        });

        if (done) {
            eventEmitter.emit("SHUTDOWN");
        }
    });

    // Send START command to HotPocket smart contract.
    await client.submitContractInput(`START;${benchmarkId};${nodeUrls}`);

    // Subscribe to SHUTDOWN event for graceful app shutdown
    await new Promise((resolve) => {
        eventEmitter.once("SHUTDOWN", resolve);
    });

    // Close HotPocket connection.
    await client.close();
}

// node app.js wss://localhost:8081
clientApp(process.argv[2]);
