
//1 import libs
var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , GitHubStrategy = require('passport-github').Strategy
  , mongoose = require ("mongoose")
  , fs = require('fs')
  , stripe = require("stripe")("sk_test_j1SBAToC0RaGv5tSdeyOplNc")
  , url = require('url')
  , nodemailer = require('nodemailer')
  , uuid = require('node-uuid')
  , Agenda = require("Agenda")
  , timestamps = require('mongoose-timestamp');

	
	
  
  

//2 set static vars
var GITHUB_CLIENT_ID = "04db9cc90b1ada33138d"
var GITHUB_CLIENT_SECRET = "4d2a41fbac1f27545afde5623c54ab8bc65bbecc";
var STRIPE_ID = 'ca_58TO3wfFMfPQNQiWd2mali9gTqyCFyMj';
var STRIPE_SECRET = 'sk_test_j1SBAToC0RaGv5tSdeyOplNc';


//re-used vars
var Schema = mongoose.Schema;
var the_issue;
var the_user;
var bountyIDforreject;
var scheduleIDforreject;
var jobforReject;
var return_to_payment_after_login = false;
var return_to_claim_after_login = false;
var return_to_reject_after_login = false;
var email_user;




//3 connect to DB 
var uristring =
process.env.MONGOLAB_URI ||
process.env.MONGOHQ_URL ||
'mongodb://localhost/HelloMongoose';
mongoose.connect(uristring, function (err, res) {
  if (err) {
 // console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
   console.log ('Succeeded connected to: ' + uristring);   
  
  }
});

//create agenda
var agenda = new Agenda({db: { address: uristring}});



//setup email transporter
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'sirajraval1@gmail.com',
        pass: 'godfuck24'
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
    usersFunded: [],
	usersClaimed: []
});

var historySchema = new Schema({
	userID: String,
	amount: String,
	claimedorfunded: String,
	issueLink: String,
	time: Date	
});

userSchema.plugin(timestamps);
bountySchema.plugin(timestamps);


var PUser = mongoose.model('gitusers', userSchema);
var PBounty = mongoose.model('bounties', bountySchema);
var PHistory = mongoose.model('history', historySchema);



//5 login. Save user to DB if new. 
passport.serializeUser(function(user, done) {
  done(null, user);
  
  console.log('passport came first');
  //user for account custome mail submit purposes
  email_user = user;
  //if no stripe data, just work with github
  if(user.stripe_user_id == null) {
//  console.log('fuck', user.stripe_user_id);
  query = mongoose.model('gitusers', userSchema);
  
  //1 query the database for the user.ID
   var query = PUser.find({'userID': user.id});
    query.exec(function(err, result) {
      if (!err) {
  
		  var theUser = result[0];
	  //2 if the user id is not in the DB
	  
	   if(theUser == null) {
  // 		   console.log("HES NOT IN THE DATABASE!!!");
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
     if (!err && result[0] != null) {
		 
 	  	res.send({amount:result[0].amount});
		
 	 }
	 else {
	 	res.send({amount:'0'})
	 }

 });
});



 //API for github page to display all bounties
app.get('/api/bounties', function(req,res) {
	 
  var query = PBounty.find({});
    query.exec(function(err, result) {		
     if (!err)
	 {
 	  	res.send({bounties:result});
 	 }
 });
});


app.get('/', function(req, res){
  res.render('index', { user: req.user});
  
});

app.get('/account', ensureAuthenticated, function(req, res){
	
	console.log('the user', req.user.id);
	
	var objectArray = [];
	
	var query = PHistory.find({ userID: req.user.id });
    query.exec(function(err, allResults) {	
		console.log('the resultssss', allResults);
     res.render('account', { user: req.user, issueHistory: allResults });
		
		
	});

	
});

app.get('/inputemail', function(req, res){
  res.render('inputemail', { isValid: true});
  
});

app.post('/inputemail', function(req, res){
  
  //get email inputted
	var email = req.body.customemail; 
	 
	 //if email exists 
	if(validateEmail(email))
	{
		
	
  var query = PUser.find({'userID': email_user.id });
   query.exec(function(err, result) {
    if (!err) {
		//make email user submitted email
		result[0].email = email;
		//14 save it
		result[0].save(function (err) {
		        if(err) {
		            console.log('ERROR', err);
		        }
				else{
					console.log('made new email');
					//then redirect to account
					res.redirect('/account');
				}
		    });
			
		}	
		
	
	});

}
else {
	
	res.render('inputemail', { isValid: false});
}
	
  
});

function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}


app.get('/login', function(req, res){
	
	  console.log('at login');


if (req.user) {
  //TODO if user has no email, get user input then save
	
	

		res.redirect('/account');

	  console.log('user data', req.user);
	
	
}
else {
	  console.log('hahaha3');
    res.render('login', { user: req.user });
	
}
	

});

app.post('/claim', function(req, res) {
	
	
	var token_id = req.body.stripeToken;
	var legal_name = req.body.legalName;
	
	console.log('finally bitch', token_id, legal_name);
	
 	//2 add the users gitID to the usersClaimed array in the bounty object
		console.log('you got the issue again', the_issue);
	  //get bounty from the DB
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
					if(!err) {
						console.log('successful save');
						console.log('the user', the_user.emails[0].value);
						//get array of emails of users who funded the bounty
						console.log('here is the parameter', result[0].usersFunded);
						var query = PUser.find({'userID': {$in:result[0].usersFunded}});
						query.exec(function(err, users_result) {
						    if (!err) {
						    console.log('all user objects with the arrays IDs', users_result);
							//create a temp email array
							var tempEmails = new Array(); 
							for(x = 0; x < users_result.length; x++) 
								{
								    tempEmails.push(users_result[x].email);
								}
								
								console.log('these are the emails', tempEmails);
								//generate schedule ID 
								
								var scheduleID = uuid.v1();

								//create email
								var tempUrl = '"' + 'https://localhost:5000/rejectbounty' + '?bountyID=' + result[0]._id + '&scheduleID=' + scheduleID + '"';
		   						var mailOptions = {
		   						    from: 'Fred Foo ✔ <foo@blurdybloop.com>', // sender address
		   						    to: tempEmails, // list of receivers
		   						    subject: 'A bounty you funded was claimed!', // Subject line
		   						    text: 'bounty', // plaintext body
		   						    html: '<b>If you would like to reject this bounty please visit this link <a href=' + tempUrl + '>Reject</a></b>' // html body
		   						};
							   						// send mail with defined transport object
							   					transporter.sendMail(mailOptions, function(error, info){
							   						    if(error){
							   						        console.log(error);
							   						    }else{
							   						        console.log('Message sent: ' + info.response);
							   								//if the emails were sent
							   								//schedule payment on that date
															
															
															//add the claim to history
											 			   var newHistory = new PHistory;
											 			   newHistory.userID = the_user.id;
											 			   newHistory.amount = result[0].amount;
														   newHistory.claimedorfunded = 'claimed';
														   newHistory.issueLink = 'https://github.com/' + owner + '/' + repo + '/' + 'issues/' + issue_id;
			   										       newHistory.time = new Date();
											 			   //7 save it to the DB
											 	   		   newHistory.save(function (err) {
											 	   if (err) {
													   console.log ('Error on save!');
												   }
											   
															
															
														    //define agenda w/ name being bounty ID in DB
															//var bountyIDstring = String(result[0]._id);
															agenda.define(scheduleID, function(job, done) {
																
															
																if(result[0].amount === '0'){ 
																
																  console.log("payment can't happen, no bounty")
																}
																else {																	
																	
								   									// Create a Recipient
								   									console.log('the data is', legal_name, token_id, the_user.emails[0].value);
								   									stripe.recipients.create({
								   									  name: legal_name,
								   									  type: "individual",
								   									  card: token_id,
								   									  email: the_user.emails[0].value
								   									}, function(err, recipient) {
								   										if(err)  {
								   											console.log('err creating recipient');
								   										}
								   									    //send transfer
								   										stripe.transfers.create({
								   										  amount: result[0].amount,
								   										  currency: "usd",
								   										  recipient: recipient.id,
								   										  statement_description: "Transfer for test@example.com"
								   										}, function(err, transfer) {
								   											if(err) {
								   											console.log('err', err);
								   										}
																		
																		//make amount = 0
																		result[0].amount = '0';
																		//14 save it
																		result[0].save(function (err) {
																		        if(err) {
																		            console.log('ERROR', err);
																		        }
																				else{
																					console.log('made amount 0');
																				}
																		    });
																		
																		//send email bounty you claimed was accepted
																	    var githublink = 'https://github.com/';
																	    var mailOptions = {
																	      from: 'Fred Foo ✔ <foo@blurdybloop.com>', // sender address
																	      to: the_user.emails[0].value, // list of receivers
																	      subject: 'the bounty you claimed was accepted!', // Subject line
																	      text: 'bounty', // plaintext body
																	      html: '<b>If you would like to see this bounty click here <a href=' + githublink + split[1] + '/' + split[2] + '/' + split[3] + '/' + split[4] + '>Bounty</a></b>' // html body
																	  };
																	   						// send mail with defined transport object
																	   					transporter.sendMail(mailOptions, function(error, info){
																	   						    if(error){
																	   						        console.log(error);
																	  							}
																	  						});

																		
																		
								   											console.log('transfer', transfer);
								   										  // asynchronously called
								   										});
								   									});
																}
															    done();
																
															});
															//schedule agenda
															agenda.schedule('in 50 seconds', scheduleID);
															//start agenda
															agenda.start();
														});		
							
							   						    }
							   						});
								
						
						    }
						});
						
					}
			    });

		}
	});
	
	
	
	
	
	res.redirect('claimaccepted');
});

//after claim accepted
app.get('/claimaccepted', function(req, res){
	
	  var split = the_issue.split('/');
	
    //send email 
    var githublink = 'https://github.com/';
    console.log('and the email', the_user.emails[0].value);
    var mailOptions = {
      from: 'Fred Foo ✔ <foo@blurdybloop.com>', // sender address
      to: the_user.emails[0].value, // list of receivers
      subject: 'You claimed a bounty!', // Subject line
      text: 'bounty', // plaintext body
      html: '<b>If you would like to see this bounty click here <a href=' + githublink + split[1] + '/' + split[2] + '/' + split[3] + '/' + split[4] + '>Bounty</a></b>' // html body
  };
   						// send mail with defined transport object
   					transporter.sendMail(mailOptions, function(error, info){
   						    if(error){
   						        console.log(error);
  							}
  						});
	
	res.render('claimaccepted');
});



//
//for claiming a bounty
app.get('/claim', function(req, res){
	
	//if the user has logged in, just show the claims page
	if (req.user) {

		if(req.query.issue)
		{
		    the_issue = req.query.issue;

		}
		
  	  var split = the_issue.split('/');
  	  var owner = split[1];
  	  var repo = split[2];
  	  var issue_id = split[4];

    	  var query = PBounty.find({'issueID': issue_id, 'repo': repo, 'owner': owner});
    	   query.exec(function(err, result) {
    	    if (!err) {
				
				
				var amt;
				if(result[0] != null) {
					console.log('the bounty exists')
					amt = parseInt(result[0].amount);
					
					if (amt != 0) {
					    res.render('claim', { user: req.user });
						return_to_claim_after_login = false;
					} 
				
					if (amt === 0) {
					    res.render('zerotoclaim', { user: req.user });
					}
				}
				
				else 
				{
				    res.render('zerotoclaim', { user: req.user });
				}

				
			
				}			
				the_user = req.user;	
				console.log('yay this was called', the_user);
  		});
		
	}
	
	else {
		res.redirect('/login');
		//console.log('the issue 2 ', req.query.issue);
	    the_issue = req.query.issue;
		return_to_claim_after_login = true;
	}



});
app.post('/rejectbounty', function(req, res){
	
	//render the reject accepted
	res.render('rejectaccepted');
   //got dispute
	console.log('got dispute text', req.body.dispute);
   //got the user data
	console.log('the user', the_user);
   //got the bounty data
	console.log('got bountyid', bountyIDforreject);
	//got the schedule ID
	console.log('got scheduleid', scheduleIDforreject);

    //cancel agenda
	agenda.cancel({name: scheduleIDforreject}, function(err, numRemoved) {
		
		if(err) {
			console.log('canceling didnt work');
		}
		console.log('num removed', numRemoved);
		console.log("job was canceled");
	});
	
	console.log('the user is ', the_user);
   //email me the data
	var allData = '<b>' + 'dispute ' + req.body.dispute + 'users profile  ' + the_user.profileUrl + ' bountyID ' + bountyIDforreject + '</b>';
	var mailOptions = {
	    from: 'Fred Foo ✔ <foo@blurdybloop.com>', // sender address
	    to: 'sirajraval1@gmail.com', // list of receivers
	    subject: 'someone disputed a bounty', // Subject line
	    text: 'Bounty dispute', // plaintext body
	    html: allData // html body
	};
	transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	        console.log(error);
	    }else{
	        console.log('Message sent: ' + info.response);
	    }
	});
	
	
});

app.get('/rejectbounty', function(req, res){
	//if the user has logged in, just show the payment page 
	if (req.user) {
	    res.render('rejectbounty', { user: req.user });
		return_to_reject_after_login = false;
		the_user = req.user;

		console.log('bountyID:', req.query.bountyID);		
		bountyIDforreject = req.query.bountyID;
		scheduleIDforreject = req.query.scheduleID;

	}
	else {
		res.redirect('/login');
		return_to_reject_after_login = true;
	}
    
});


//for funding a bounty
app.get('/payment', function(req, res){
	
	//if the user has logged in, just show the payment page 
	if (req.user) {
	//	console.log('the issue 1 ', req.query.issue);
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
	//	console.log('the issue 2 ', req.query.issue);
	    the_issue = req.query.issue;
		return_to_payment_after_login = true;
	}
	
	

});


//1 process card payment
 app.post('/payment', function(req, res){
    //stripe
    console.log('posted')
 	var customAmount = parseInt(req.body.customamount) * 100;
    console.log('custom amount', customAmount);
	

    var stripeToken = req.body.stripeToken;
    var charge = stripe.charges.create({
      amount: customAmount, // amount in cents, again
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
		  
		  
		  //send email 
		  var githublink = 'https://github.com/';
		  console.log('and the email', the_user.emails[0].value);
   		  var mailOptions = {
		    from: 'Fred Foo ✔ <foo@blurdybloop.com>', // sender address
		    to: the_user.emails[0].value, // list of receivers
		    subject: 'You funded a bounty!', // Subject line
		    text: 'bounty', // plaintext body
		    html: '<b>If you would like to see this bounty click here <a href=' + githublink + split[1] + '/' + split[2] + '/' + split[3] + '/' + split[4] + '>Bounty</a></b>' // html body
		};
	   						// send mail with defined transport object
	   					transporter.sendMail(mailOptions, function(error, info){
	   						    if(error){
	   						        console.log(error);
									}
								});

		  
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
	   if (err) {
		   
		   console.log('Error on save!');
	   }
	   
		//add the fund to history
	   var newHistory = new PHistory;
	   newHistory.userID = the_user.id;
	   newHistory.amount = charge.amount;
	   newHistory.claimedorfunded = 'funded';
	   newHistory.issueLink = 'https://github.com/' + owner + '/' + repo + '/' + 'issues/' + issue_id;
       newHistory.time = new Date();
	   

	   //7 save it to the DB
		   newHistory.save(function (err) {
if (err) {
   console.log ('Error on save!');
}
   });
});
			}
			
			
			//8 if the bounty does currently exist
			else {
				
				//9 get its amount
				local_amt = the_result.amount;
				//10 sum it with current amount
				sum_amt_pre_conv = +local_amt + +charge.amount;
				sum_amt = sum_amt_pre_conv.toString(); 
				


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
						
						//add the claim to history
		 			   var newHistory = new PHistory;
		 			   newHistory.userID = the_user.id;
		 			   newHistory.amount = charge.amount;
					   newHistory.claimedorfunded = 'funded';
					   newHistory.issueLink = 'https://github.com/' + owner + '/' + repo + '/' + 'issues/' + issue_id;
				       newHistory.time = new Date();
					   

		 			   //7 save it to the DB
		 	   		   newHistory.save(function (err) {
		 	     if (err) {
				   console.log ('Error on save!');
			   }
		   });
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
	  console.log('hahaha2');
  });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
	  
	  
	  console.log('authenticate came first');
	  
	  console.log('after attempting to login with github')
     if(!return_to_reject_after_login && !return_to_claim_after_login && !return_to_payment_after_login) {		 
		 
		 
	     var query = PUser.find({'userID': req.user.id});
	      query.exec(function(err, result) {
	        if (!err) {
				if(result[0])
				{
					
				
  				  //if he has an email, just go to account
				if(result[0].email)
	 			{
	   			 console.log('email has a value ',result[0].email );
		
	 			 res.redirect('/account');
	 			}
	 	   	 else 
			 {
				 //if he doesn't have an email, go to account
	     	  console.log('email has no value ',result[0].email );
		
	 		  res.redirect('/inputemail');
	 		  } 
			  
		 	 }
		  else {
			  
			  //user not in DB
			  
			  console.log('the user data', req.user);
			  //create and save new user
			  
			  //if the user has an email on github, use it and save
			  if(req.user.email) {
			  	
			  
	        		   var newUser = new PUser ({
	        		         userID: req.user.id,
	        		       username: req.user.username,
	        		   	displayname: req.user.displayname,
	        		    	  email: req.user.email
	        		   });
	        		   newUser.save(function (err) {
	        if (err) console.log ('Error on save!')});
	     	    }
				else {
					
					//the user has no email on github so redirect them to 
				 res.redirect('/inputemail');
				
				}
				
			}
			
		  	
			
		  }
			
		
			
		});
		
	}
		 
		 
		 
		 
		 
		

	 
	  
	  if(return_to_payment_after_login === true) {
	      res.redirect('/payment');
		  return_to_payment_after_login = false;
	  	
	  }
	  if(return_to_claim_after_login === true) {
		  
	    	      res.redirect('/claim');
	    		  return_to_claim_after_login = false;
	    	  }

	  if(return_to_reject_after_login === true) {
		  
	    	      res.redirect('/rejectbounty');
	    		  return_to_reject_after_login = false;
	    	  }

  });


app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/account');
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
