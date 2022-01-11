const express = require('express')
var bodyParser = require('body-parser')
const path = require('path');

const app = express()
const PORT = process.env.PORT || 3000

// set the view engine to ejs
app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, '/views'));

app.use(express.static('dist'))
app.use(bodyParser.json()) // parse application/json

// index page
app.get('/', function(req, res) {
  res.render('pages/index');
});

// post("/api/team/get/" + a)
app.post('/api/team/get/:teamId', (req, res) => {
  res.send({
    teamId: req.params.teamId
  })
})

// post("/api/coach/teams/" + this.coachName)
app.post('/api/coach/teams/:coachName', (req, res) => {
  res.send({
    coachName: req.params.coachName
  })
})

// post("/api/gamefinder/teams")
app.post('/api/gamefinder/teams', (req, res) => {
  res.send({
    foo: 'bar'
  })
})

// post("/api/gamefinder/getoffers")
app.post('/api/gamefinder/getoffers', (req, res) => {
  res.send({
    foo: 'bar'
  })
})

// post("/api/gamefinder/activate")
app.post('/api/gamefinder/activate', (req, res) => {
  res.send({
    foo: 'bar'
  })
})

// post("/api/gamefinder/coachteams")
app.post('/api/gamefinder/coachteams', (req, res) => {
  res.send({
    foo: 'bar'
  })
})

// post("/api/gamefinder/offer/" + e + "/" + t)
app.post('/api/gamefinder/offer/:myTeamId/:opponentTeamId', (req, res) => {
  res.send({
    myTeamId: req.params.myTeamId,
    opponentTeamId: req.params.opponentTeamId
  })
})

// post("/api/gamefinder/addteam/" + r)
app.post('/api/gamefinder/addteam/:teamId', (req, res) => {
  res.send({
    teamId: req.params.teamId
  })
})

// post("/api/gamefinder/removeteam/" + r)
app.post('/api/gamefinder/removeteam/:teamId', (req, res) => {
  res.send({
    teamId: req.params.teamId
  })
})

// post("/api/gamefinder/addallteams")
app.post('/api/gamefinder/addallteams', (req, res) => {
  res.send({
    foo: 'bar'
  })
})

// post("/api/gamefinder/removeallteams")
app.post('/api/gamefinder/removeallteams', (req, res) => {
  res.send({
    foo: 'bar'
  })
})

app.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`)
})