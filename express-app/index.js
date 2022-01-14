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
app.get('/gamefinder/~:coachName', function(req, res) {
  const coachName = req.params.coachName
  // pass coachName to view so it can be used by Vue app
  res.render('pages/index', {coachName: coachName});
});


// HELPERS
function getRandomInteger(max) {
  return Math.floor(Math.random() * max)
}

function getRandomId() {
  return getRandomInteger(1000000)
}

// DATA
const offers = []



// used to display an opponents team data when you hover over it
app.post('/api/team/get/:teamId', (req, res) => {
  res.send({
    name: 'Team100',
    teamValue: 3000000,
    rerolls: 3,
    fanFactor: 4,
    treasury: 150000,
    roster: {
      name: 'Tomb King'
    },
    players: [
      {
        injuries: '-MA,-ST',
        position: 'Lineman',
        skills: ['Block', 'Dodge']
      }
    ]
  })
})

// this is used to set up the check box list of teams "Choose teams" link
app.post('/api/coach/teams/:coachName', (req, res) => {
  res.send({
    teams: [
      {
        id: 1,
        coach: req.params.coachName,
        name: 'Team1',
        canLfg: 'Yes',
        status: 'Active',
        teamValue: 1230000,
        race: 'Tomb Kings',
        raceLogos: [
          {
            size: 32,
            logo: 486296
          },
        ],
        league: {
          valid: false
        }
      },
      {
        id: 2,
        coach: req.params.coachName,
        name: 'Team2',
        canLfg: 'Yes',
        status: 'Active',
        teamValue: 1830000,
        race: 'Tomb Kings',
        raceLogos: [
          {
            size: 32,
            logo: 486296
          },
        ],
        league: {
          valid: false
        }
      }
    ]
  })
})

// used to get the teams available as opponents
app.post('/api/gamefinder/teams', (req, res) => {
  res.send([
    {
      name: 'bobbo',
      ranking: 'Legend',
      teams: [{
        id: 1,
        coach: 'bobbo',
        name: 'Team100',
        canLfg: 'Yes',
        status: 'Active',
        teamValue: 2000000,
        race: 'Tomb Kings',
        raceLogos: [
          {
            size: 32,
            logo: 486296
          },
        ],
        league: {
          valid: false
        }
      }]
    }
  ])
})

// used by getOffers to show all the offers
app.post('/api/gamefinder/getoffers', (req, res) => {

  const unexpiredOffers = []

  for (const offer of offers) {
    timeRemaining = (offer.created + offer.lifetime) - Date.now()
    offer.timeRemaining = timeRemaining
    if (timeRemaining > 0) {
      unexpiredOffers.push(offer)
    }
  }

  res.send(unexpiredOffers)
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

// post("/api/gamefinder/activate")
app.post('/api/gamefinder/activate', (req, res) => {
  res.send({
    foo: 'bar'
  })
})

// returns my teams activated for search
app.post('/api/gamefinder/coachteams', (req, res) => {
  res.send({
    teams: [
      {
        id: 1,
        coach: 'HimalayaP1C7',
        name: 'Team1',
        canLfg: 'Yes',
        status: 'Active',
        teamValue: 1230000,
        race: 'Tomb Kings',
        raceLogos: [
          {
            size: 32,
            logo: 486296
          },
        ],
        league: {
          valid: false
        }
      },
      {
        id: 2,
        coach: 'HimalayaP1C7',
        name: 'Team2',
        canLfg: 'Yes',
        status: 'Active',
        teamValue: 1830000,
        race: 'Tomb Kings',
        raceLogos: [
          {
            size: 32,
            logo: 486296
          },
        ],
        league: {
          valid: false
        }
      }
    ]
  })
})

// post("/api/gamefinder/offer/" + e + "/" + t)
app.post('/api/gamefinder/offer/:myTeamId/:opponentTeamId', (req, res) => {

  const offerLifetime = 5000

  const offerData = {
    id: getRandomId(),
    created: Date.now(),
    timeRemaining: offerLifetime,
    lifetime: offerLifetime,
    team1: {
      id: req.params.myTeamId,
      name: 'Offer team 1',
      teamValue: 1000000,
      race: {
        name: 'Orcs'
      },
      coach: {
        name: 'HimalayP1C7'
      }
    },
    team2: {
      id: req.params.opponentTeamId,
      name: 'Offer team 2',
      teamValue: 1100000,
      race: {
        name: 'Goblins'
      },
      coach: {
        name: 'bobbo'
      }
    }
  }
  offers.push(offerData)

  res.send(true)
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