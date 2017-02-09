/*
* IoT Hub Raspberry Pi NodeJS - Microsoft Sample Code - Copyright (c) 2016 - Licensed MIT
*/
'use strict';

var fs = require('fs');
var path = require('path');
var wpi = require('wiring-pi');

// Use MQTT protocol to communicate with IoT hub
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Protocol = require('azure-iot-device-mqtt').Mqtt;

// GPIO pin of the LED
var CONFIG_PIN = 7;

// Prepare for GPIO operations
wpi.setup('wpi');
wpi.pinMode(CONFIG_PIN, wpi.OUTPUT);


// Read device connection string from command line arguments and parse it
var connectionStringParam = process.argv[2];
var connectionString = ConnectionString.parse(connectionStringParam);
var deviceId = connectionString.DeviceId;

// fromConnectionString must specify a transport constructor, coming from any transport package.
var client = Client.fromConnectionString(connectionStringParam, Protocol);

// Configure the client to use X509 authentication if required by the connection string.
if (connectionString.x509) {
  // Read X.509 certificate and private key.
  // These files should be in the current folder and use the following naming convention:
  // [device name]-cert.pem and [device name]-key.pem, example: myraspberrypi-cert.pem
  var options = {
    cert: fs.readFileSync(path.join(__dirname, deviceId + '-cert.pem')).toString(),
    key: fs.readFileSync(path.join(__dirname, deviceId + '-key.pem')).toString()
  };

  client.setOptions(options);

  console.log('[Device] Using X.509 client certificate authentication');
}

/**
 * Blink LED.
 */
function blinkLED() {
  // Light up LED for 100 ms
  wpi.digitalWrite(CONFIG_PIN, 1);
  setTimeout(function () {
    wpi.digitalWrite(CONFIG_PIN, 0);
  }, 100);
}

var stopReceivingMessage = false;
/**
 * Log errors to console when completing messages.
 * If stopReceivingMessage flag is set, close connection to IoT Hub.
 * @param {string}  err - complete message error
 */
function completeMessageCallback(err) {
  if (err) {
    console.log('[Device] Complete message error: ' + err.toString());
  }
  if (stopReceivingMessage) {
    client.close(closeConnectionCallback);
  }
}

/**
 * Log information to console when closing connection to IoT Hub.
 * @param {string}  err - close connection error
 */
function closeConnectionCallback(err) {
  if (err) {
    console.error('[Device] Close connection error: ' + err.message + '\n');
  } else {
    console.log('[Device] Connection closed\n');
  }
}

/**
 * Process commands in received message.
 * @param {object}  msg - received message
 */
function receiveMessageCallback(msg) {
  var msgBodyString = msg.getData().toString('utf-8');
  var msgBody = JSON.parse(msgBodyString);
  console.log('[Device] Received message: ' + msgBodyString + '\n');
  switch (msgBody.command) {
    case 'stop':
      stopReceivingMessage = true;
      break;
    case 'on':
      turnOnLED();
      break;
    case 'off':
      turnOffLED();
      break;
    case 'blink':
    default:
      blinkLED();
      break;
  }
  client.complete(msg, completeMessageCallback);
}

/**
 * Start listening for cloud-to-device messages after getting connected to IoT Hub.
 * @param {string}  err - connection error
 */
function connectCallback(err) {
  if (err) {
    console.log('[Device] Could not connect: ' + err + '\n');
  } else {
    console.log('[Device] Client connected\n');
    client.on('message', receiveMessageCallback);
  }
}

// Connect to IoT Hub and send messages via the callback.
client.open(connectCallback);

function turnOnLED() {
  wpi.digitalWrite(CONFIG_PIN, 1);
}

function turnOffLED() {
  wpi.digitalWrite(CONFIG_PIN, 0);
}