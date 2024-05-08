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
    const input = await client.submitContractInput(
        `START;${benchmarkId};${nodeUrls}`
    );
    const submissionResult = await input.submissionStatus;
    if (submissionResult.status === "accepted") {
        console.log("Waiting for benchmark results ...");
        // Subscribe to SHUTDOWN event for graceful app shutdown
        await new Promise((resolve) => {
            eventEmitter.once("SHUTDOWN", resolve);
        });
    } else {
        console.log(
            "The smart contract did not accept the request. Shutting down..."
        );
    }

    // Close HotPocket connection.
    await client.close();
}

// use "npm start" for local development with default 3-node hpdevkit cluster
// use node app.js 'wss://some.evernode.host:port' for mainnet use
clientApp(process.argv[2]);
