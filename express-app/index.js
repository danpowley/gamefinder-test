const express = require('express')
var bodyParser = require('body-parser')
const path = require('path');

const Database = require('./Database')
const RandomData = require('./RandomData')
const randomData = new RandomData()
const db = new Database(randomData)

const app = express()
const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, '/views'));

app.use(express.static('dist'))
app.use(bodyParser.json())

const enableRandomEvents = true;
if (enableRandomEvents) {
  // add at least 1 coach
  db.addCoach('Rando' + randomData.getId());
  setInterval(function () {
    // new coach
    db.addCoach('Rando' + randomData.getId());
  }, 5000);

  setInterval(function () {
    // new offers
    db.createRandomOffer();
  }, 2000);
}

// index page
app.get('/gamefinder/~:coachName', function(req, res) {
  const coachName = req.params.coachName
  // pass coachName to view so it can be used by Vue app
  res.render('pages/index', {coachName: coachName});
});

// used to display an opponents team data when you hover over it
app.post('/api/team/get/:teamId', (req, res) => {
  const team = db.getTeam(~~req.params.teamId)
  res.send(team)
})

// this is used to set up the check box list of teams "Choose teams" link
app.post('/api/coach/teams/:coachName', (req, res) => {
  const teams = db.getTeamsForChooseTeams(req.params.coachName)
  res.send({teams: teams})
})

// used to get the teams available as opponents
app.post('/api/gamefinder/teams', (req, res) => {
  const opponents = db.getOpponents()
  res.send(opponents)
})

// used by getOffers to show all the offers
app.post('/api/gamefinder/getoffers', (req, res) => {
  const coachName = req.body.cheatingCoachName
  const offers = db.getOffers(coachName)
  res.send(offers)
})

// used by cancelOffer to remove an offer from the offers array
app.post('/api/gamefinder/canceloffer/:offerId', (req, res) => {
  const offerId = ~~req.params.offerId
  let index = offers.findIndex((o) => o.id === offerId);
  if (index !== -1) {
      offers.splice(index, 1);
  }

  res.send(true)
})

app.post('/api/gamefinder/addcheatingcoach', (req, res) => {
  const coachName = req.body.cheatingCoachName
  db.addCoach(coachName)
  res.send(true)
})

// not much for us to do here, presumably this marks the coach themselves as LFG
app.post('/api/gamefinder/activate', (req, res) => {
  res.send(true)
})

// returns my teams activated for search
app.post('/api/gamefinder/coachteams', (req, res) => {
  const coachName = req.body.cheatingCoachName
  const teams = db.getTeamsIsLfg(coachName)
  res.send({teams: teams})
})

// post("/api/gamefinder/offer/" + e + "/" + t)
app.post('/api/gamefinder/offer/:myTeamId/:opponentTeamId', (req, res) => {
  db.createOffer(~~req.params.myTeamId, ~~req.params.opponentTeamId)
  res.send(true)
})

// used to mark a team as isLfg=Yes
app.post('/api/gamefinder/addteam/:teamId', (req, res) => {
  db.addTeam(~~req.params.teamId)
  res.send(true)
})

// used to mark a team as isLfg=No
app.post('/api/gamefinder/removeteam/:teamId', (req, res) => {
  db.removeTeam(~~req.params.teamId)
  res.send(true)
})

// set all teams for coach isLfg=Yes
app.post('/api/gamefinder/addallteams', (req, res) => {
  const coachName = req.body.cheatingCoachName
  db.setAllTeamsForCoachIsLfg(coachName, true)
  res.send(true)
})

// set all teams for coach isLfg=No
app.post('/api/gamefinder/removeallteams', (req, res) => {
  const coachName = req.body.cheatingCoachName
  db.setAllTeamsForCoachIsLfg(coachName, false)
  res.send(true)
})

app.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`)
})