
//1 import libs
var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , GitHubStrategy = require('passport-github').Strategy
  , mongoose = require ("mongoose")
  , fs = require('fs')
  , stripe = require("stripe")("sk_test_j1SBAToC0RaGv5tSdeyOplNc")
  , url = require('url');
  
  
  

//2 set static vars
var GITHUB_CLIENT_ID = "04db9cc90b1ada33138d"
var GITHUB_CLIENT_SECRET = "4d2a41fbac1f27545afde5623c54ab8bc65bbecc";


//re-used vars
var Schema = mongoose.Schema;
var the_issue;
var the_user;
var return_to_payment_after_login = false;

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
});
var bountySchema = new Schema({
    amount: String,
	owner: String,
	repo: String,
    issueID: String,
    usersFunded: []
});

var PUser = mongoose.model('gitusers', userSchema);
var PBounty = mongoose.model('bounties', bountySchema);


//5 login. Save user to DB if new. 
passport.serializeUser(function(user, done) {
  done(null, user);
  
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
    callbackURL: "http://localhost:5000/auth/github/callback"
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





var app = express()
, http = require('http');

var server = http.createServer(app);

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
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
				
				//get the usersfunded array from the bounty object
				var usersFundedTemp = result[0].usersFunded;
				
				
    			  //6 create a bounty object, save by git id 
    			   var newBounty2 = new PBounty;
    			   newBounty2.amount = sum_amt;
    			   newBounty2.owner = result[0].owner;
    			   newBounty2.repo = result[0].repo;
    			   newBounty2.issueID = result[0].issue_id;
				
				   console.log('what is the length', usersFundedTemp.length);
				//iterate through the array
				for(x = 0; x < usersFundedTemp.length; x++) {
					
					//if the userID is found in the array, break the loop
					if(usersFundedTemp[x] == the_user.id) {
	 				   console.log('break happened');
						break }
					
					//if the loop is at the final element, no match has been found. Add it.
					if(x == (usersFundedTemp.length - 1)) {
						console.log('no match found');
		   			   newBounty2.usersFunded.push(the_user.id);
					}
				}
				
				
				
				
				
				console.log('Hey fuck', result[0]._id);
				console.log('Hey fuck2', result[0].id);
				
				
				//TODO delete old element 
				query.remove(function (err) {
					if(err) {
						console.log(err);
					}
				});

				
   			   //7 THEN save it to the DB
   	   		   newBounty2.save(function (err) {
   	   if (err) console.log ('Error on save!')
      });
			   
	
				
				
				
				
				// var update = {amount: sum_amt};
	// 			var options = {new: true};
	// 			PBounty.findOneAndUpdate(query, update, options, function(err, person) {
	// 			  if (err) {
	// 			    console.log('got an error');
	// 			  }
	// 		  });
				
			}
		}
			



     });
		   
		   
		   
		   
		   
		   
		   
		   
	   }
		 
    });
 });




// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
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
	  else {
	      res.redirect('/account');
	  }
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/account');
});


var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
