// plugin is here
var express = require('express');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var passport = require('passport');
var localStrategy = require('passport-local');
var fileUpload = require('express-fileupload');
// models
var Post = require('./model/post');
var Comment = require('./model/comment');
var User = require('./model/user');
// app comfig
app.use(fileUpload());
app.set('view engine', 'ejs');
app.use(
	bodyParser.urlencoded({
		extended: true
	})
);
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
// conntect mongodb
mongoose.connect('mongodb://127.0.0.1:27017/blog', {
	useNewUrlParser: true
});
// passport config

app.use(
	require('express-session')({
		secret: 'sid is best',
		resave: false,
		saveUninitialized: false
	})
);

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
passport.use(new localStrategy(User.authenticate()));
app.use(function (req, res, next) {
	res.locals.currentUser = req.user;
	next();
});
app.get('/', function (req, res) {
	Post.find({}, function (err, data) {
		if (err) {
			console.log(err);
		} else {
			res.render('home', {
				blog: data
			});
		}
	});
});

app.get('/new', isLogged, function (req, res) {
	res.render('new');
});
app.post('/new', isLogged, function (req, res) {
	var newData = {
		title: req.body.title,
		img: req.files.img.name,
		disc: req.body.disc
	};
	req.files.img.mv("./public/img/" + req.files.img.name, function (err) {
		if (err) {
			console.log(err);
		}
	});
	Post.create(newData, function (err, post) {
		post.author.id = req.user._id;
		post.author.username = req.user.username;
		post.save();
		if (err) {
			console.log(err);
		} else {
			res.redirect('/');
		}
	});
});
// show
app.get('/post/:id', function (req, res) {
	Post.findById(req.params.id).populate('comments').exec(function (err, post) {
		if (err) {
			console.log(err);
		} else {
			res.render('show', {
				post: post
			});
		}
	});
});
// edit
app.get('/post/:id/edit', postOwnership, function (req, res) {
	Post.findById(req.params.id, function (err, findpost) {
		if (err) {
			console.log(err);
		} else {
			res.render('edit', {
				post: findpost
			});
		}
	});
});

app.put('/post/:id', postOwnership, function (req, res) {
	Post.findByIdAndUpdate(req.params.id, req.body.post, function (err, post) {
		if (err) {
			console.log(err);
		} else {
			res.redirect('/post/' + req.params.id);
		}
	});
});
// delete
app.delete('/post/:id', postOwnership, function (req, res) {
	Post.findByIdAndRemove(req.params.id, function (err) {
		if (err) {
			console.log(err);
		} else {
			res.redirect('/');
		}
	});
});
// comment
//comment add
app.get('/post/:id/comment/new', isLogged, function (req, res) {
	Post.findById(req.params.id, function (err, post) {
		if (err) {
			console.log(err);
		} else {
			res.render('commentform', {
				post: post
			});
		}
	});
});

app.post('/post/:id/comment', isLogged, function (req, res) {
	Post.findById(req.params.id, function (err, post) {
		if (err) {
			console.log(err);
		} else {
			Comment.create(req.body.comment, function (err, comment) {
				if (err) {
					console.log(err);
				} else {
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					comment.save();
					post.comments.push(comment);
					post.save();
					res.redirect('/post/' + post._id);
				}
			});
		}
	});
});
//comment edit
app.get('/post/:id/comment/:comment_id/edit', commentOnwership, function (req, res) {
	Comment.findById(req.params.comment_id, function (err, comment) {
		if (err) {
			console.log(err);
		} else {
			res.render('commentedit', {
				comment: comment,
				post_id: req.params.id
			});
		}
	});
});

app.put('/post/:id/comment/:comment_id', commentOnwership, function (req, res) {
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, comment) {
		if (err) {
			console.log(err);
		} else {
			res.redirect('/post/' + req.params.id);
		}
	});
});

//delete
app.delete('/post/:id/comment/:comment_id', commentOnwership, function (req, res) {
	Comment.findByIdAndRemove(req.params.comment_id, function (err) {
		if (err) {
			console.log(err);
		} else {
			res.redirect('/post/' + req.params.id);
		}
	});
});
// aouth route
app.get('/register', function (req, res) {
	res.render('register');
});
app.get('/login', function (req, res) {
	res.render('login');
});

app.post('/register', function (req, res) {
	var newUser = new User({
		username: req.body.username
	});
	User.register(newUser, req.body.password, function (err, user) {
		if (err) {
			console.log(err);
		} else {
			passport.authenticate('local')(req, res, function () {
				res.redirect('/');
			});
		}
	});
});
app.post(
	'/login',
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/login'
	}),
	function (req, res) {}
);

// logout

app.get('/logout', function (req, res) {
	req.logout();
	res.redirect('/');
});

function isLogged(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	} else {
		res.redirect('/login');
	}
}

function postOwnership(req, res, next) {
	if (req.isAuthenticated()) {
		Post.findById(req.params.id, function (err, post) {
			if (err) {
				console.log(err);
			} else {
				if (post.author.id.equals(req.user._id)) {
					next();
				} else {
					res.redirect('back');
				}
			}
		});
	} else {
		res.redirect('back');
	}
}

function commentOnwership(req, res, next) {
	if (req.isAuthenticated()) {
		Comment.findById(req.params.comment_id, function (err, comment) {
			if (err) {
				console.log(err);
			} else {
				console.log(comment);
				if (comment.author.id.equals(req.user._id)) {
					next();
				} else {
					res.redirect('back');
				}
			}
		});
	} else {
		res.redirect('back');
	}
}
// listen
var ip = process.env.ip || '127.0.0.1';
var port = process.env.port || '3000';

app.listen(port, ip, function () {
	console.log('blog app is started...');
});