# homebridge-iotas-lock
IOTAS Home plugin for the [Homebridge](https://github.com/nfarina/homebridge) project.

## Currently supports
- Lock

# Installation
1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-iotas-lock`
3. Update your configuration file. See the sample below.

# Configuration
Configuration sample:

 ```javascript
    "accessories": [
        {
            "accessory": "IotasLock",
            "iotasUrl": "https://api.iotashome.com/api/v1",
            "name": "Front door lock",
            "featureId": "1234",
            "username": "YOUR IOTAS USERNAME",
            "password": "YOUR IOTAS PASSWORD"
        }
    ]
```

# License
See LICENSE file
