import { EventEmitter } from "@mkellsy/event-emitter";
import { connect, createSecureContext, TLSSocket } from "tls";

import { Certificate } from "../Response/Certificate";
import { Message } from "../Response/Message";
import { Logging } from "homebridge";

/**
 * Creates a connections underlying socket.
 * @private
 */
export class Socket extends EventEmitter<{
    Error: (error: Error) => void;
    Data: (data: Buffer) => void;
    Disconnect: () => void;
}> {
    private connection?: TLSSocket;

    private readonly host: string;
    private readonly port: number;
    private readonly certificate: Certificate;
    private hblog?: Logging;

    /**
     * Creates a socket.
     *
     * @param host The IP address of the device.
     * @param port The port the device listenes on.
     * @param certificate An authentication certificate.
     */
    constructor(host: string, port: number, certificate: Certificate, hblog?: Logging) {
        super();

        this.host = host;
        this.port = port;
        this.certificate = certificate;
        this.hblog = hblog;
    }

    /**
     * Establishes a connection to the device.
     *
     * @returns A connection protocol.
     */
    public connect(): Promise<string> {
        this.hblog?.warn("Socket Connecting to processor");
        return new Promise((resolve, reject) => {
            this.hblog?.warn("Establishing TLS connection");

            const attemptConnection = (retries: number, delay: number): void => {
                const connection = connect(this.port, this.host, {
                    secureContext: createSecureContext(this.certificate),
                    secureProtocol: "TLS_method",
                    rejectUnauthorized: false,
                });

                const timeoutId = setTimeout(() => {
                    this.hblog?.warn(`Connection attempt timed out after ${delay}ms`);
                    connection.destroy(new Error("Connection timed out"));
                }, delay);

                connection.once("secureConnect", (): void => {
                    clearTimeout(timeoutId);
                    this.hblog?.warn("Connection established");
                    this.connection = connection;

                    this.connection.off("error", reject);

                    this.connection.on("error", this.onSocketError);
                    this.connection.on("close", this.onSocketClose);
                    this.connection.on("data", this.onSocketData);

                    this.connection.setKeepAlive(true);

                    resolve(this.connection.getProtocol() || "Unknown");
                });

                connection.once("error", (error) => {
                    clearTimeout(timeoutId);
                    this.hblog?.warn(`Connection attempt failed: ${error.message}`);
                    if (retries > 0) {
                        this.hblog?.warn(`Retrying connection...`);
                        if (error.message === "Connection timed out") {
                            attemptConnection(retries - 1, delay * 2);
                        } else {
                            setTimeout(() =>attemptConnection(retries - 1, delay * 2), delay);
                        }                        
                    } else {
                        reject(error);
                    }
                });
            };

            attemptConnection(10, 2000); // 10 retries with initial delay of 2 second
        });
    }

    /**
     * Disconnects from a device.
     */
    public disconnect(): void {
        this.hblog?.warn("Socket Disconnecting from device");
        this.connection?.end();
        this.connection?.destroy();
    }

    /**
     * Writes a message to the connection.
     *
     * @param message A message to write.
     */
    public write(message: Message): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.connection == null) return reject(new Error("connection not established"));

            this.connection.write(`${JSON.stringify(message)}\n`, (error) => {
                if (error != null) return reject(error);

                return resolve();
            });
        });
    }

    /*
     * Listens for data from the socket.
     */
    private onSocketData = (data: Buffer): void => {
        this.emit("Data", data);
    };

    /*
     * Listenes for discrete disconects from the socket.
     */
    private onSocketClose = (): void => {
        this.hblog?.warn("Socket closing");
        this.emit("Disconnect");
    };

    /*
     * Listenes for any errors from the socket.
     */
    private onSocketError = (error: Error): void => {
        this.emit("Error", error);
    };
}
