// INIT
// =============================================================================
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var jwt = require('jsonwebtoken');
var config = require('./config.json');
var ip = require('ip');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = config.Port;
var appversion = "SMSRestAPI Version 005";


// ROUTES FOR SMS API
// =============================================================================
var apiRoutes = express.Router(); 
var router = express.Router();
router.get('/', function(req, res) {
    res.json({ message: 'MindFabrik ChatSMS API' });
});

var routerNetworkInfo = express.Router();
routerNetworkInfo.get('/', function(req, res) {

  var cmd = 'gammu -c /etc/gammu-smsdrc networkinfo';
  console.log('Requesting Network Information...');

  exec(cmd, function(error, stdout, stderr) {
    console.log('Requesting Network Information: Done');
    res.setHeader('Content-Type', 'application/json'); 
    res.json({ result: stdout, errormsg: stderr, errorout: error});
  });

});

var sendSMS = express.Router();
sendSMS.post('/',function(req, res) {

  console.log('Request to Send SMS received...');
  const body = req.body;
  if(!body.number) {
    res.status(500).send({ error: 'Number is not defined' });
    console.log('ERROR: Request to Send SMS received: Number is not defined. Exit.');
    return;
  }

 if(!body.message) {
    res.status(500).send({ error: 'Message is not defined' });
    console.log('ERROR: Request to Send SMS received: Message is not defined. Exit.');
    return;
  }

 if(!body.validity) {
    res.status(500).send({ error: 'Validity is not defined' });
    console.log('ERROR: Request to Send SMS received: Validity is not defined. Exit.');
    return;
  }


  var cmd = 'gammu -c /etc/gammu-smsdrc sendsms TEXT ' + body.number + ' -text \"' + body.message + '\" -validity ' + body.validity;
  console.log('Request to Send SMS: Call command:  \"' + cmd + ' \"');

  exec(cmd, function(error, stdout, stderr) {
    console.log('Request to Send SMS: Result: ' + stdout);
    res.setHeader('Content-Type', 'application/json');
    if(stdout.indexOf('OK') > -1) {
      res.status(200);
      console.log('Request to Send SMS: Done');
    }
    else {
      res.status(500);
      console.log('Request to Send SMS: FAILED');
    }

    res.json({ result: stdout, errormsg: stderr, errorout: error});
  });

});

// REGISTER MIDDLEWARE FOR JWT --------------------------------
apiRoutes.use(function(req, res, next) {

  // Check Subnet
  var remoteIp = (req.headers['x-forwarded-for'] ||
     req.connection.remoteAddress ||
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress).split(",")[0];

  console.log("Request from ip " + remoteIp);
  if (config.AllowedIPAddr.indexOf(remoteIp) < 0)
  {
    console.log("IP Address is not allowed to use the REST API.");
    return res.status(403).send({
        success: false,
        message: 'IP Address not allowed'
     });
  }

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {

    // verifies secret and checks exp
    var sToken = config.JWTSecureKey;
    jwt.verify(token,sToken, { audience: config.JWT_Audience, issuer: config.JWT_Issuer }, function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;    
        var cRoles = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        if (cRoles.indexOf("ServiceId") < 0 ) {
                console.log("User is not member of ServiceId group. Reject request.");
                return res.status(403).send({
                success: false,
                message: 'Wrong role.'
        });
      }
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });

  }
})


// REGISTER OUR ROUTES -------------------------------
app.use('/api', apiRoutes);
app.use('/api', router);
app.use('/api/networkinfo', routerNetworkInfo);
app.use('/api/sendsms', sendSMS);

app.listen(port);
console.log('--------------------------------------------------------------------');
console.log(appversion);
console.log('--------------------------------------------------------------------');
console.log('MindFabrik ChatSMS API Server is running on port ' + port);
