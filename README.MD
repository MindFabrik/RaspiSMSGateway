# Rasberry Pi SMS Gateway
This projects allows you send to a text message (SMS) over a REST API
connection. You need a Rasberry Pi and a 3G/4G Broadband USB device
(e.g. Huawei K3765 or Vodafone Mobile Connect UMTS).

## Prepare Rasberry Pi
The communication between Reasberry Pi and the Broadband Stick will be
done via Gammu (https://wammu.eu). This project includes a Node.js
script which will receive commands via a REST API interface and execute
tasks to the Gammu engine.

Please install the following components on your Rasberry Pi:

###NodeJS and NPM
You can simple install NodeJS and NPM via the apt-get command of Rasbian:

```
sudo apt-get install nodejs npm
```

### Gammu
Unfortantaly the Rasbian repository is providing an old version of Gammu. The old 
version has some issues with some Broadband USB devices. Please download the
latest version (e.g. 1.39.0) of Gammu from https://wammu.eu/download/gammu/1.39.0.

In the next step compile and install the latest version of Gammu:
```
tar -xvf gammu.tar
cd gammu
mkdir build
cd build
cmake ..
make
make test
sudo make install
```

You must not enable the Gammu-SMSD Service. The Node.js Script will execute the 
standalone command line tool of Gammu.

Create a Gammu configuration file and modify it with your mobile provider settings:
(PIN = your mobile PIN, SMSC = SMSC Number of your provider)

```
# Configuration file for Gammu SMS Daemon
 
# Gammu library configuration, see gammurc(5)
[gammu]
port = /dev/ttyUSB0
connection = at
logformat = textall
 
# SMSD configuration, see gammu-smsdrc(5)
[smsd]
pin = 1234
service = files
logfile = /var/log/gammu-smsd
debuglevel = 4
ReceiveFrequency = 300
 
# Paths where messages are stored
inboxpath = /var/spool/gammu/inbox/
outboxpath = /var/spool/gammu/outbox/
sentsmspath = /var/spool/gammu/sent/
errorsmspath = /var/spool/gammu/error/
 
SMSC = +49
```

### Configure your Broadcast USB Device
Some Broadcast USB Devices including a USB Storage and the Broadband device. Rasbian 
is using mostly the USB Storage as a default selection (mode).

If you using the K3765 device, you can run the following command to find out the
selected mode:

```
sudo lsusb
```

If the USB Storage is selected, the output looks like so:
```
Bus 001 Device 004: ID 12d1:1520 Huawei Technologies Co., Ltd. K3765 HSPA
```
The ID 12d1:1520 is equal for the USB Storage. If the Broadband mode is enabled,
the output should looks like so:
```
Bus 001 Device 005: ID 12d1:1465 Huawei Technologies Co., Ltd.
```

To ensure that the USB device is using primary the Broadband mode, please 
modify the /lib/udev/rules.d/41-usb_modeswitch.rules file. Add the following
lines to the rule file:

```
# Huawei K3765
ATTRS{idVendor}=="12d1", ATTRS{idProduct}=="1520", RUN+="usb_modeswitch '%b/%k'"
```

In the next step you must assign the correct permissions to the device. Create 
a new file /etc/udev/rules.d/50-K3765.rules and add the following lines to it:
```
SUBSYSTEMS=="usb", ATTRS{idVendor}=="12d1", ATTRS{idProduct}=="1465", GROUP="users", MODE="0777"
```

## The NodeJS Script
Download the current project and save it in a directory (e.g. /opt/MindFabrik/SMSRestAPI)
on the Rasberry Pi.

### Download and Install NPM packages
Open the directory where the project is stored. And execute the following commands
to download and install the NPM packages:

```
sudo npm install
```

### Configure SMS Gateway
Please check the settings in the config.json file. 

JWT Settings (JWTSecureKey,JWT_Issuer, JWT_Audience ): 
The Node.js script accept only REST API calls with a valid JWT. Please configure your
JWT settings from your environment.

AllowedIPAddr is a Array (comma separated) list of IP address how are allowed to
send REST API commands to the script.

Port defines the network port of the REST API.

### Create a linux service
in the last step you can execute the Node.js script as service. Please create 
the file /lib/systemd/system/restapisms.service and add the following lines:

```
[Unit]
Description=MindFabrik SMS Node.JS REST API Service
After=network.target
 
[Service]
WorkingDirectory=/opt/MindFabrik/SMSRestAPI
ExecStart=/usr/bin/nodejs /opt/MindFabrik/SMSRestAPI/server.js
Restart=always
RestartSec=10
SyslogIdentifier=MindFabrikSMS
 
[Install]
WantedBy=multi-user.target
```

To enable and start the service, please execute following commands:

```
sudo systemctl enable restapisms
sudo service restapisms start
```

## Usage
You can simple use the REST API with following commands. Please ensure that 
all requests includes a valid JWT Token in the Header with the key x-access-token.

### Get Network Info
To validate if the REST API has access to the mobile network, you can send
the following request:

GET <IP>/api/networkinfo
HEADER x-access-token	your JWT Token

### Send text message (SMS)
To send a text message, please use the following request:

POST <IP>/api/sendsms
HEADER x-access-token	your JWT Token
HEADER Content-Type	application/json
BODY
{
"number":"00491575123456789",
"message":"Test Message",
"validity":"DAY"
}


## License
This project is licensed unter the Apache License 2.0. Please have a look into the LICENSE file.




