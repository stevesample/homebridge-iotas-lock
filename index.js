const axios = require('axios');
const jwt_decode = require('jwt-decode');

var Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-iotas-lock", "IotasLock", iotasLock);
};

iotasLock.prototype = {

  getServices: function () {
    console.log('getServices');
    const self = this;
    
    let informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "IOTAS")
      .setCharacteristic(Characteristic.Model, "lock")
      .setCharacteristic(Characteristic.SerialNumber, "123-456-777");
 
    let lockService = new Service.LockMechanism(self.accessoryName);
    lockService
      .getCharacteristic(Characteristic.LockCurrentState)
        .on('get', this.getLockCurrentStateCharacteristic.bind(this))

    lockService
      .getCharacteristic(Characteristic.LockTargetState)
        .on('set', this.setLockTargetStateCharacteristic.bind(this));
 
    this.informationService = informationService;
    this.lockService = lockService;

    console.log('authing');

    authenticate(self.iotasUrl, self.username, self.password).then((response) => {
      console.log('setting auth token');
      this.token = response.jwt;
      this.refreshToken = response.refresh;
    }).catch((error) => {
      console.error('error authenticating');
    });

    return [informationService, lockService];
  },

  getLockCurrentStateCharacteristic: function (next) {
    const self = this;
    console.log("request to query state");

    checkToken(self.iotasUrl, self.token, self.refreshToken, self.username).then((token) => {
      self.token = token; // update token incase it was refreshed
      getFeature(self.iotasUrl, token, self.featureId).then((res) => {
        let value = res.value; // 0 unlocked, 1 locked, 2 jammed, 3 unknown
        console.log('returning a value of: ' + value + ' for feature state');
        self.lockService.updateCharacteristic(Characteristic.LockCurrentState, value);
        self.lockService.updateCharacteristic(Characteristic.LockTargetState, value);
        return next(null, value);
      }).catch((err) => {
        self.log('error turning on');
        self.log(err);
        return next(err);
      });
    }).catch((error) => {
      console.log('could not refresh access token');
    })
  },
   
  setLockTargetStateCharacteristic: function (value, next) {
    const self = this;
    self.log('setting lock value to: ' + value);
    checkToken(self.iotasUrl, self.token, self.refreshToken, self.username).then((token) => {
      self.token = token; //update token incase it was refreshed
      updateFeature(self.iotasUrl, token, value, self.featureId).then((res) => {
        self.lockService.updateCharacteristic(Characteristic.LockCurrentState, value);
        self.lockService.updateCharacteristic(Characteristic.LockTargetState, value);
        return next(null, value);
      }).catch((err) => {
        self.log('error controlling lock');
        self.log(err);
        return next(err);
      });
    }).catch((error) => {
      console.log('could not refresh access token');
    });
    
  }
};
 
function iotasLock(log, config) {
  this.log = log;
  this.iotasUrl = config.iotasUrl;
  this.accessoryName = config.name;
  this.featureId = config.featureId;
  this.username = config.username;
  this.password = config.password;
}

function updateFeature(iotasUrl, token, value, featureId) {
  let body = {
    value: value
  }
  let config = {
    baseURL: iotasUrl,
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
  return axios.put(`/feature/${featureId}`, body, config).then((response) => {
    return response.data;
  }).catch((error) => {
    console.log('error: ' + error);
  });
}

function getFeature(iotasUrl, token, featureId) {
  return axios.get(`/feature/${featureId}`, {
    baseURL: iotasUrl,
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then((response) => {
    console.log('successful get of feature state');
    return response.data;
  }).catch((error) => {
    console.log('error');
    console.log(error);
  });
}

function authenticate(iotasUrl, username, password) {
  let config = {
    baseURL: iotasUrl,
    auth: {
      username: username,
      password: password
    }
  }
  return axios.post(`/auth/tokenwithrefresh`, {}, config).then((response) => {
    return response.data;
  }).catch((error) => {
    console.log('error: ');
    console.log(error);
  });
}

function checkToken(iotasUrl, token, refreshToken, email) {
  let decoded = jwt_decode(token);
  let oneMinuteFromNow = (Date.now() + 1000*60) / 1000;
  if(decoded.exp < oneMinuteFromNow) {
    return refreshAccessToken(iotasUrl, refreshToken, email);
  } else {
    return Promise.resolve(token);
  }
}

function refreshAccessToken(iotasUrl, refreshToken, email) {
  let config = {
    baseURL: iotasUrl,
  }

  let body = {
    refresh: refreshToken,
    email: email
  }
  return axios.post(`/auth/refresh`, body, config).then((response) => {
    return response.data;
  }).catch((error) => {
    console.log('error: ');
    console.log(error);
  });
}
