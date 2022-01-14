class Database {
  coaches;

  teams;

  offers;
 
  constructor() {
    this.coaches = []
    this.teams = []
    this.offers = []
  }

  addCoach(coachName) {
    for (const coach of this.coaches) {
      if (coach.name === coachName) {
        return
      }
    }

    this.coaches.push(
      {
        id: this.getRandomId(),
        name: coachName,
        ranking: 'Legend',
      }
    )

    this.teams.push(this.createRandomTeam(coachName))
    this.teams.push(this.createRandomTeam(coachName))
    this.teams.push(this.createRandomTeam(coachName))
  }

  getRandomInteger(max) {
    return Math.floor(Math.random() * max)
  }
  
  getRandomId() {
    return this.getRandomInteger(1000000)
  }

  createRandomTeam(coachName) {
    const id = this.getRandomId()
    return {
      id: id,
      coach: coachName,
      name: 'Team' + id,
      isLfg: 'Yes',
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
      },
      players: [
        {
          injuries: '-MA,-ST',
          position: 'Lineman',
          skills: ['Block', 'Dodge']
        }
      ],
      rerolls: 3,
      fanFactor: 4,
      treasury: 150000,
      roster: {
        name: 'Tomb King'
      },
    }
  }

  getTeamsForChooseTeams(coachName) {
    const teams = []
    for (const team of this.teams) {
      if (team.coach === coachName) {
        teams.push(team)
      }
    }
    return teams
  }

  addTeam(teamId) {
    for (const team of this.teams) {
      if (team.id === teamId) {
        team.isLfg = 'Yes'
      }
    }
  }

  removeTeam(teamId) {
    for (const team of this.teams) {
      if (team.id === teamId) {
        team.isLfg = 'No'
      }
    }
  }

  setAllTeamsForCoachIsLfg(coachName, isLfg) {
    for (const team of this.teams) {
      if (team.coach === coachName) {
        team.isLfg = isLfg ? 'Yes' : 'No'
      }
    }
  }

  getTeamsIsLfg(coachName) {
    const teams = []

    for (const team of this.teams) {
      if (team.coach === coachName && team.isLfg === 'Yes') {
        teams.push(team)
      }
    }

    return teams
  }

  getCoach(coachName) {
    for (const coach of this.coaches) {
      if (coach.name === coachName) {
        return coach
      }
    }
    throw new Error('Coach not found')
  }

  getTeam(teamId) {
    for (const team of this.teams) {
      if (team.id === teamId) {
        return team
      }
    }
    throw new Error('Team not found')
  }

  getOpponents() {
    const opponents = new Map()

    for (const team of this.teams) {
      const coach = this.getCoach(team.coach)
      if (! opponents.has(team.coach)) {
        opponents.set(coach.name, {id: coach.id, name: coach.name, ranking: coach.ranking, teams: []})
      }

      if (team.isLfg === 'Yes') {
        opponents.get(coach.name).teams.push(team)
      }
    }

    return Array.from(opponents.values())
  }

  createOffer(myTeamId, opponentTeamId) {
    const offerLifetime = 30000

    const myTeam = this.getTeam(myTeamId)
    const opponentTeam = this.getTeam(opponentTeamId)

    const offerData = {
      id: this.getRandomId(),
      created: Date.now(),
      timeRemaining: offerLifetime,
      lifetime: offerLifetime,
      team1: {
        id: myTeam.id,
        name: myTeam.name,
        teamValue: myTeam.teamValue,
        race: {
          name: myTeam.race
        },
        coach: {
          name: myTeam.coach
        }
      },
      team2: {
        id: opponentTeam.id,
        name: opponentTeam.name,
        teamValue: opponentTeam.teamValue,
        race: {
          name: opponentTeam.race
        },
        coach: {
          name: opponentTeam.coach
        }
      }
    }
    this.offers.push(offerData)
  }

  getOffers() {
    const unexpiredOffers = []

    for (const offer of this.offers) {
      const timeRemaining = (offer.created + offer.lifetime) - Date.now()
      offer.timeRemaining = timeRemaining
      if (timeRemaining > 0) {
        unexpiredOffers.push(offer)
      }
    }

    return unexpiredOffers
  }
}

module.exports = Database