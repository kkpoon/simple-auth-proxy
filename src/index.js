import express from "express";
import passport from "passport";
import morgan from "morgan";
import { BasicStrategy } from "passport-http";
import { Strategy as TokenStrategy } from "passport-accesstoken";
import httpProxy from "http-proxy";

passport.use(new BasicStrategy((userid, password, done) => {
  setTimeout(() => { // TODO make use of your account store, e.g. database
    let err = false;
    let user = userid === "demo" && password === "demo#1" ? {id: "demo"} : false;
    if (err) { return done(err); }
    if (!user) { return done(null, false); }
    return done(null, user);
  }, 500);
}));

passport.use(new TokenStrategy({
  tokenHeader: 'x-auth-token',
  tokenField: 'auth-token'
}, (token, done) => {
  setTimeout(() => { // TODO make use of your token store, e.g. redis
    let err = false;
    let user = token === "hehehaha" ? {id: "demo"} : false;
    if (err) { return done(err); }
    if (!user) { return done(null, false); }
    return done(null, user);
  }, 500);
}));

const basicAuth = passport.authenticate('basic', {session: false});
const tokenAuth = passport.authenticate('token', {session: false});

const proxy = httpProxy.createProxyServer({});

const app = express();

app.use(morgan('combined'));

app.post("/auth", basicAuth, (req, res) => {
  res.json({"access_token": "hehehaha"});
});

module.exports = function(target) {
  if (!target) {
    target = "http://localhost:8080";
    const dummy = express();
    dummy.use(morgan("tiny"));
    dummy.use(require("body-parser").raw({type: "*/*"}));
    dummy.use((req, res) => {
      console.log(req.body);
      res.send(req.body);
    });
    const dummyServer = dummy.listen(8080, function() {
      console.log('listening on port ' + dummyServer.address().port +
        " (dummy echo body)");
    });
  }

  app.use("/", tokenAuth, (req, res) => {
    proxy.web(req, res, {target: target}, (err) => {
      if (err && err.code === "ECONNREFUSED") {
        res.sendStatus(502);
      }
    });
  });
  return app;
};
