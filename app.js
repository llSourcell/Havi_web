
//1 import libs
var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , GitHubStrategy = require('passport-github').Strategy
  , mongoose = require ("mongoose")
  , fs = require('fs')
  , stripe = require("stripe")("sk_test_j1SBAToC0RaGv5tSdeyOplNc")
  , url = require('url')
  , StripeStrategy = require('passport-stripe').Strategy
  , schedule = require('node-schedule');
  
  
  
  

//2 set static vars
var GITHUB_CLIENT_ID = "04db9cc90b1ada33138d"
var GITHUB_CLIENT_SECRET = "4d2a41fbac1f27545afde5623c54ab8bc65bbecc";
var STRIPE_ID = 'ca_58TO3wfFMfPQNQiWd2mali9gTqyCFyMj';
var STRIPE_SECRET = 'sk_test_j1SBAToC0RaGv5tSdeyOplNc';


//re-used vars
var Schema = mongoose.Schema;
var the_issue;
var the_user;
var return_to_payment_after_login = false;
var return_to_claim_after_login = false;


//3 connect to DB 
var uristring =
process.env.MONGOLAB_URI ||
process.env.MONGOHQ_URL ||
'mongodb://localhost/HelloMongoose';
mongoose.connect(uristring, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + uristring);
  }
});


//4 create schemas
var userSchema = new Schema({
    userID: String,
    username: String,
	displayname: String,
	email: String, 
	stripeID: String,
});
var bountySchema = new Schema({
    amount: String,
	owner: String,
	repo: String,
    issueID: String,
    usersFunded: [],
	usersClaimed: []
});

var PUser = mongoose.model('gitusers', userSchema);
var PBounty = mongoose.model('bounties', bountySchema);


//5 login. Save user to DB if new. 
passport.serializeUser(function(user, done) {
  done(null, user);
  
  //if no stripe data, just work with github
  if(user.stripe_user_id == null) {
  console.log('fuck', user.stripe_user_id);
  query = mongoose.model('gitusers', userSchema);
  
  //1 query the database for the user.ID
   var query = PUser.find({'userID': user.id});
    query.exec(function(err, result) {
      if (!err) {
  
		  var theUser = result[0];
	  //2 if the user id is not in the DB
	  
	   if(theUser == null) {
   		   console.log("HES NOT IN THE DATABASE!!!");
   		   //3 save it to the DB
   		   var newUser = new PUser ({
   		         userID: user.id,
   		       username: user.username,
   		   	displayname: user.displayname,
   		    	  email: user.emails[0].value
   		   });
   		   newUser.save(function (err) {
   if (err) console.log ('Error on save!')});
	    }
      
  }
    }); 
	
}
//if stripe data exists
else {
	//1 add the user's stripe ID to the database
	//find the user in the db
	console.log('can we get much higher', the_user);
    var query = PUser.find({'userID': the_user.id});
	//update the stripeID field with this 
	var update = {stripeID: user.stripe_user_id};
	var options = {new: true};
	//update the user's stripe ID and save to the DB 
	PUser.findOneAndUpdate(query, update, options, function(err, person) {
	  if (err) {
	    console.log('got an error');
	  }
	});
	
	//2 add the users gitID to the usersClaimed array in the bounty object 
	console.log('you got the issue again', the_issue);
  ///get bounty from the DB
  var split = the_issue.split('/');
  var owner = split[1];
  var repo = split[2];
  var issue_id = split[4];
  var query = PBounty.find({'issueID': issue_id, 'repo': repo, 'owner': owner});
   query.exec(function(err, result) {
    if (!err) {
		
		//if the user hasn't claimed the bounty before, add his id to the array
		if(result[0].usersClaimed.indexOf(the_user.id) == -1)
		{
		    result[0].usersClaimed.push(the_user.id);
		}
		//save it
		result[0].save(function (err) {
		        if(err) {
		            console.log('ERROR', err);
		        }
		    });
		
	}
});
	
//3 schedule stripe payment to the account in 1 week
//get date one week from now
var payDate = new Date();
payDate.setDate(payDate.getDate()+7);
//schedule payment on that date
//var j = schedule.scheduleJob(payDate, function(){
	//TODO get name, card token, and email 
	// Create a Recipient
	stripe.recipients.create({
	  name: "John Doe",
	  type: "individual",
	  card: token_id,
	  email: "payee@example.com"
	}, function(err, recipient) {
	  // recipient;
	});
    //send money
	stripe.transfers.create({
	  amount: 10,
	  currency: "usd",
	  recipient: "self",
	  description: "Transfer for test@example.com"
	}, function(err, transfer) {
		console.log('err', err);
		console.log('transfer', transfer);
	  // asynchronously called
	});
	
	//});
	
}
  
});


//6 logout
passport.deserializeUser(function(obj, done) {
  done(null, obj);
  console.log("logging out")
  
  
});





// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "https://localhost:5000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


//stripe strategy
passport.use(new StripeStrategy({
        clientID: STRIPE_ID,
        clientSecret: STRIPE_SECRET,
        callbackURL: "https://localhost:5000/auth/stripe/callback"
      },
      function(accessToken, refreshToken, stripe_properties, done) {
      //  User.findOrCreate({ stripeId: stripe_properties.stripe_user_id }, function (err, user) {
           return done(null, stripe_properties);
		  console.log(accessToken, refreshToken, stripe_properties, done);
       // });
      }
    ));





var app = express()
, https = require('https');


var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};


//var server = https.createServer(app);
var port = Number(process.env.PORT || 5000);
var server = https.createServer(options, app, function(req, res) {
	
}).listen(port, function () {
	console.log("Listening on " + port);
});
// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(function (req, res, next) {

      // Website you wish to allow to connect
	  res.setHeader( "Access-Control-Allow-Origin", req.headers.origin );

      // Request methods you wish to allow
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

      // Request headers you wish to allow
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

      // Set to true if you need the website to include cookies in the requests sent
      // to the API (e.g. in case you use sessions)
      res.setHeader('Access-Control-Allow-Credentials', true);

      // Pass to next layer of middleware
      next();
  });
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

 //API for github page to display bounty
app.get('/api/bountyamount/:repo/:owner/:issueid', function(req,res) {
	 
  var query = PBounty.find({'issueID': req.params.issueid, 'repo': req.params.repo, 'owner': req.params.owner});
    query.exec(function(err, result) {	
		
	    console.log(req.params.issueid, req.params.repo, req.params.owner, 'fuck', query, 'fuck',result);
     if (!err) {
		 
 	  	res.send({amount:result[0].amount});
		
 	 }

 });
});


app.get('/', function(req, res){
  res.render('index', { user: req.user});
  
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
 
if (req.user) {
	res.redirect('/account');
	
}
else {
    res.render('login', { user: req.user });
	
}
	

});



//for claiming a bounty
app.get('/claim', function(req, res){
	
	//if the user has logged in, just show the claims page 
	if (req.user) {
		console.log('the issue 1 ', req.query.issue);
	    res.render('claim', { user: req.user });
		if(req.query.issue)
		{
		    the_issue = req.query.issue;
			
		}
		return_to_claim_after_login = false;
		the_user = req.user;
		
	
	}
	else {
		res.redirect('/login');
		console.log('the issue 2 ', req.query.issue);
	    the_issue = req.query.issue;
		return_to_claim_after_login = true;
	}
	
	

});


//for funding a bounty
app.get('/payment', function(req, res){
	
	//if the user has logged in, just show the payment page 
	if (req.user) {
		console.log('the issue 1 ', req.query.issue);
	    res.render('payment', { user: req.user });
		if(req.query.issue)
		{
		    the_issue = req.query.issue;
			
		}
		return_to_payment_after_login = false;
		the_user = req.user;
		
	
	}
	else {
		res.redirect('/login');
		console.log('the issue 2 ', req.query.issue);
	    the_issue = req.query.issue;
		return_to_payment_after_login = true;
	}
	
	

});


//1 process card payment
 app.post('/payment', function(req, res){
    //stripe
    console.log('posted')

    var stripeToken = req.body.stripeToken;
    var charge = stripe.charges.create({
      amount: 1000, // amount in cents, again
      currency: "usd",
      card: stripeToken,
      description: "payinguser@example.com"
    }, function(err, charge) {
      if (err && err.type === 'StripeCardError') {
        console.log("CARD DECLINED");
 		res.send('error card declined, go back and try again.')
      }
      else {
		  //2 if the card payment works
          console.log("CARD ACCEPTED", charge);
 		  res.send('Payment Accepted');
		  //3 create bounty object of the issue data and amount funded
		  var split = the_issue.split('/');
		  var owner = split[1];
		  var repo = split[2];
		  var issue_id = split[4];
		  var amt = charge.amount;
		  
		  ///4 check if bounty exist in DB
		  var query = PBounty.find({'issueID': issue_id, 'repo': repo, 'owner': owner});
	     query.exec(function(err, result) {
	      if (!err) {
			  console.log(issue_id, repo, owner,'fuck', query,'fuck', result);
			  var the_result = result[0];
			  
		      //5 if the bounty doesn't exist in the DB
			  if(the_result == null)
			  {
			  	
			  
			  //6 create a bounty object, save by git id 
			   var newBounty = new PBounty;
			   newBounty.amount = charge.amount;
			   newBounty.owner = owner;
			   newBounty.repo = repo;
			   newBounty.issueID = issue_id;
			   newBounty.usersFunded.push(the_user.id);
			   
			   //7 save it to the DB
	   		   newBounty.save(function (err) {
	   if (err) console.log ('Error on save!')
   });
			}
			
			
			//8 if the bounty does currently exist
			else {
				
				//9 get its amount
				local_amt = the_result.amount;
				//10 sum it with current amount
				sum_amt_pre_conv = +local_amt + +charge.amount;
				sum_amt = sum_amt_pre_conv.toString(); 
				
				//11 find and modify
				//TODO, add userID to usersfundedarray if and only if doesn't exist
				console.log('the query is', result[0]);

				//12 if the user hasn't funded the bounty before, add his id to the array
				if(result[0].usersFunded.indexOf(the_user.id) == -1)
				{
				    result[0].usersFunded.push(the_user.id);
				}
				//13 add the new amount
				result[0].amount = sum_amt;
 				    
				//14 save it
				result[0].save(function (err) {
				        if(err) {
				            console.log('ERROR', err);
				        }
				    });
				
			}
		}
			



     });
		   
		   
		   
		   
		   
		   
		   
		   
	   }
		 
    });
 });





// GET /auth/github
//   Use passport.authenticate() as route m function(req,res)iddleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHubwill redirect the user
//   back to this application at /auth/github/callback
app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
	  if(return_to_payment_after_login == true) {
	      res.redirect('/payment');
		  return_to_payment_after_login = false;
	  	
	  }
	  if(return_to_claim_after_login == true) {
	      res.redirect('/claim');
		  return_to_claim_after_login = false;
	  }
	  
	  
	  else {
	      res.redirect('/account');
		  
	  }
  });
  
  
//stripe callbacks  
app.get('/auth/stripe',
   passport.authenticate('stripe'));

app.get('/auth/stripe/callback',
    passport.authenticate('stripe', { failureRedirect: '/claim' }),
    function(req, res) {
      // Successful authentication, redirect home.
	  //TODO redirect to stripeaccount
	  console.log('stripe data', res);
	  console.log('FUCK FUCK FUCK FUCK FUCK FUCK ', req.body.stripeToken);
      res.redirect('/stripeaccount');
});
	

app.get('/stripeaccount', ensureAuthenticated, function(req, res){
  res.render('stripeaccount', { user: req.user });
});
	
	

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/account');
});


// var port = Number(process.env.PORT || 5000);
// app.listen(port, function() {
//   console.log("Listening on " + port);
// });


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
