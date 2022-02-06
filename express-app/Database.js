class Database {
  randomData;

  coaches;

  teams;

  offers;
 
  constructor(randomData) {
    this.randomData = randomData
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
        id: this.randomData.getId(),
        name: coachName,
        ranking: this.randomData.getCoachLevel(),
      }
    )

    const robotPirateLeague = {
      id: 1,
      name: 'Robot Pirate League',
      valid: true,
      ruleset: {id: 1, options: {'rulesetOptions.crossLeagueMatches': false}},
    }
    const chaoticWizardLeague = {
      id: 2,
      name: 'Chaotic Wizard League',
      valid: true,
      ruleset: {id: 1, options: {'rulesetOptions.crossLeagueMatches': false}},
    }

    // order is deliberately random to show that the app is doing the ordering by division and league
    this.teams.push(this.randomData.getLeagueTeam(coachName, robotPirateLeague))
    this.teams.push(this.randomData.getTeam(coachName))
    this.teams.push(this.randomData.getTeam(coachName))
    this.teams.push(this.randomData.getLeagueDivisionTeam(coachName))
    this.teams.push(this.randomData.getTeam(coachName))
    this.teams.push(this.randomData.getLeagueTeam(coachName, chaoticWizardLeague))
    this.teams.push(this.randomData.getTeam(coachName))
    this.teams.push(this.randomData.getLeagueDivisionTeam(coachName))
    this.teams.push(this.randomData.getLeagueTeam(coachName, chaoticWizardLeague))
    this.teams.push(this.randomData.getTeam(coachName))
    this.teams.push(this.randomData.getLeagueTeam(coachName, robotPirateLeague))
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

  createRandomOffer() {
    const lfgTeams = this.teams.filter((team) => team.isLfg === 'Yes');
    const teamId1 = (lfgTeams[Math.floor(Math.random() * lfgTeams.length)]).id
    const teamId2 = (lfgTeams[Math.floor(Math.random() * lfgTeams.length)]).id
    if (teamId1 !== teamId2) {
      this.createOffer(teamId1, teamId2)
    }
  }

  createOffer(myTeamId, opponentTeamId) {
    const offerLifetime = 30000

    const myTeam = this.getTeam(myTeamId)
    const opponentTeam = this.getTeam(opponentTeamId)

    const offerData = {
      id: this.randomData.getId(),
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

  getOffers(coachName) {
    const unexpiredOffers = []

    for (const offer of this.offers) {
      const timeRemaining = (offer.created + offer.lifetime) - Date.now()
      offer.timeRemaining = timeRemaining

      const offerBelongsToCoach = offer.team1.coach.name === coachName || offer.team2.coach.name === coachName
      if (offerBelongsToCoach && timeRemaining > 0) {
        unexpiredOffers.push(offer)
      }

    }

    return unexpiredOffers
  }
}

module.exports = Database